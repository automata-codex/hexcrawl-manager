import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const CONFIG_FILENAME = 'skyreach.config.json';

const ConfigSchema = z.object({
  repoRoot: z.string().min(1),
});

export type SkyreachConfig = z.infer<typeof ConfigSchema>;

/** Cache by actual config file path to avoid cross-CWD pollution in tests */
const cache = new Map<string, SkyreachConfig>();

function findUp(startDir: string, filename: string): string | null {
  let dir = path.resolve(startDir);
  // Guard against infinite loops on odd path inputs
  let prev: string | undefined;
  while (dir !== prev) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    prev = dir;
    dir = path.dirname(dir);
  }
  return null;
}

export function loadConfig(opts?: {
  /** Defaults to process.cwd() */
  cwd?: string;
  /** If true, throw when not found/invalid; otherwise return null (good for tests) */
  throwIfMissing?: boolean;
}): SkyreachConfig | null {
  const cwd = opts?.cwd ?? process.cwd();

  // 1) ENV override for tests/CI or unusual layouts
  const fromEnv = process.env.SKYREACH_CONFIG?.trim();
  let configPath =
    (fromEnv && path.resolve(cwd, fromEnv)) ??
    // 2) Nearest config walking upward (works from apps/*, packages/*, repo root, etc.)
    findUp(cwd, CONFIG_FILENAME);

  if (!configPath) {
    if (opts?.throwIfMissing) {
      throw new Error(
        `Config file not found. Looked upward from ${cwd} for ${CONFIG_FILENAME}` +
          (fromEnv ? ` (env override ${fromEnv} did not resolve).` : '.'),
      );
    }
    return null;
  }

  // Normalize the key to avoid duplicate cache entries
  try {
    configPath = fs.realpathSync(configPath);
  } catch {
    // fall back to resolved path if realpath fails (e.g., broken symlink)
  }

  const cached = cache.get(configPath);
  if (cached) return cached;

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
  } catch (e) {
    if (opts?.throwIfMissing) {
      throw new Error(`Failed to read ${configPath}: ${(e as Error).message}`);
    }
    return null;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${configPath}: ${(e as Error).message}`);
  }

  const parsed = ConfigSchema.safeParse(json);
  if (!parsed.success) {
    // Keep this terse; Zod error objects can be huge in CLI output
    throw new Error(`Invalid ${CONFIG_FILENAME}: ${parsed.error.message}`);
  }

  cache.set(configPath, parsed.data);
  return parsed.data;
}
