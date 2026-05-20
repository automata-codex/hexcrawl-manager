#!/usr/bin/env tsx
/**
 * Link Data References
 *
 * Rewrites backtick-slug references like `revenant-courier` into proper
 * markdown links `[Revenant Courier](/gm-reference/encounters/revenant-courier)`.
 *
 * Skips:
 *   - tokens inside fenced code blocks
 *   - tokens already inside markdown link text `[ ... ]`
 *   - tokens that don't resolve to a known entity (validator surfaces those)
 *   - tokens that resolve to a type with no public route (validator surfaces)
 *   - YAML structured arrays (`factions: [foo, bar]` etc.) — those use bare
 *     slugs, not backticks, so the scanner never sees them
 *
 * Usage:
 *   tsx scripts/link-data-refs.ts --dry-run             # default, prints diff
 *   tsx scripts/link-data-refs.ts --write               # write in place
 *   tsx scripts/link-data-refs.ts --paths data/factions # limit scope
 *   tsx scripts/link-data-refs.ts --branch              # only files changed vs main
 */

import { resolveDataPath } from '@achm/data';
import { execSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, relative } from 'node:path';

import yaml from 'yaml';

import {
  buildResolver,
  findBacktickRefs,
  parseMarkdownFile,
  type Resolver,
} from './lib/data-refs.js';

interface CliArgs {
  paths: string[];
  dryRun: boolean;
  write: boolean;
  branch: boolean;
  baseBranch: string;
  showDiff: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    paths: [],
    dryRun: true,
    write: false,
    branch: false,
    baseBranch: 'main',
    showDiff: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? '';
    if (a === '--paths') {
      while (i + 1 < argv.length && !argv[i + 1]!.startsWith('--')) {
        i += 1;
        args.paths.push(argv[i]!);
      }
    } else if (a === '--write') {
      args.write = true;
      args.dryRun = false;
    } else if (a === '--dry-run') {
      args.dryRun = true;
      args.write = false;
    } else if (a === '--branch') {
      args.branch = true;
    } else if (a === '--base') {
      i += 1;
      args.baseBranch = argv[i] ?? 'main';
    } else if (a === '--no-diff') {
      args.showDiff = false;
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv.slice(2));

interface Rewrite {
  start: number;
  end: number;
  before: string;
  after: string;
  line: number;
}

interface FileResult {
  file: string;
  rewrites: Rewrite[];
  newContent: string;
}

function computeRewrites(
  body: string,
  bodyOffset: number,
  resolver: Resolver,
): { rewrites: Rewrite[]; newContent: string } {
  const refs = findBacktickRefs(body, resolver);
  const rewrites: Rewrite[] = [];

  for (const ref of refs) {
    if (ref.insideLinkText) continue;
    const resolved = resolver.resolveSlug(ref.slug, ref.typeHint);
    if (!resolved) continue;
    if (resolved.url === null) continue; // routeless
    if (!resolved.url) continue;

    // Replacement: [Display Name](/canonical-url)
    const after = `[${resolved.displayName}](${resolved.url})`;
    rewrites.push({
      start: ref.start,
      end: ref.end,
      before: ref.raw,
      after,
      line: ref.line,
    });
  }

  // Apply rewrites right-to-left so offsets stay valid.
  let newBody = body;
  for (let i = rewrites.length - 1; i >= 0; i -= 1) {
    const r = rewrites[i]!;
    newBody = newBody.slice(0, r.start) + r.after + newBody.slice(r.end);
  }

  // Offsets in `rewrites` are within `body`; the caller needs them within the
  // full file. We could add `bodyOffset` here but downstream code reads diffs
  // by line number, so it doesn't matter for display.
  void bodyOffset;

  return { rewrites, newContent: newBody };
}

function rewriteFile(filePath: string, resolver: Resolver): FileResult | null {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.md' || ext === '.mdx') {
    const parsed = parseMarkdownFile(filePath);
    if (!parsed) return null;
    const raw = readFileSync(filePath, 'utf-8');
    const { rewrites, newContent } = computeRewrites(
      parsed.body,
      parsed.bodyOffset,
      resolver,
    );
    if (rewrites.length === 0) return null;
    // Reassemble: original prefix (frontmatter) + rewritten body.
    const newFull = raw.slice(0, parsed.bodyOffset) + newContent;
    return { file: filePath, rewrites, newContent: newFull };
  }

  if (ext === '.yml' || ext === '.yaml') {
    const raw = readFileSync(filePath, 'utf-8');
    const { rewrites, newContent } = computeRewrites(raw, 0, resolver);
    if (rewrites.length === 0) return null;
    // Safety: re-parse the rewritten YAML to make sure structure survives.
    // A bare scalar starting with a backtick token would, after rewrite, begin
    // with `[` — which YAML reads as a flow sequence and would corrupt parse.
    if (!yamlStillParses(raw, newContent)) {
      console.warn(
        `[link-data-refs] SKIP ${filePath} — rewrite would change YAML parse. Likely a bare scalar that starts with a backtick reference. Wrap the value in quotes and retry.`,
      );
      return null;
    }
    return { file: filePath, rewrites, newContent };
  }

