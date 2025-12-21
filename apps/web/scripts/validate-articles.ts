#!/usr/bin/env tsx
/**
 * Validate Article and Composite Article Configuration
 *
 * This script validates:
 * 1. All article IDs are unique
 * 2. All slugs are unique (across articles and composites)
 * 3. All composite article references point to valid article IDs
 *
 * Usage:
 *   tsx scripts/validate-articles.ts
 *   npm run validate:articles
 */

import { resolveDataPath } from '@skyreach/data';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

const ARTICLES_DIR = resolveDataPath('articles');
const COMPOSITES_DIR = resolveDataPath('composite-articles');

interface ArticleFrontmatter {
  id: string;
  slug?: string;
  title: string;
  secure?: boolean;
}

interface CompositeArticle {
  id: string;
  slug: string;
  title: string;
  sections: Array<{
    articleId: string;
    secure: boolean;
    heading?: string;
  }>;
}

interface ValidationResult {
  duplicateIds: Array<{ id: string; files: string[] }>;
  duplicateSlugs: Array<{ slug: string; sources: string[] }>;
  invalidReferences: Array<{
    compositeId: string;
    missingArticleIds: string[];
  }>;
}

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

/**
 * Find all YAML files in a directory
 */
function findYamlFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

/**
 * Parse frontmatter from markdown content
 */
function parseArticleFrontmatter(content: string): ArticleFrontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  try {
    return yaml.parse(match[1]) as ArticleFrontmatter;
  } catch {
    return null;
  }
}

/**
 * Parse composite article YAML
 */
function parseCompositeArticle(content: string): CompositeArticle | null {
  try {
    return yaml.parse(content) as CompositeArticle;
  } catch {
    return null;
  }
}

/**
 * Load all articles and their metadata
 */
function loadArticles(): Map<string, { id: string; slug?: string; file: string }> {
  const articles = new Map<string, { id: string; slug?: string; file: string }>();
  const files = findMarkdownFiles(ARTICLES_DIR);

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const frontmatter = parseArticleFrontmatter(content);

    if (frontmatter?.id) {
      articles.set(file, {
        id: frontmatter.id,
        slug: frontmatter.slug,
        file,
      });
    }
  }

  return articles;
}

/**
 * Load all composite articles
 */
function loadComposites(): Map<string, CompositeArticle> {
  const composites = new Map<string, CompositeArticle>();
  const files = findYamlFiles(COMPOSITES_DIR);

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const composite = parseCompositeArticle(content);

    if (composite?.id) {
      composites.set(file, composite);
    }
  }

  return composites;
}

/**
 * Validate articles and composites
 */
function validate(): ValidationResult {
  const articles = loadArticles();
  const composites = loadComposites();

  const result: ValidationResult = {
    duplicateIds: [],
    duplicateSlugs: [],
    invalidReferences: [],
  };

  // Check for duplicate article IDs
  const idToFiles = new Map<string, string[]>();
  for (const [file, article] of articles) {
    const existing = idToFiles.get(article.id) || [];
    existing.push(file);
    idToFiles.set(article.id, existing);
  }

  for (const [id, files] of idToFiles) {
    if (files.length > 1) {
      result.duplicateIds.push({ id, files });
    }
  }

  // Check for duplicate slugs (across articles and composites)
  const slugToSources = new Map<string, string[]>();

  for (const [file, article] of articles) {
    if (article.slug) {
      const existing = slugToSources.get(article.slug) || [];
      existing.push(`article:${article.id} (${file})`);
      slugToSources.set(article.slug, existing);
    }
  }

  for (const [file, composite] of composites) {
    const existing = slugToSources.get(composite.slug) || [];
    existing.push(`composite:${composite.id} (${file})`);
    slugToSources.set(composite.slug, existing);
  }

  for (const [slug, sources] of slugToSources) {
    if (sources.length > 1) {
      result.duplicateSlugs.push({ slug, sources });
    }
  }

  // Validate composite article references
  const articleIds = new Set([...articles.values()].map((a) => a.id));

  for (const [, composite] of composites) {
    const missingIds = composite.sections
      .map((s) => s.articleId)
      .filter((id) => !articleIds.has(id));

    if (missingIds.length > 0) {
      result.invalidReferences.push({
        compositeId: composite.id,
        missingArticleIds: missingIds,
      });
    }
  }

  return result;
}

function main() {
  console.log('Validating article configuration...');
  console.log(`  Articles directory: ${ARTICLES_DIR}`);
  console.log(`  Composites directory: ${COMPOSITES_DIR}\n`);

  const result = validate();
  let hasErrors = false;

  if (result.duplicateIds.length > 0) {
    hasErrors = true;
    console.error('Duplicate article IDs found:\n');
    for (const { id, files } of result.duplicateIds) {
      console.error(`  ID: "${id}"`);
      for (const file of files) {
        console.error(`    - ${file}`);
      }
      console.error('');
    }
  }

  if (result.duplicateSlugs.length > 0) {
    hasErrors = true;
    console.error('Duplicate slugs found:\n');
    for (const { slug, sources } of result.duplicateSlugs) {
      console.error(`  Slug: "${slug}"`);
      for (const source of sources) {
        console.error(`    - ${source}`);
      }
      console.error('');
    }
  }

  if (result.invalidReferences.length > 0) {
    hasErrors = true;
    console.error('Invalid composite article references:\n');
    for (const { compositeId, missingArticleIds } of result.invalidReferences) {
      console.error(`  Composite: "${compositeId}"`);
      console.error(`    Missing article IDs:`);
      for (const id of missingArticleIds) {
        console.error(`      - ${id}`);
      }
      console.error('');
    }
  }

  if (hasErrors) {
    console.error('Article validation failed!\n');
    process.exit(1);
  }

  console.log('All article configuration validated successfully!\n');
  process.exit(0);
}

main();
