# Implementation Plan: Surface anchored beats in the CLI (alongside clues)

**Spec:** `docs/specs/39-cli-beat-surfacing.md`
**Branch:** `region-build-out-fixes` — this work rides along with that branch (confirmed
with Alex).
**Working style:** Each Part is sized to land as **one focused commit** with a pause for
manual review. Parts are ordered so each builds and passes CI on its own; nothing later
breaks if you stop after any Part. After Part 2 the feature is live; Part 3 hardens and
documents it.

This is a small change with one foundational sub-piece. It is **one branch, not a
multi-PR build** — the spec's "you are widening what the query returns, not adding new
entry points" is literally true for the surfacing once the beat data source exists, which
is what Part 1 builds.

---

## Two repos — read this first

This feature is **code-repo only** (`hexcrawl-manager`). It *reads* beat files from the
**data repo** (`../skyreach`, `ACHM_DATA_PATH=/Users/alexgs/projects/skyreach/data`) at
runtime, but adds no data-repo commits. Beats live at
`data/plotlines/<plotline-slug>/beats/<slug>.md` as Markdown with YAML frontmatter (57
files today, all `.md`).

**Changeset required.** The change touches `apps/cli` (`@achm/cli`) and `packages/data`
(`@achm/data`). The `Require Changeset` gate fires on `apps/`/`packages/` diffs in a PR to
`develop` (`.github/workflows/require-changeset.yml`). Add one with `npm run changeset`
(Part 3). No `skip-changeset` label here — this is shipped code.

---

## Codebase reality check (deltas from the spec's wording)

The spec is directionally right but assumes two things that aren't true as written. These
are verified against the code as of this plan.

| Spec says / implies | Actual code (verified) |
|---|---|
| "Schema brief must land first … do not start until `landmark.beats` / `hiddenSites[].beats` exist and validate." | ✅ **Already landed** — commits `89ac04bb` (schema) and `6a12ac4f` (web render). `BeatReferencesSchema` at `packages/schemas/src/schemas/hex.ts:66`; `beats` on `BaseHiddenSiteSchema` (`hex.ts:80`) and `LandmarkSchema` (`hex.ts:170`). **Unblocked.** |
| "reuse the same beat-ID resolution the schema validation uses (canonical `'beat'` LinkType format)" | The resolver is `apps/web/scripts/validate-hex-beat-refs.ts` — helpers `parseFrontmatter()`, `loadBeatIds()`, `beatAnchorsInHex()`. **Caveats:** (a) it's a *web script*, which the CLI **cannot import** (app→app boundary); (b) `loadBeatIds()` returns a **`Set<string>` of IDs only — no `status`**. Plan **lifts it to `packages/data` and extends it with status** (Part 1). |
| "widening what the query returns … same query, callers that already exist" | True for the *surfacing*, but the CLI has **no beat data source at all**. Clues are `.yaml` read by `readAndValidateYaml`; beats are Markdown frontmatter. A new loader is genuinely required (Part 1) before the "widen the query" framing applies. |
| "confirm the exact `PlotlineBeatStatusEnum` values" | `['pending', 'active', 'resolved', 'skipped']` (`packages/schemas/src/schemas/plotline.ts:7`). **Decision: `pending` + `active` surface; `resolved` + `skipped` suppress** (see Decisions). |
| Beat ID format | Canonical `plotlineSlug/beatSlug`, e.g. `istavan-and-the-mask/the-refugees-lament`. `loadBeatIds()` prefers frontmatter `plotline` + `slug` and falls back to the directory/filename, so a beat missing frontmatter still resolves. Mirror that. |

**The clue-surfacing path to mirror** is the `apps/cli/src/commands/scribe/lib/hex-alerts/`
module (barrel `index.ts`):

- `count-hex-alerts.ts` — pure. `HexAlerts { unknownClues, updates }`, `hasAlerts()`,
  `collectHexClueIds(hex)`, `countHexAlerts(hex, isClueUnknown)`.
- `get-hex-alerts.ts` — I/O. `getUnknownClueIds()` lazy-loads every clue YAML once into a
  `Set` (status only changes via data-repo edits, not mid-session); `getHexAlerts(hexId)`
  glues loader + pure counter.
- `format-hex-alerts.ts` — `formatHexAlertLines()` (count-only display) and
  `makeHexAlertNote()` (the session-log pause note).

**Callers (unchanged by this work):**

- `move.ts:97-99` — `for (const line of formatHexAlertLines(to, getHexAlerts(to))) info(line)`.
- Fast-travel: `plan-and-execute.ts:115-117` pre-loads `getHexAlerts(hex)` per route hex
  into `hexAlerts`; `fast-travel-runner.ts:203-213` emits `makeHexAlertNote` on arrival and
  `:264-270` pauses mid-route (`paused_hex_alert`) when `hasAlerts(alerts)`.

