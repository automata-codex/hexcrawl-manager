# Meta v2 Spec

## Goals

* Make the meta file future-proof for multiple `apply*` subsystems.
* Be explicit about **where state is authoritative** (`backend`), while keeping human-readable, per-subsystem blocks.
* Support resumability (checkpoints), idempotency (applied sets), and optional integrity (fingerprints).

## File identity

* Path: unchanged (whatever your current `meta.yaml` path is).
* Format: YAML (UTF-8).
* Versioning: top-level `version: 2` (integer).

  * Writers MUST write `2`; readers SHOULD accept `1|2` and upgrade in memory.

## Top-level shape

```yaml
version: 2
state:
  <subsystem>:
    backend: meta | ledger | external
    applied:        # OPTIONAL; authoritative only if backend=meta
      <collectionName>: string[]   # e.g., sessions, files, hexes, batches
    checkpoints:    # OPTIONAL; resumability hints; names are subsystem-defined
      <key>: <value>
    fingerprints:   # OPTIONAL; integrity map for items in `applied`
      <id>: "sha256:<hex>"
    mirror:         # OPTIONAL; when backend != meta, keep helpful mirrors here
      lastMirrorAt: <ISO8601>
      info:         # OPTIONAL; freeform object, e.g. counts, last ids
        ...
```

### Subsystems (current + expected)

* `trails`: `backend: meta` (uses `applied.sessions[]`)
* `ap`: `backend: ledger` (no authoritative data in meta)
* `hexes` (future): likely `backend: meta` (e.g., `applied.files[]`)

> **Naming:** Subsystem keys are lowercase, kebab-free, alphanumeric. Collection names are plural snake-case or simple plurals (e.g., `sessions`, `files`, `hexes`).

## Examples

### Minimal (trails + ap)

```yaml
version: 2
state:
  trails:
    backend: meta
    applied:
      sessions:
        - session-0007
        - session-0008
    checkpoints:
      lastSweepAt: "2025-10-11T14:22:10Z"
  ap:
    backend: ledger
    mirror:
      lastMirrorAt: "2025-10-10T23:05:01Z"
```

### With fingerprints + future hexes

```yaml
version: 2
state:
  trails:
    backend: meta
    applied:
      sessions: [session-0008]
    fingerprints:
      session-0008: "sha256:8d0d3b4..."
    checkpoints:
      lastSweepAt: "2025-10-12T09:00:00Z"
  hexes:
    backend: meta
    applied:
      files: ["hexes-2025-09.yaml"]
    checkpoints:
      lastAppliedChunk: "region-08"
  ap:
    backend: ledger
    mirror:
      lastMirrorAt: "2025-10-12T08:45:00Z"
      info:
        entriesTotal: 142
        lastSessionId: "session-0009"
```

## Semantics

### `backend`

* `meta`: Meta is the **source of truth** for that subsystem’s apply state.
* `ledger`: Truth lives in a durable log elsewhere; meta SHOULD NOT be used to skip work, only to cache mirrors or hints.
* `external`: Truth lives outside the repo (db, service). Treat like `ledger` for local behavior.

### `applied`

* Presence implies idempotency gate for `backend: meta`.
* Keys under `applied` (e.g., `sessions`, `files`) are **sets of identifiers** (unique strings). Order is irrelevant.
* Writers SHOULD de-dupe on write.

### `checkpoints`

* O(1) resume hints (e.g., a cursor, last processed partition/region).
* Keys are subsystem-defined; values MUST be scalars or simple strings (keep it YAML-safe).
* Checkpoints are **hints**, not authoritative proofs of completion.

### `fingerprints`

* Optional content hashes for items in `applied`.
* If present and mismatched on re-scan, the subsystem MAY invalidate the corresponding id (implementation choice: drop from `applied` or mark drift in a separate key) and re-apply.

### `mirror`

* Only for non-meta backends.
* `lastMirrorAt`: when local mirror was refreshed.
* `info`: arbitrary summary helpful for UX/logging; MUST NOT be treated as an idempotency gate.

## Validation rules (normative)

* `version` MUST equal `2`.
* `state` MUST exist and be a mapping.
* Each subsystem MUST include `backend`.
* If `backend: meta`:

  * `applied` MAY be absent (treated as empty), but when present MUST be a mapping of string → string[].
  * `fingerprints` MAY be present; if so, keys MUST be ids present in some `applied.*` array.
