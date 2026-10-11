---
title: "Half-price inference with the batch API"
description: "Upload a JSONL file, create a batch, and collect results at the 50% batch discount shown in the pricing feed."
date: 2026-10-11
authors: [DiCompute team]
tags: [batch, cost-control, api]
categories: [engineering]
cover: /blog-assets/blog/half-price-inference-with-the-batch-api/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Batch APIs at a discount became a standard cost pattern for LLM workloads in
2026. If a job doesn't need an answer right now, such as labelling a backlog
of records, summarizing an archive or re-running a prompt over a dataset, you
can hand DiCompute a file of requests and collect the results later at the
batch discount. This post walks through the whole loop: write the file,
upload it, create the batch, poll it, and download the output.

Some honest limits. There is no completion-time guarantee: the batch route
does not read or honor a `completion_window` field, and nothing here promises
when a job will finish. The models are small open models, and
`qwen2.5-3b-instruct`, the one accepting on the direct engine, has a
1,024-token window, so each line must be short. I ran every call below with an
invalid key, and the first call returned the expected `401`. I could not run
the later steps end to end without a funded key, so try a two-line file before
you trust a big one.

## When latency doesn't matter: offline jobs

Batch fits work that is already a list. Classification, tagging, extraction
and summarization backfills are typical. Each line in the file becomes its own
chat-completions request, with its own reservation and settlement. The
upload and the batch both return quickly, because the batch runs in the
background and you poll for it.

## The 50% discount, from the pricing feed

The discount is not a number to copy from a blog post. Read it from the live
pricing feed:

```bash
curl -sS https://dicompute.ai/openai/v1/pricing | jq '{batch_discount_percent, min_charge_uusd}'
```

On 2026-10-11 that returned `batch_discount_percent: 50` and
`min_charge_uusd: 100`. According to the batches entry in the
[API reference](/api-console), lines on `/openai/v1/chat/completions` are
billed at the discount this feed publishes, automatically. There is no
header or field to opt in. The discount applies to the per-model rates on
[/pricing](/pricing), which doesn't list the discount itself. The feed is
the source, and the value can change.

Two things to keep in mind when you estimate savings. The
[estimate endpoint](/docs/billing) prices the synchronous lane only and never
reflects the batch discount. And every request, batch lines included, has a
minimum charge of $0.0001 (100 µUSD). For very short lines on a cheap model
the floor can be most of the cost, so half-price is a rule for real
workloads, not a promise for each tiny line.

## Preparing a JSONL input file

JSONL means one JSON object per line. Each line is one request, and each
line's `url` field must match the batch's endpoint, which for chat is
`/openai/v1/chat/completions`. That `url` rule is all the API reference says
about a line. It doesn't print a sample line, so the lines below follow the
OpenAI batch format (`custom_id`, `method`, `url`, `body`). Treat that shape
as an assumption, and check it with a two-line file:

```json
{"custom_id":"review-0","method":"POST","url":"/openai/v1/chat/completions","body":{"model":"qwen2.5-3b-instruct","max_tokens":16,"messages":[{"role":"user","content":"Label as positive or negative: Great product, arrived fast."}]}}
{"custom_id":"review-1","method":"POST","url":"/openai/v1/chat/completions","body":{"model":"qwen2.5-3b-instruct","max_tokens":16,"messages":[{"role":"user","content":"Label as positive or negative: Broke after two days."}]}}
```

Keep `max_tokens` small and each prompt well inside the model's window. The
file can be up to 100 MiB. A line that doesn't parse as JSON fails with
`status_code: 400` and `invalid JSONL line`, and is never billed.

## Uploading to /openai/v1/files and creating a batch

Both calls need an API key, and a browser session is refused. One detail
differs from OpenAI. The upload takes the raw JSONL bytes as the request body,
**not** `multipart/form-data`, so the OpenAI SDK's `client.files.create(...)`
won't work unmodified. Use plain HTTP:

