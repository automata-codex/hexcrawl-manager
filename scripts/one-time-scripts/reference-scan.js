/**
 * Scans for places where I may have used Astro's cross-reference functionality
 */

import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
const traverse = babelTraverse.default;

async function findReferenceLikeUsages(dir) {
  const files = await readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      await findReferenceLikeUsages(fullPath);
      continue;
    }

    if (!fullPath.endsWith('.js') && !fullPath.endsWith('.ts')) continue;

    const code = await readFile(fullPath, 'utf8');
    let ast;
    try {
      ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });
    } catch (err) {
      console.warn(`⚠️ Could not parse ${fullPath}: ${err.message}`);
      continue;
    }

    traverse(ast, {
      MemberExpression(path) {
        const { node } = path;
        const isDataAccess =
          node.object.type === 'MemberExpression' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'data' &&
          node.property.type === 'Identifier';

        if (isDataAccess) {
          const field = node.property.name;
          if (field.endsWith('Id') || field.endsWith('Slug')) {
            console.log(
              `[${fullPath}] Possible manual reference: entry.data.${field}`,
            );
          }
        }
      },
    });
  }
}

void findReferenceLikeUsages('/Users/alexgs/projects/skyreach/src');
