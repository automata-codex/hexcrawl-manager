import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ConfigSchema = z.object({
  repoRoot: z.string().min(1),
});

export type SkyreachConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: SkyreachConfig | null = null;

/**
 * Load and validate the skyreach.config.json file. Caches the result after the
 * first load.
 * @returns The parsed config or null if not found/invalid.
 */
export function loadConfig(): SkyreachConfig | null {
  if (cachedConfig) return cachedConfig;

  const configPath = path.resolve(__dirname, '../../skyreach.config.json');

  if (!fs.existsSync(configPath)) {
    console.log(`Config file not found at ${configPath}`);
    return null;
  }

  const parsed = ConfigSchema.safeParse(
    JSON.parse(fs.readFileSync(configPath, 'utf-8')),
  );

  if (!parsed.success) {
    console.error('❌ Invalid skyreach.config.json:', parsed.error.format());
    throw new Error('Failed to load config');
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