Because every caller consumes `getHexAlerts` / `HexAlerts` / `hasAlerts` /
`formatHexAlertLines` / `makeHexAlertNote`, **folding a `liveBeats` count into `HexAlerts`
delivers Decisions 1 and 2 with zero caller changes.** That is the cleanest shape and the
reason this is one small feature, not a parallel beats pipeline.

---

## Decisions locked (confirmed with Alex)

1. **Separate, labeled section.** Beats render as their own line, distinct from the clue
   line — not merged into the clue count.
2. **No de-duplication; surface on each hex and pause on it.** A beat anchored on multiple
   intervening hexes surfaces at each. This maps exactly onto the existing `paused_hex_alert`
   machinery — which is *why* `liveBeats` folds into `HexAlerts`: `hasAlerts()` then pauses
   on a beat-bearing hex for free, including a clue-free hex whose only reason to stop is a
   live beat.
3. **`pending` + `active` surface; `resolved` + `skipped` suppress.** A separate predicate
   from the clue `status: unknown` check — do not reuse it.

**Loader location (decided):** lift the frontmatter/ID helpers into **`packages/data`** as a
shared, exported beat loader, and (optionally) rebuild `validate-hex-beat-refs.ts`'s
`loadBeatIds()` on top of it. Rationale: the CLI can't import the web script; a shared loader
gives "read beats from the data repo" one home and kills the duplication. The lighter
alternative — copy `parseFrontmatter` into the CLI's `hex-alerts` module — is rejected
(two copies of the parse + ID logic, no shared home).

---

## Out of scope (intended, per spec — documented, not silent)

- **Temporal beats** (date-triggered) are not caught by a hex push and are correctly out of
  scope; they want a future session-open "what's due" calendar surface.
- **Relational/ambient beats** (faction/NPC-delivered, not location-anchored) aren't in any
  hex `beats` field and won't surface here; they belong to the faction-tidings channel.

---

## Cross-cutting: definition of done for every Part

Run before requesting review:

```bash
npm run build          # or build:force if package outputs are stale
npm run typecheck
npm run lint
npm test               # at minimum the package(s) you touched
npm run arch:check     # barrel-only imports; no deep imports / boundary breaks
```

Architecture guardrails to respect (`.dependency-cruiser.cjs`):

- The CLI imports the beat loader from the **`@achm/data` barrel** (`packages/data/src/index.ts`),
  never a deep path.
- `packages/data` may do I/O (it already reads YAML, Git, JSONL) and may depend on
  `@achm/schemas` for `BeatSchema` — both allowed.

---

## Part 1 — Shared beat loader in `packages/data`

**Goal:** give the codebase a single, validated way to read beats from the data repo,
keyed by canonical `plotlineSlug/beatSlug`, carrying `status`.

**Files:**

- `packages/data/src/repo-paths.ts` — add `PLOTLINES: () => resolveDataPath('plotlines')`
  to `REPO_PATHS`.
- `packages/data/src/beats.ts` *(new)* — export `loadBeats(): Map<string, BeatData>` (or
  the lighter `Map<string, PlotlineBeatStatus>` if only status is ever needed downstream —
  prefer returning `BeatData` for reuse). Behavior, ported from `validate-hex-beat-refs.ts`:
  - Recursively list `plotlines/**/beats/*.{md,mdx}` under `REPO_PATHS.PLOTLINES()`
    (filter on the `/beats/` path segment, exactly as `loadBeatIds()` does).
  - `parseFrontmatter(file)` — port the `---`-split + `yaml.parse` helper (the `yaml`
    package is already a dependency; no new dep, no Astro).
  - Validate frontmatter against `BeatSchema` (`@achm/schemas`). `status` defaults to
    `pending` in the schema, so a beat file with no explicit status still resolves as live.
  - Canonical ID: frontmatter `plotline`/`slug` preferred, directory/filename fallback —
    `` `${plotline}/${slug}` ``.
  - **Malformed frontmatter → skip that file** (try/catch per file), mirroring
    `getUnknownClueIds()`'s tolerance. Anchored beats are already guaranteed to resolve by
    the strict `validate:hex-beats` build gate, so runtime skips are a data-bug safety net,
    not the normal path.
- `packages/data/src/index.ts` — `export * from './beats.js'`.
- `packages/data/src/beats.spec.ts` *(new)* — unit-test ID construction (frontmatter vs
  fallback), status read, and malformed-file skip. Use the test-repo/sandbox fixtures
  pattern already used in `packages/data` tests.

