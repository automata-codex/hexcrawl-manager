import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { ZodSchema } from 'zod';

import {
  DataFileNotFoundError,
  DataParseError,
  DataValidationError,
} from './errors';

export function checkFileExists(file: string, msg?: string) {
  if (!fs.existsSync(file)) {
    throw new Error(msg ?? `File not found: ${file}`);
  }
  return file;
}

export function ensureDir(filename: string) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}

/**
 * Loads and parses all YAML files in a directory, returning an array of objects
 * of type T. Files ending with .yml or .yaml are included. If a Zod validator
 * is provided, validates each parsed object and warns on failure (with absolute
 * file path).
 */
export function loadAllYamlInDir<T>(
  dir: string,
  validator?: ZodSchema<T>,
): T[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const results: T[] = [];
  for (const f of files) {
    const filePath = path.join(dir, f);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.parse(raw);
    if (validator) {
      const result = validator.safeParse(parsed);
      if (result.success) {
        results.push(result.data);
      } else {
        console.warn(`Validation failed for file: ${filePath}`);
      }
    } else {
      results.push(parsed as T);
    }
  }
  return results;
}

export function readAndValidateYaml<T>(
  filepath: string,
  schema: ZodSchema<T>,
): T {
  const raw = readYaml(filepath);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new DataValidationError(filepath, parsed.error.issues);
  }
  return parsed.data;
}

export function readYaml(filepath: string): unknown {
  if (!fs.existsSync(filepath)) {
    throw new DataFileNotFoundError(filepath);
  }
  try {
    return yaml.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    throw new DataParseError(filepath, e);
  }
}
