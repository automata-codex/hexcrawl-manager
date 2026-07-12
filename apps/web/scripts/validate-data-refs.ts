#!/usr/bin/env tsx
/**
 * Validate Data References (backtick slugs + markdown links)
 *
 * Three checks against every markdown / YAML file under `data/`:
 *
 *   1. **Unresolved backticks** — every `slug` token in prose must resolve to a
 *      known entity. There is no inline code in this repo, so anything that
 *      doesn't resolve is a bug (typo, deleted entity, prose that mistakenly
 *      uses backticks).
 *
 *   2. **Dangling markdown links** — every `[text](url)` whose URL looks like a
 *      data-entity URL must resolve to a known entity.
 *
 *   3. **URL drift** — every `[text](url)` whose URL resolves must use the
 *      canonical URL pattern for that entity's type.
 *
 *   4. **Routeless references** — references (backtick OR link) to entities of
 *      a type with no public route are flagged as bugs.
 *
 * Usage:
 *   tsx scripts/validate-data-refs.ts
 *   npm run validate:refs
 *
 *   # Scope to a subset:
 *   npm run validate:refs -- --paths data/factions data/plotlines
 *
 *   # Strict by default (non-zero exit on any finding).
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import {
  buildResolver,
  findBacktickRefs,
  findMarkdownLinks,
  parseMarkdownFile,
  type Resolver,
} from './lib/data-refs.js';

interface Finding {
  category:
    | 'unresolved-backtick'
    | 'routeless-backtick'
    | 'dangling-link'
    | 'url-drift'
    | 'routeless-link';
  file: string;
  line: number;
  message: string;
  /** The offending substring (backtick token or link URL). */
  match: string;
  /** Suggested replacement, if applicable. */
  suggestion?: string;
}

const ARGS = parseArgs(process.argv.slice(2));

function parseArgs(argv: string[]): {
  paths: string[];
  silent: boolean;
} {
  const paths: string[] = [];
  let silent = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? '';
    if (a === '--paths') {
      while (i + 1 < argv.length && !argv[i + 1]!.startsWith('--')) {
        i += 1;
        paths.push(argv[i]!);
      }
    } else if (a === '--silent') {
      silent = true;
    }
  }
  return { paths, silent };
}

function collectScannableFiles(roots: string[]): string[] {
  const out: string[] = [];
  const exts = new Set(['.md', '.mdx', '.yml', '.yaml']);
  const skipDirs = new Set([
    'session-logs',
    'session-reports',
    'footprints',
    'rollovers',
    'public',
  ]);

  const walk = (current: string) => {
    if (!existsSync(current)) return;
    const st = statSync(current);
    if (!st.isDirectory()) {
      if (exts.has(extname(current).toLowerCase())) out.push(current);
      return;
    }
    for (const entry of readdirSync(current)) {
      if (skipDirs.has(entry)) continue;
      walk(join(current, entry));
    }
  };

  for (const root of roots) walk(root);
  return out;
}

type LinkClassification =
  | { kind: 'skip' }
  | { kind: 'resolved' }
  | { kind: 'dangling' }
  | { kind: 'drift'; canonical: string; type: string }
  | { kind: 'routeless'; type: string };