* If `backend != meta`:

  * Writers MUST NOT rely on `applied` for gating; if present, treat as advisory.
* All timestamps MUST be RFC3339/ISO8601 UTC or with offset.

## Zod schema (concise)

```ts
import { z } from "zod";

const IsoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/
);

const Backend = z.enum(["meta", "ledger", "external"]);

const AppliedCollections = z.record(z.array(z.string().min(1))).optional();
const Fingerprints = z.record(z.string().regex(/^sha256:[0-9a-fA-F]+$/)).optional();

const Mirror = z.object({
  lastMirrorAt: IsoDate,
  info: z.record(z.any()).optional(),
}).partial().refine(obj => "lastMirrorAt" in obj, { message: "mirror.lastMirrorAt required if mirror present" });

const SubsystemState = z.object({
  backend: Backend,
  applied: AppliedCollections,
  checkpoints: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  fingerprints: Fingerprints,
  mirror: Mirror.optional(),
}).strict();

export const MetaV2Schema = z.object({
  version: z.literal(2),
  state: z.record(SubsystemState),
}).strict();
```

## Reader/writer behavior

### Reading

1. Parse YAML → object.
2. If `version === 1`, run migration (below) to in-memory v2 shape.
3. Validate with `MetaV2Schema`. On failure:

  * Log structured error with pointer to invalid field.
  * Offer safe default for `applied` as empty set when `backend: meta` (configurable).

### Writing

* Preserve unknown subsystem blocks (round-trip).
* Sort keys for stability (`version`, `state` at top; within each subsystem: `backend`, `applied`, `checkpoints`, `fingerprints`, `mirror`).
* Ensure deduped arrays and deterministic ordering (e.g., lexicographic) to minimize diff churn.

## Migration from v1 (expected current)

**Assumptions for v1** (adjust in code as needed):

* Trails used something like:

  ```yaml
  appliedSessions: [session-0001, session-0002]
  lastSweepAt: "..."
  ```

**Transform → v2:**

```ts
function migrateV1ToV2(v1: any): MetaV2 {
  const trailsApplied = v1.appliedSessions ?? [];
  const lastSweepAt = v1.lastSweepAt;

  const trailsBlock: any = {
    backend: "meta",
    applied: { sessions: [...new Set(trailsApplied)] },
  };
  if (lastSweepAt) trailsBlock.checkpoints = { lastSweepAt };

  return {
    version: 2,
    state: {
      trails: trailsBlock,
      // ap known in v1 as implicit external state:
      ap: { backend: "ledger" },
    },
  };
}
```

* Writers MAY keep a `meta.v1.backup.yaml` the first time they upgrade on disk.

## Helper API (thin layer)

```ts
// Read & validate (auto-migrate v1 → v2 in memory)
async function readMeta(): Promise<MetaV2>;

// Write pretty/stable YAML
async function writeMeta(meta: MetaV2): Promise<void>;

// Subsystem helpers (backend-aware)
function getApplied(meta: MetaV2, subsystem: string, collection: string): Set<string>;
function addApplied(meta: MetaV2, subsystem: string, collection: string, ids: string[]): void;
function setCheckpoint(meta: MetaV2, subsystem: string, key: string, value: string|number|boolean): void;
function setFingerprint(meta: MetaV2, subsystem: string, id: string, hash: string): void;
function getBackend(meta: MetaV2, subsystem: string): "meta"|"ledger"|"external";
```

## `apply*` contract (caller responsibilities)

* MUST check `backend`:

  * If `meta`: use `applied` as the idempotency source of truth.
  * If `ledger|external`: consult authoritative store; meta is advisory only.
* SHOULD update `checkpoints` frequently and `applied` atomically when a unit completes.
* MAY set `fingerprints` after computing a content hash.
* MUST flush meta to disk after each batch/transaction (or at safe checkpoints).

## Concurrency & integrity

* If parallel `apply*` is possible, use a file lock or retry-with-backoff strategy.
* Writers should write to a temp file + atomic rename to avoid partial writes.
* Consider a `metaChecksum` (out of scope for v2 core; optional extension later).