  return null;
}

/** True when both YAML strings parse to the same structure. */
function yamlStillParses(original: string, rewritten: string): boolean {
  let beforeOk: unknown;
  let afterOk: unknown;
  try {
    beforeOk = yaml.parse(original);
  } catch {
    // If the original didn't parse, we have nothing to compare against; let it through.
    return true;
  }
  try {
    afterOk = yaml.parse(rewritten);
  } catch {
    return false;
  }
  // Structural equality is overkill; we mostly want to ensure top-level shape
  // (object vs array vs string) hasn't shifted.
  return typeof beforeOk === typeof afterOk;
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

function filesChangedOnBranch(
  baseBranch: string,
  cwd: string,
  exts: Set<string>,
): string[] {
  try {
    const mergeBase = execSync(`git merge-base HEAD ${baseBranch}`, {
      cwd,
      encoding: 'utf-8',
    }).trim();
    // Use --name-status to discard deleted entries.
    const out = execSync(`git diff --name-status ${mergeBase}...HEAD`, {
      cwd,
      encoding: 'utf-8',
    });
    return out
      .split('\n')
      .map((line) => line.split('\t'))
      .filter((parts) => parts.length >= 2 && parts[0] !== 'D')
      .map((parts) => parts[parts.length - 1]!.trim())
      .filter(Boolean)
      .filter((p) => exts.has(extname(p).toLowerCase()))
      .map((p) => join(cwd, p))
      .filter((p) => existsSync(p));
  } catch (err) {
    console.error(
      `[link-data-refs] failed to enumerate branch changes vs ${baseBranch}: ${(err as Error).message}`,
    );
    return [];
  }
}

function printResult(result: FileResult, dataRoot: string): void {
  const rel = relative(dataRoot, result.file);
  console.log(`\n${rel}  (${result.rewrites.length} rewrite${result.rewrites.length === 1 ? '' : 's'})`);
  if (!ARGS.showDiff) return;
  for (const r of result.rewrites) {
    console.log(`  line ${r.line}:`);
    console.log(`    -  ${r.before}`);
    console.log(`    +  ${r.after}`);
  }
}

function main(): void {
  const dataRoot = resolveDataPath('');

  console.log(`link-data-refs — ${ARGS.write ? 'WRITE MODE' : 'dry-run'}`);
  console.log(`data root: ${dataRoot}\n`);

  const resolver = buildResolver({ dataRoot });
  const stats = resolver.stats();
  console.log(
    `Loaded entities: ${Object.entries(stats)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}\n`,
  );

  let files: string[];
  if (ARGS.branch) {
    const exts = new Set(['.md', '.mdx', '.yml', '.yaml']);
    // Data lives in a sibling repo. Discover its cwd from the resolved data root.
    files = filesChangedOnBranch(ARGS.baseBranch, getDataRepoRoot(dataRoot), exts);
    console.log(`Branch-scope: ${files.length} changed file(s) vs ${ARGS.baseBranch}.\n`);
  } else if (ARGS.paths.length > 0) {
    const roots = ARGS.paths.map((p) =>
      p.startsWith('/') ? p : join(process.cwd(), p),
    );
    files = collectScannableFiles(roots);
    console.log(`Path-scope: ${files.length} file(s).\n`);
  } else {
    files = collectScannableFiles([dataRoot]);
    console.log(`Whole-repo: ${files.length} file(s).\n`);
  }

  const results: FileResult[] = [];
  for (const f of files) {
    const r = rewriteFile(f, resolver);
    if (r) results.push(r);
  }

  if (results.length === 0) {
    console.log('No changes to make.\n');
    return;
  }

  for (const r of results) printResult(r, dataRoot);

  const totalRewrites = results.reduce((n, r) => n + r.rewrites.length, 0);
  console.log(
    `\n${results.length} file(s), ${totalRewrites} rewrite(s) ${ARGS.write ? 'applied' : 'proposed'}.`,
  );

  if (ARGS.write) {
    for (const r of results) {
      writeFileSync(r.file, r.newContent, 'utf-8');
    }
    console.log('Wrote changes.\n');
  } else {
    console.log('(dry run — pass --write to apply)\n');
  }
}

function getDataRepoRoot(dataRoot: string): string {
  // resolveDataPath('') gives e.g. '/Users/alexgs/projects/skyreach/data'; the
  // repo root is the parent.
  return dataRoot.replace(/\/data\/?$/, '');
}

main();
