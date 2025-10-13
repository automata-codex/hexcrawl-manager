import fs from 'node:fs';

import { atomicWrite } from './atomic-write';
import { ensureDir } from './fs-utils';

import type { ZodSchema } from 'zod';

type AppendOpts = WriteOpts;

type ReadJsonlOpts<T> = {
  schema?: ZodSchema<T>;
  skipInvalid?: boolean; // If true, skip invalid lines instead of throwing; still logs line number.
};

type ReadJsonlWithHeaderOpts<H, T> = {
  headerSchema?: ZodSchema<H>;
  eventSchema?: ZodSchema<T>;
  /** If true, throw if the first line isn't a valid header. Default: false */
  requireHeader?: boolean;
  /** If true, warn and skip invalid lines instead of throwing. Default: false */
  skipInvalid?: boolean;
};

type WriteOpts = {
  eol?: '\n' | '\r\n';
};

export function readJsonl<T = unknown>(
  filename: string,
  opts: ReadJsonlOpts<T> = {},
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

export function readJsonlWithHeader<H = unknown, T = unknown>(
  filename: string,
  opts: ReadJsonlWithHeaderOpts<H, T> = {},
): { header?: H; events: T[] } {
  if (!fs.existsSync(filename)) {
    return { header: undefined, events: [] };
  }

  const raw = fs.readFileSync(filename, 'utf8');
  if (!raw.trim()) {
    return { header: undefined, events: [] };
  }

  const {
    headerSchema,
    eventSchema,
    requireHeader = false,
    skipInvalid = false,
  } = opts;
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let header: H | undefined;
  let startIdx = 0;

  // Helper for consistent BOM stripping (first line only)
  const stripBOM = (s: string) => s.replace(/^\uFEFF/, '');

  // Try header on line 1 if a header schema is provided
  if (headerSchema && lines.length > 0) {
    const text = stripBOM(lines[0]);
    try {
      const parsed = JSON.parse(text);
      const res = headerSchema.safeParse(parsed);
      if (res.success) {
        header = res.data;
        startIdx = 1;
      } else if (requireHeader) {
        const msg = `Invalid header at ${filename}:1 – ${res.error.message}`;
        throw new Error(msg);
      }
      // If not success and not required, we just treat line 1 as an event below.
    } catch (e) {
      if (requireHeader) {
        const msg = `Bad header JSON at ${filename}:1 – ${(e as Error).message}`;
        throw new Error(msg);
      }
      // else: leave startIdx = 0, line 1 will be parsed as an event
    }
  }

  const events: T[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const lineNo = i + 1; // 1-based file line number
    const text = i === 0 ? stripBOM(lines[i]) : lines[i];
    try {
      const parsed = JSON.parse(text);
      if (eventSchema) {
        const res = eventSchema.safeParse(parsed);
        if (!res.success) {
          const msg = `Invalid JSONL at ${filename}:${lineNo} – ${res.error.message}`;
          if (skipInvalid) {
            console.warn(msg);
            continue;
          }
          throw new Error(msg);
        }
        events.push(res.data);
      } else {
        events.push(parsed as T);
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

  return { header, events };
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