**Optional within this Part (recommended):** refactor
`apps/web/scripts/validate-hex-beat-refs.ts` `loadBeatIds()` to derive its `Set<string>`
from `loadBeats()` (`new Set(loadBeats().keys())`). Keeps the validator and the CLI on one
source of truth. Skip if it balloons the diff; the validator already works.

**Ships on its own:** a new, unused export. Build + tests green, nothing else changes.

---

## Part 2 — Fold live beats into `HexAlerts` (the surfacing)

**Goal:** make `getHexAlerts` also count live anchored beats, render them on a separate
labeled line, and include them in the pause note — so `move` and fast-travel pick them up
with no caller edits.

**Files (all in `apps/cli/src/commands/scribe/lib/hex-alerts/`):**

- `count-hex-alerts.ts`:
  - Add `liveBeats: number` to `HexAlerts`.
  - `hasAlerts()` → also true when `liveBeats > 0`.
  - New `collectHexBeatIds(hex): string[]` — pull canonical IDs from `hex.landmark.beats`
    and each object-form `hex.hiddenSites[].beats`, deduped (port `beatAnchorsInHex`'s
    landmark + hidden-site walk; bare-string legacy hidden sites have no beats).
  - Extend `countHexAlerts(hex, isClueUnknown, isBeatLive)` to set
    `liveBeats: collectHexBeatIds(hex).filter(isBeatLive).length`. Keep the predicate
    injected so the counter stays pure and unit-testable without I/O.
- `get-hex-alerts.ts`:
  - Add `getLiveBeatIds(): Set<string>` — lazy cache built from `loadBeats()` (Part 1),
    keeping IDs whose status is in `LIVE_BEAT_STATUSES = new Set(['pending', 'active'])`
    **and** `campaignStatus === 'active'` (match the clue loader's campaign-status guard).
  - `getHexAlerts(hexId)` passes `(beatId) => liveBeats.has(beatId)` as the third arg.
- `format-hex-alerts.ts`:
  - `formatHexAlertLines` — add a **separate** line when `liveBeats > 0`, e.g.
    `` 🎭 ${alerts.liveBeats} live beat(s) anchored here — see hex ${hexId}. `` (Decision 1).
  - `makeHexAlertNote` — add a `${liveBeats} live beat(s)` clause to the parts list.
- `index.ts` — export `collectHexBeatIds` alongside `collectHexClueIds`.
- `count-hex-alerts.spec.ts` — extend for the new field, the beat predicate, the
  landmark + hidden-site collection, and `hasAlerts` firing on beats alone.

**Minor accuracy touch-ups** (so naming doesn't lie post-change):

- `fast-travel-runner.ts` comments at `:190-193` and `:242-246` say "unknown clues / GM
  updates" — broaden to mention beats. The `paused_hex_alert` status string stays (still
  an arrival alert); no new pause reason needed.

**Feature is live after this Part.** `move.ts:97-99` renders the beat line automatically;
fast-travel pre-loads it per hex and pauses on a live-beat hex via `hasAlerts`.

---

## Part 3 — Integration coverage + spec doc + changeset

**Goal:** lock Decision 2's behavior with a test, correct the spec, and gate the release.

- **Integration test** (scribe `*.spec-int.ts`, sandbox repo pattern): fast-travel a route
  through a hex whose **only** alert is a live (`pending`/`active`) beat — assert the run
  **pauses mid-route** (`paused_hex_alert`) and the session-log note names the beat. Add a
  negative case: a `resolved`/`skipped` beat does **not** pause. (Confirms beats ride the
  same pause path and the status predicate is correct.)
- **Spec update — `docs/specs/39-cli-beat-surfacing.md`:**
  - Fix the "reuse the resolver" line (§"Gating predicate") to point at
    `apps/web/scripts/validate-hex-beat-refs.ts`, noting it's lifted to `@achm/data`.
  - Record the three confirmed answers in "Confirm back to Alex": separate labeled section;
    no de-dup, pause per hex; `pending` + `active` surface.
  - Note the dependency is satisfied (`89ac04bb`, `6a12ac4f`).
- **Changeset:** `npm run changeset` — patch/minor for `@achm/cli` and `@achm/data`
  ("Surface live anchored beats on hex arrival in the scribe CLI, alongside clues").

---

## Suggested commit sequence

1. `feat(data): add shared beat loader (id → BeatData) reading plotline frontmatter`
2. `feat(scribe): surface live anchored beats on hex arrival alongside clues`
3. `test(scribe): cover fast-travel pause on a beat-only hex; update spec + changeset`

Each is independently buildable and CI-green. Pause for review after Parts 1 and 2.
