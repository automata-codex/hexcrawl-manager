import fs from 'node:fs';

import { atomicWrite } from './atomic-write';
import { ensureDir } from './fs-utils';

import type { ZodSchema } from 'zod';

type AppendOpts = WriteOpts;

type ReadOpts<T> = {
  schema?: ZodSchema<T>;
  skipInvalid?: boolean; // If true, skip invalid lines instead of throwing; still logs line number.
};

type WriteOpts = {
  eol?: '\n' | '\r\n';
};

export function readJsonl<T = unknown>(
  filename: string,
  opts: ReadOpts<T> = {},
): T[] {
  if (!fs.existsSync(filename)) return [];
  const raw = fs.readFileSync(filename, 'utf8');
  if (!raw.trim()) return [];

  const { schema, skipInvalid = false } = opts;
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const out: T[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const text = lines[i].replace(/^\uFEFF/, ''); // strip BOM if present
    try {
      const parsed = JSON.parse(text);
      if (schema) {
        const res = schema.safeParse(parsed);
        if (!res.success) {
          const msg = `Invalid JSONL at ${filename}:${lineNo} – ${res.error.message}`;
          if (skipInvalid) {
            console.warn(msg);
            continue;
          }
          throw new Error(msg);
        }
        out.push(res.data);
      } else {
        out.push(parsed as T);
      }
    } catch (e) {
      const msg = `Bad JSONL at ${filename}:${lineNo} – ${(e as Error).message}`;
      if (skipInvalid) {
        console.warn(msg);
        continue;
      }
      throw new Error(msg);
    }
  }
  return out;
}

export function writeJsonl<T extends Record<string, unknown>>(
  filename: string,
  records: Iterable<T>,
  opts: WriteOpts = {},
): void {
  ensureDir(filename);
  const eol = opts.eol ?? '\n';
  const content =
    Array.from(records)
      .map((r) => JSON.stringify(r))
      .join(eol) + eol;
  atomicWrite(filename, content);
}

export function appendJsonl<T extends Record<string, unknown>>(
  p: string,
  record: T,
  opts: AppendOpts = {},
): void {
  ensureDir(p);
  const eol = opts.eol ?? '\n';
  fs.appendFileSync(p, JSON.stringify(record) + eol, 'utf8');
}
