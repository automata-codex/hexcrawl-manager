# Meta v2 Spec

## Goals

* Make the meta file future-proof for multiple `apply*` subsystems.
* Be explicit about **where state is authoritative** (`backend`), while keeping human-readable, per-subsystem blocks.
* Support resumability (checkpoints), idempotency (applied sets), and optional integrity (fingerprints).

## File identity

* File path: `data/meta.yaml`
* Format: YAML (UTF-8).
* Versioning: `version: 2` (writers MUST emit 2; readers SHOULD accept v1 and migrate).

## Top-level shape (generic)

```yaml
version: 2
nextSessionSeq: <number>         # global counter shared by multiple commands
state:
  <subsystem>:
    backend: meta | ledger | external
    applied:        # OPTIONAL; authoritative only if backend=meta
      <collectionName>: string[]   # e.g., sessions, files, hexes, batches
    checkpoints:    # OPTIONAL; resumability hints; names are subsystem-defined
      <key>: <string|number|boolean>
    fingerprints:   # OPTIONAL; integrity map for items in `applied`
      <id>: "sha256:<hex>"
    mirror:         # OPTIONAL; summaries for non-meta backends
      lastMirrorAt: <ISO8601>
      info:         # OPTIONAL; freeform object, e.g. counts, last ids
```

### Semantics (generic)

* **`nextSessionSeq`**: global, monotonically non-decreasing integer used across commands (e.g., scribe/apply).
* **`backend`**:
  * `meta`: `applied` is the idempotency source of truth for that subsystem.
  * `ledger`/`external`: authoritative state is elsewhere; `meta` can hold mirrors/hints only.
* **`applied`**: set(s) of identifiers (order doesn’t matter). Writers SHOULD de-dupe and keep arrays stable.
* **`checkpoints`**: O(1) resume pointers. Scalar values only, subsystem-defined keys.
* **`fingerprints`**: if present, mismatch may trigger re-apply (implementation choice).
* **`mirror`**: diagnostics/summaries for non-meta backends; NEVER used to gate work.

### Validation (generic, normative)

* `version` MUST be `2`.
* `nextSessionSeq` MUST be a number.
* Each `state.<subsystem>` MUST include `backend`.
* If `backend = meta` and `applied` is present, it MUST be a mapping of string → string[].
* Timestamps (e.g., `lastMirrorAt`) MUST be RFC3339/ISO8601.

---

## Trails: one concrete implementation of the generic shape

The **trails** subsystem is a `meta`-backed implementation with two collections in `applied`.

```yaml
version: 2
nextSessionSeq: 27
state:
  trails:
    backend: meta
    applied:
      sessions: [session-0007, session-0008]  # sessions already processed by trails
      seasons: [1511-summer, 1511-spring]     # seasons already rolled by trails
    # checkpoints: {}                         # (optional) add if trails needs cursors
  ap:
    backend: ledger                           # example of a non-meta subsystem
```

* `state.trails.backend` is **`meta`** → `applied` is authoritative for trails’ idempotency.
* `applied.sessions[]` = formerly `appliedSessions` (v1).
* `applied.seasons[]`  = formerly `rolledSeasons` (v1).

---

## Zod schema (generic core, with trails as a consumer)

```ts
import { z } from "zod";

const IsoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/
);
const Backend = z.enum(["meta","ledger","external"]);

const GenericApplied = z.record(z.array(z.string())); // e.g. { sessions: [...], seasons: [...] }

const GenericSubsystem = z.object({
  backend: Backend,
  applied: GenericApplied.optional(),
  checkpoints: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  fingerprints: z.record(z.string().regex(/^sha256:[0-9a-fA-F]+$/)).optional(),
  mirror: z.object({
    lastMirrorAt: IsoDate,
    info: z.record(z.any()).optional(),
  }).partial().optional(),
}).strict();

export const MetaV2Schema = z.object({
  version: z.literal(2),
  nextSessionSeq: z.number(),
  state: z.record(GenericSubsystem),  // trails/ap/hexes/... all fit this
}).strict();
```

> If you want extra type safety for **trails**, create a **narrower** schema for that one subsystem in your app layer (e.g., enforce that `applied.sessions` and `applied.seasons` are the allowed collections), but keep the on-disk spec generic as above.

---

## v1 → v2 migration notes (how trails maps)

**v1:**

```ts
type MetaV1 = {
  appliedSessions: string[];
  nextSessionSeq: number;
  rolledSeasons: string[];
};
```

**→ v2 (generic container + trails implementation):**

```ts
export function migrateV1ToV2(v1: MetaV1) {
  const dedupe = (a?: string[]) => [...new Set(a ?? [])];
  return {
    version: 2 as const,
    nextSessionSeq: v1.nextSessionSeq,
    state: {
      trails: {
        backend: "meta" as const,
        applied: {
          sessions: dedupe(v1.appliedSessions),
          seasons:  dedupe(v1.rolledSeasons),
        },
      },
      ap: { backend: "ledger" as const }, // explicit example of a non-meta subsystem
    },
  };
}
```

---

## Reader/Writer guidance (generic)

* **Read** from `data/meta.yaml`; migrate v1→v2 in memory; validate with `MetaV2Schema`.
* **Write** always as v2 to `data/meta.yaml`, with de-duped arrays and stable key ordering.
* Use temp file + atomic rename to avoid partial writes if multiple commands touch meta.
