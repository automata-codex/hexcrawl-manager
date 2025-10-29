import { compareSeasonIds } from '@skyreach/core';
import { type MetaV2Data, MetaV2Schema } from '@skyreach/schemas';
import { z } from 'zod';

import { writeYamlAtomic } from './atomic-write';
import { readAndValidateYaml } from './fs-utils';
import { REPO_PATHS } from './repo-paths';

/** ────────────────────────────────────────────────────────────────────────────
 *  Compat: v1 shim + migration
 *  (kept local to IO to avoid polluting @skyreach/schemas)
 *  v1 shape:
 *    { appliedSessions: string[], nextSessionSeq: number, rolledSeasons: string[] }
 *  maps to v2 trails + top-level nextSessionSeq
 *  ────────────────────────────────────────────────────────────────────────────
 */
const MetaV1Schema = z.object({
  appliedSessions: z.array(z.string()),
  nextSessionSeq: z.number().int().nonnegative(),
  rolledSeasons: z.array(z.string()),
});

type MetaV1Data = z.infer<typeof MetaV1Schema>;

function migrateV1ToV2(v1: MetaV1Data): MetaV2Data {
  const dedupe = (a?: string[]) => [...new Set(a ?? [])];
  return {
    version: 2 as const,
    nextSessionSeq: v1.nextSessionSeq,
    state: {
      trails: {
        backend: 'meta',
        applied: {
          sessions: dedupe(v1.appliedSessions),
          seasons: dedupe(v1.rolledSeasons),
        },
      },
      ap: { backend: 'ledger' },
    },
  };
}

/** ────────────────────────────────────────────────────────────────────────────
 *  Public API
 *  ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Loads `data/meta.yaml` as MetaV2Data.
 * - Accepts v2 (validates) or v1 (migrates → validates).
 * - If migrated, writes back v2 immediately (write-through upgrade).
 */
export function loadMeta(): MetaV2Data {
  // Accept either v2 or v1 in the file
  const AnyMeta = z.union([MetaV2Schema, MetaV1Schema]);
  const raw = readAndValidateYaml(REPO_PATHS.META(), AnyMeta);

  if ('version' in raw && raw.version === 2) {
    // Already v2, return as-is (MetaV2Schema ensured shape)
    return raw as MetaV2Data;
  }

  // v1 → v2 migration
  const v2 = migrateV1ToV2(raw as MetaV1Data);
  // Write-through upgrade so future reads are v2
  writeYamlAtomic(REPO_PATHS.META(), normalizeMeta(v2));
  return v2;
}

/**
 * Saves a partial MetaV2Data to `data/meta.yaml`, deep-merging with existing state.
 * - Arrays in `applied` are union-merged and de-duplicated.
 * - Objects are shallow-merged per field; unspecified subsystems/collections are preserved.
 */
export function saveMeta(patch: DeepPartial<MetaV2Data>): void {
  const current = loadMeta();
  const merged = mergeMeta(current, patch);

  // Final validation guard
  const validated = MetaV2Schema.parse(merged);

  writeYamlAtomic(REPO_PATHS.META(), normalizeMeta(validated));
}

/** ────────────────────────────────────────────────────────────────────────────
 *  Merge & normalize utilities
 *  ────────────────────────────────────────────────────────────────────────────
 */

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function mergeMeta(
  base: MetaV2Data,
  patch: DeepPartial<MetaV2Data>,
): MetaV2Data {
  // Top-level scalars
  const version = 2 as const;
  const nextSessionSeq =
    patch.nextSessionSeq !== undefined
      ? patch.nextSessionSeq
      : base.nextSessionSeq;

  // State: per-subsystem merge
  const state: MetaV2Data['state'] = { ...base.state };

  if (patch.state) {
    for (const [ss, pVal] of Object.entries(patch.state)) {
      const cur = state[ss] ?? {};
      const next: any = { ...cur };

      if (pVal?.backend !== undefined) next.backend = pVal.backend;

      // applied: union arrays per collection
      if (pVal?.applied) {
        next.applied = { ...(cur as any).applied };
        for (const [col, arr] of Object.entries(pVal.applied)) {
          const existing = new Set<string>(
            (next.applied?.[col] ?? []) as string[],
          );
          for (const id of arr ?? []) existing.add(id);
          next.applied[col] = Array.from(existing);
        }
      }

      // checkpoints: shallow merge by key
      if (pVal?.checkpoints) {
        next.checkpoints = { ...(cur as any).checkpoints, ...pVal.checkpoints };
      }

      // fingerprints: shallow merge by id
      if (pVal?.fingerprints) {
        next.fingerprints = {
          ...(cur as any).fingerprints,
          ...pVal.fingerprints,
        };
      }

      // mirror: shallow merge (advisory only)
      if (pVal?.mirror) {
        next.mirror = { ...(cur as any).mirror, ...pVal.mirror };
      }

      state[ss] = next;
    }
  }

  return { version, nextSessionSeq, state };
}

/**
 * Dedupe/sort arrays under `state.*.applied.*` for stability.
 * - sessions: lexicographic sort (works for filenames)
 * - seasons: chronological sort (using compareSeasonIds)
 */
function normalizeMeta(meta: MetaV2Data): MetaV2Data {
  const out: MetaV2Data = JSON.parse(JSON.stringify(meta)); // simple deep clone

  for (const ss of Object.keys(out.state)) {
    const applied = out.state[ss].applied;
    if (!applied) continue;

    for (const col of Object.keys(applied)) {
      const arr = applied[col] ?? [];
      const deduped = Array.from(new Set(arr));

      // Use chronological sort for seasons, lexicographic for everything else
      if (col === 'seasons') {
        deduped.sort((a, b) => compareSeasonIds(a, b));
      } else {
        deduped.sort(); // Lexicographic sort
      }

      applied[col] = deduped;
    }
  }

  return out;
}