function classifyLink(url: string, resolver: Resolver): LinkClassification {
  if (!url) return { kind: 'skip' };
  if (/^[a-z]+:\/\//i.test(url)) return { kind: 'skip' };
  if (url.startsWith('#') || url.startsWith('mailto:')) return { kind: 'skip' };
  if (!url.startsWith('/')) return { kind: 'skip' };
  if (url.startsWith('/images/') || url.startsWith('/assets/')) return { kind: 'skip' };

  // Already canonical (exact match in URL index).
  const resolved = resolver.resolveUrl(url);
  if (resolved) {
    if (resolver.isRouteless(resolved.type)) {
      return { kind: 'routeless', type: resolved.type };
    }
    return { kind: 'resolved' };
  }

  // Claims to be an entity link (canonical prefix), but didn't resolve.
  for (const prefix of resolver.canonicalUrlPrefixes()) {
    if (url.startsWith(prefix)) {
      // Special case: URL is exactly a prefix with nothing after → index/section page, skip.
      if (url === prefix.slice(0, -1) || url === prefix) return { kind: 'skip' };
      return { kind: 'dangling' };
    }
  }

  // Drifted prefix that resolves once we strip the wrong prefix.
  const drift = resolver.detectDrift(url);
  if (drift && drift.url) {
    return { kind: 'drift', canonical: drift.url, type: drift.type };
  }

  // Drift prefix matched but slug doesn't resolve → dangling.
  for (const prefix of resolver.driftUrlPrefixes()) {
    if (url.startsWith(prefix)) {
      return { kind: 'dangling' };
    }
  }

  // Doesn't claim to be an entity reference.
  return { kind: 'skip' };
}

function validateFile(
  filePath: string,
  dataRoot: string,
  resolver: Resolver,
): Finding[] {
  const findings: Finding[] = [];
  const relPath = relative(dataRoot, filePath);
  const ext = extname(filePath).toLowerCase();

  let body: string;
  let bodyOffset = 0;
  if (ext === '.md' || ext === '.mdx') {
    const parsed = parseMarkdownFile(filePath);
    if (!parsed) return findings;
    body = parsed.body;
    bodyOffset = parsed.bodyOffset;
  } else {
    body = readFileSync(filePath, 'utf-8');
  }
  void bodyOffset; // line numbers are within body, which is fine for diagnostics

  // 1 & 4: backtick refs.
  const backtickRefs = findBacktickRefs(body, resolver);
  for (const ref of backtickRefs) {
    if (ref.insideLinkText) continue; // already linked context
    const resolved = resolver.resolveSlug(ref.slug, ref.typeHint);
    if (!resolved) {
      findings.push({
        category: 'unresolved-backtick',
        file: relPath,
        line: ref.line,
        message: `\`${ref.slug}\` does not resolve to any known entity${
          ref.typeHint ? ` (type hint: ${ref.typeHint})` : ''
        }.`,
        match: ref.raw,
      });
      continue;
    }
    if (resolver.isRouteless(resolved.type)) {
      findings.push({
        category: 'routeless-backtick',
        file: relPath,
        line: ref.line,
        message: `\`${ref.slug}\` resolves to ${resolved.type}, which has no public route. Either add a route or restructure the reference.`,
        match: ref.raw,
      });
      continue;
    }
    // Resolved + has-route — fine. Linker will handle it.
  }

  // 2 & 3 & 4: markdown links.
  const links = findMarkdownLinks(body);
  for (const link of links) {
    const cls = classifyLink(link.url, resolver);
    switch (cls.kind) {
      case 'skip':
      case 'resolved':
        break;
      case 'dangling':
        findings.push({
          category: 'dangling-link',
          file: relPath,
          line: link.line,
          message: `[${link.text}](${link.url}) — URL does not resolve to any known entity.`,
          match: link.url,
        });
        break;
      case 'drift':
        findings.push({
          category: 'url-drift',
          file: relPath,
          line: link.line,
          message: `[${link.text}](${link.url}) — drifted from canonical (${cls.type}).`,
          match: link.url,
          suggestion: cls.canonical,
        });
        break;
      case 'routeless':
        findings.push({
          category: 'routeless-link',
          file: relPath,
          line: link.line,
          message: `[${link.text}](${link.url}) — URL resolves to ${cls.type}, which is documented as routeless. Route should exist or link should be removed.`,
          match: link.url,
        });
        break;
    }
  }

  return findings;
}

function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) return '';
  const grouped = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!grouped.has(f.category)) grouped.set(f.category, []);
    grouped.get(f.category)!.push(f);
  }
  const out: string[] = [];
  const labels: Record<Finding['category'], string> = {
    'unresolved-backtick': 'Unresolved backtick references',
    'routeless-backtick': 'Backticks referencing routeless types',
    'dangling-link': 'Dangling markdown links',
    'url-drift': 'Markdown links with drifted URLs',
    'routeless-link': 'Markdown links to routeless types',
  };
  for (const cat of [
    'unresolved-backtick',
    'routeless-backtick',
    'dangling-link',
    'url-drift',
    'routeless-link',
  ] as const) {
    const items = grouped.get(cat);
    if (!items || items.length === 0) continue;
    out.push(`\n${labels[cat]} (${items.length}):`);
    for (const f of items) {
      out.push(`  ${f.file}:${f.line}  ${f.message}`);
      if (f.suggestion) out.push(`    → suggest: ${f.suggestion}`);
    }
  }
  return out.join('\n');
}

function main(): void {
  const dataRoot = resolveDataPath('');
  const log = ARGS.silent ? () => {} : (m: string) => console.log(m);

  log(`Validating data references in ${dataRoot}\n`);

  const resolver = buildResolver({ dataRoot });
  const stats = resolver.stats();
  log(
    `Loaded entities: ${Object.entries(stats)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}\n`,
  );

  const scanRoots =
    ARGS.paths.length > 0
      ? ARGS.paths.map((p) => (p.startsWith('/') ? p : join(process.cwd(), p)))
      : [dataRoot];

  const files = collectScannableFiles(scanRoots);
  log(`Scanning ${files.length} file(s).`);

  const allFindings: Finding[] = [];
  for (const f of files) {
    allFindings.push(...validateFile(f, dataRoot, resolver));
  }

  if (allFindings.length === 0) {
    log('\nAll data references valid.\n');
    process.exit(0);
  }

  console.error(formatFindings(allFindings));
  console.error(`\n${allFindings.length} finding(s).\n`);
  process.exit(1);
}

main();