```python
import os
import requests

BASE = "https://dicompute.ai/openai/v1"
HEADERS = {"authorization": f"Bearer {os.environ['DICO_KEY']}"}

with open("input.jsonl", "rb") as f:
    up = requests.post(f"{BASE}/files", headers=HEADERS, data=f.read(), timeout=60)
up.raise_for_status()
file_id = up.json()["id"]

b = requests.post(f"{BASE}/batches", headers=HEADERS,
                  json={"input_file_id": file_id}, timeout=30)
b.raise_for_status()
batch = b.json()
print(batch["id"], batch["status"])
```

`endpoint` is optional and defaults to `/openai/v1/chat/completions`. The
batch comes back as soon as it is queued, with `status: "in_progress"` and
fields such as `total_lines`, `processed_lines`, `succeeded_lines`,
`failed_lines`, `reserved_uusd` and `settled_uusd`.

## Polling, cancelling and downloading results

Poll `GET /openai/v1/batches/{id}`. Add `?wait=<seconds>` for a bounded long
poll: the server holds the call open until the status changes or the wait
elapses, which the docs clamp to 30 seconds by default. That means far fewer
requests than polling on a timer.

```python
while batch["status"] not in ("completed", "failed", "cancelled"):
    r = requests.get(f"{BASE}/batches/{batch['id']}", headers=HEADERS,
                     params={"wait": 20}, timeout=60)
    r.raise_for_status()
    batch = r.json()
    print(batch["status"], batch["processed_lines"], "/", batch["total_lines"])

if batch["output_file_id"]:
    out = requests.get(f"{BASE}/files/{batch['output_file_id']}/content",
                       headers=HEADERS, timeout=60)
    out.raise_for_status()
    print(out.text)
```

The statuses are `validating`, `in_progress`, `completed`, `failed`,
`cancelling` and `cancelled`. The output file is JSONL with one line per input
line, in the order the batch accepted them. Check `failed_lines` before you
trust the file: individual lines can fail while the batch itself completes.

To cancel, `POST /openai/v1/batches/{id}/cancel`. An in-progress batch becomes
`cancelling` and stops at its next line boundary. Lines already dispatched
aren't rolled back, and lines never fetched are never billed. A batch in a
terminal state returns `400 batch_already_terminal`. The console has a
no-code version of this loop at `/batches`, and `/files` lists your files.

## File retention and privacy

This lane stores your content on purpose. Read [Storing files](/docs/files)
before you upload anything sensitive:

- Files are removed automatically 30 days after upload by default, unless you
  pin them. Deleting a file moves it to a trash tier for up to 7 days, and
  `DELETE /openai/v1/files/{id}?permanent=1` removes the bytes immediately.
- The batch processor reads your input as plaintext to run it, and there is
  no sealed variant of the upload. The sealed lane is switched off, and even
  when it is on it does not hide prompts from the operator. Don't put
  anything in a batch file that you aren't willing to let the operator read,
  and no regulated data.
- Deleting a file never changes a batch that already used it.

## When to use the synchronous API instead

- **You need the answer now.** A user is waiting, so use the normal call and
  stream it.
- **You have a handful of requests.** The upload, create and poll steps cost
  more effort than they save. The discount matters at volume.
- **Each step depends on the last.** A batch runs independent lines, so a
  chain or an agent loop belongs on the live route.
- **You need a deadline.** With no completion-window guarantee, don't hang an
  SLA on a batch.
- **You need embeddings.** The batch route accepts the embeddings endpoint,
  but no catalogue model serves embeddings today, and the batch discount is
  not applied to embeddings lines in any case.

## Next steps

- [Files](/docs/files): sizes, retention, pinning and deletion.
- [Billing](/docs/billing): reserve, settle and the minimum charge.
- [Pricing](/pricing): the per-model rates the discount applies to.
- [API reference](/api-console): the files and batches routes.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, base URL and errors.
