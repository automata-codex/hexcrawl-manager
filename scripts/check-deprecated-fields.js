import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { resolve, join, basename } from 'path';
import { parse } from 'yaml';
import { z } from 'zod';
import { pathToFileURL } from 'url';
import { get } from 'lodash-es';

/**
 * @typedef {import('zod').ZodTypeAny} ZodTypeAny
 * @typedef {import('zod').ZodObject<any>} ZodObject
 */

// ---- Config ----

const WARN_ON_UNMAPPED = process.argv.includes('-w') || process.argv.includes('--warn-unmapped');

const SCHEMA_DIR = '../schemas';
const DATA_ROOT = '../data';

/** @type {Record<string, string>} */
const manualSchemaMap = {
  'dungeon': 'dungeons',
  'hex': 'hexes',
};

// ---- Utilities ----

/**
 * Recursively find all `.js` files in a directory
 * @param {string} dir
 * @returns {string[]}
 */
function getAllSchemaFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const res = resolve(dir, entry.name);
    return entry.isDirectory() ? getAllSchemaFiles(res) : (res.endsWith('.js') ? [res] : []);
  });
}

/**
 * Recursively find deprecated fields in a Zod schema
 * @param {ZodTypeAny} schema
 * @param {string[]} [path=[]]
 * @returns {string[]}
 */
function getDeprecatedFields(schema, path = []) {
  const fields = [];

  const visit = (schema, path) => {
    const desc = schema.description?.toLowerCase?.();
    if (desc && desc.includes('deprecated')) {
      fields.push(path.join('.'));
    }

    if (schema instanceof z.ZodObject) {
      for (const [key, value] of Object.entries(schema.shape)) {
        visit(value, [...path, key]);
      }
    } else if (schema instanceof z.ZodUnion) {
      for (const option of schema._def.options) {
        visit(option, path);
      }
    } else if (schema instanceof z.ZodArray) {
      visit(schema.element, [...path, '[*]']);
    } else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      visit(schema.unwrap(), path);
    } else if (schema instanceof z.ZodDefault) {
      visit(schema.removeDefault(), path);
    } else if (schema instanceof z.ZodEffects) {
      visit(schema.innerType(), path);
    }
  };

  visit(schema, path);
  return fields;
}

/**
 * Check if a YAML object uses any deprecated fields
 * @param {any} obj
 * @param {string[]} deprecatedPaths
 * @returns {string[]}
 */
function findDeprecatedFieldsInYaml(obj, deprecatedPaths) {
  return deprecatedPaths.filter(path => {
    if (path.includes('[*]')) {
      const prefix = path.replace(/\.\[\*\].*$/, '');
      const items = get(obj, prefix);
      if (Array.isArray(items)) {
        const restPath = path.split('[*].')[1];
        return items.some(item => get(item, restPath) !== undefined);
      }
      return false;
    } else {
      return get(obj, path) !== undefined;
    }
  });
}

/**
 * Extract frontmatter YAML from a Markdown file
 * @param {string} content
 * @returns {string|null}
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  return match ? match[1] : null;
}

/**
 * Walk a content directory and check YAML or frontmatter for deprecated fields
 * @param {string} dir
 * @param {string[]} deprecatedPaths
 * @returns {string[]}
 */
function walkAndCheck(dir, deprecatedPaths) {
  const deprecatedUsages = [];

  for (const fileOrDir of readdirSync(dir)) {
    const fullPath = join(dir, fileOrDir);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      deprecatedUsages.push(...walkAndCheck(fullPath, deprecatedPaths));
    } else if (
      fileOrDir.endsWith('.yaml') ||
      fileOrDir.endsWith('.yml') ||
      fileOrDir.endsWith('.md') ||
      fileOrDir.endsWith('.mdx')
    ) {
      try {
        const raw = readFileSync(fullPath, 'utf8');
        let parsed;

        if (fileOrDir.endsWith('.md') || fileOrDir.endsWith('.mdx')) {
          const frontmatter = extractFrontmatter(raw);
          if (!frontmatter) continue;
          parsed = parse(frontmatter);
        } else {
          parsed = parse(raw);
        }

        if (typeof parsed === 'object' && parsed !== null) {
          const found = findDeprecatedFieldsInYaml(parsed, deprecatedPaths);
          if (found.length > 0) {
            deprecatedUsages.push(`${fullPath}: ${found.join(', ')}`);
          }
        }
      } catch (err) {
        console.warn(`❌ Failed to parse ${fullPath}: ${err.message}`);
      }
    }
  }

  return deprecatedUsages;
}

// ---- Main ----

(async () => {
  const schemaFiles = getAllSchemaFiles(SCHEMA_DIR);

  for (const filePath of schemaFiles) {
    const baseName = basename(filePath, '.js');
    const contentSubdir = manualSchemaMap[baseName];
    if (!contentSubdir) {
      if (WARN_ON_UNMAPPED) {
        console.warn(`⚠️ Skipping ${baseName} (no directory mapped in manualSchemaMap)`);
      }
      continue;
    }

    const contentDir = join(DATA_ROOT, contentSubdir);
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    const schema = mod.default || Object.values(mod).find(v => v instanceof z.ZodObject);

    if (!schema || !(schema instanceof z.ZodObject)) {
      if (WARN_ON_UNMAPPED) {
        console.warn(`⚠️ Skipping ${baseName} (no directory mapped in manualSchemaMap)`);
      }
      continue;
    }

    const deprecatedFields = getDeprecatedFields(schema);
    if (deprecatedFields.length === 0) continue;

    console.log(`\n🔍 Checking "${baseName}" → "${contentDir}"`);
    if (!existsSync(contentDir)) {
      console.warn(`❌ Directory not found: ${contentDir}`);
      continue;
    }

    const results = walkAndCheck(contentDir, deprecatedFields);
    if (results.length === 0) {
      console.log(`✅ No deprecated fields found in "${contentSubdir}".`);
    } else {
      console.log(`⚠️ Deprecated fields found in "${contentSubdir}":`);
      results.forEach(r => console.log(`- ${r}`));
    }
  }
})();
