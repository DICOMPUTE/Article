// Vendored front-matter parser. The code below is a byte-for-byte copy of
// the parser dicompute.ai itself reads posts through (lines 30-176 of that
// file at DiCompute commit 845359b8e544); only this header differs. It is a
// deliberately small dialect, NOT YAML:
//
//   ---
//   title: "Quoted or bare string"
//   date: 2026-09-02                   # date  -> "YYYY-MM-DD", must be a real day
//   draft: false                       # boolean
//   tags: [postgres, ledger]           # string[] -- inline list, or:
//   authors:
//     - DiCompute team                 #           block list
//   ---
//   body...
//
// Every key the schema does not name is an ERROR. If this copy and the
// server's ever drift, the server wins: the production sync re-validates
// every commit with its own copy and keeps serving the last good snapshot
// when it disagrees (see README.md, "What happens after merge").

export type FieldType = "string" | "date" | "boolean" | "string[]";
export type FieldSpec = { type: FieldType; required?: boolean };
export type Schema = Record<string, FieldSpec>;

export class FrontMatterError extends Error {
  constructor(
    public readonly file: string,
    public readonly line: number | undefined,
    detail: string,
  ) {
    super(`${file}${line === undefined ? "" : `:${line}`}: ${detail}`);
    this.name = "FrontMatterError";
  }
}

/** One raw key -> the value's text, or the list items' texts. `line` is the
 *  1-based line of the key, for error messages. */
type RawField = { value: string | string[]; line: number };

export type Parsed<T> = { data: T; body: string };

const FENCE = /^---\s*$/;
const KEY_LINE = /^([A-Za-z][A-Za-z0-9_]*):(?:\s+(.*))?$/;
const LIST_ITEM = /^\s+-\s+(.*)$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Splits `source` into its raw front-matter fields and the body after the
 *  closing fence. A document with no opening fence on line 1 has no front
 *  matter at all -- that is an error for a collection file (every post needs
 *  a title and a date), reported as such rather than treated as a body. */
export function splitFrontMatter(source: string, file: string): { fields: Map<string, RawField>; body: string } {
  const lines = source.split(/\r?\n/);
  if (!FENCE.test(lines[0] ?? "")) {
    throw new FrontMatterError(file, 1, "expected a front-matter block opening with `---` on line 1");
  }
  const fields = new Map<string, RawField>();
  let i = 1;
  let current: { key: string; field: RawField } | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNo = i + 1;
    if (FENCE.test(line)) break;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const item = LIST_ITEM.exec(line);
    if (item) {
      if (!current || !Array.isArray(current.field.value)) {
        throw new FrontMatterError(file, lineNo, "a `- item` line must follow a `key:` line with no inline value");
      }
      current.field.value.push(unquote(item[1]!.trim()));
      continue;
    }
    const kv = KEY_LINE.exec(line);
    if (!kv) throw new FrontMatterError(file, lineNo, `cannot parse \`${line.trim()}\` -- expected \`key: value\``);
    const key = kv[1]!;
    if (fields.has(key)) throw new FrontMatterError(file, lineNo, `duplicate key \`${key}\``);
    const rawValue = (kv[2] ?? "").trim();
    let value: string | string[];
    if (rawValue === "") value = []; // block list follows (or an empty list)
    else if (rawValue.startsWith("[")) {
      if (!rawValue.endsWith("]")) throw new FrontMatterError(file, lineNo, `unterminated inline list for \`${key}\``);
      const inner = rawValue.slice(1, -1).trim();
      value = inner === "" ? [] : inner.split(",").map((s) => unquote(s.trim()));
    } else value = unquote(rawValue);
    const field: RawField = { value, line: lineNo };
    fields.set(key, field);
    current = { key, field };
  }
  if (i >= lines.length) throw new FrontMatterError(file, undefined, "front-matter block is never closed with `---`");
  const body = lines
    .slice(i + 1)
    .join("\n")
    .replace(/^\n+/, "");
  return { fields, body };
}

function unquote(s: string): string {
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Validates + coerces `fields` against `schema`. Unknown keys, missing
 *  required keys, and values of the wrong shape are all errors. */
export function validateFrontMatter<T extends Record<string, unknown>>(
  fields: Map<string, RawField>,
  schema: Schema,
  file: string,
): T {
  for (const [key, { line }] of fields) {
    if (!(key in schema)) {
      throw new FrontMatterError(file, line, `unknown key \`${key}\` -- allowed: ${Object.keys(schema).join(", ")}`);
    }
  }
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema)) {
    const raw = fields.get(key);
    if (!raw) {
      if (spec.required) throw new FrontMatterError(file, undefined, `missing required key \`${key}\``);
      continue;
    }
    out[key] = coerce(key, raw, spec, file);
  }
  return out as T;
}

function coerce(key: string, raw: RawField, spec: FieldSpec, file: string): unknown {
  const { value, line } = raw;
  switch (spec.type) {
    case "string[]": {
      if (!Array.isArray(value)) throw new FrontMatterError(file, line, `\`${key}\` must be a list (\`[a, b]\` or \`- item\` lines)`);
      if (value.some((v) => v === "")) throw new FrontMatterError(file, line, `\`${key}\` contains an empty item`);
      return value;
    }
    case "string": {
      if (Array.isArray(value)) throw new FrontMatterError(file, line, `\`${key}\` must be a single value, not a list`);
      if (value === "") throw new FrontMatterError(file, line, `\`${key}\` is empty`);
      return value;
    }
    case "boolean": {
      if (value === "true") return true;
      if (value === "false") return false;
      throw new FrontMatterError(file, line, `\`${key}\` must be \`true\` or \`false\``);
    }
    case "date": {
      if (Array.isArray(value)) throw new FrontMatterError(file, line, `\`${key}\` must be a date, not a list`);
      if (!isCalendarDay(value)) throw new FrontMatterError(file, line, `\`${key}\` must be a real calendar day as YYYY-MM-DD, got \`${value}\``);
      return value;
    }
  }
}

/** `YYYY-MM-DD` that names a day which exists -- `2026-02-30` is rejected,
 *  not silently normalised to March 2nd the way `new Date()` would. */
export function isCalendarDay(s: string): boolean {
  const m = DATE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** The one call collections make: split, validate, return typed data + body. */
export function parseDocument<T extends Record<string, unknown>>(source: string, schema: Schema, file: string): Parsed<T> {
  const { fields, body } = splitFrontMatter(source, file);
  return { data: validateFrontMatter<T>(fields, schema, file), body };
}
