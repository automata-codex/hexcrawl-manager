# Spec: Lost Valley Barrier Hex Tag

## Goal

Introduce a `lost-valley-barrier` hex tag. When a hex carries this tag, the GM
views surface a prominent warning banner:

> ⚠️ Hex is impassable. Access to the Lost Valley is only through L3 or P3. ⚠️

The banner appears in **two** GM-facing places:

1. The interactive map's detail pane (`DetailPanel.svelte`).
2. The hex detail page's GM view (`GmHexDetails.svelte`).

This spec also folds in a logged follow-up from
`docs/specs/36-beat-tag-vocabulary.md` (line 25): relocating the hex tag
vocabulary out of the schema and into the data repo's `tags.yaml`, guarded by a
warnings-only validator that mirrors the beat-tag lifecycle.

The work is split into two independently shippable scopes:

- **Scope A** — add the tag + GM-only rendering. Small (~½ day).
- **Scope B** — Scope A *plus* relocating the hex vocabulary with validation.
  Medium (~1.5–2 days total).

Scopes are sequenced so A is never throwaway: the tag behaves identically
whether its vocabulary lives in the schema or in `tags.yaml`.

## Confirmed decisions

- **Audience: GM-only.** The warning is not shown to players. This avoids any
  data-loader plumbing — the GM payload already carries `tags`, and both render
  sites already gate on GM role. (Extending to players later is a follow-up; it
  would require passing a derived flag through the player-redacted branches of
  `hexes.json.ts`.)
- **Vocabulary move: relocate + validate.** Match the existing `beat` vocabulary
  lifecycle (YAML source of truth + warnings-only validator with a strict env
  gate), not a bare relocation.

## Current state (verified)

- Hex tag vocabulary: `packages/schemas/src/schemas/hex.ts:142` — `KnownTagEnum`
  (10 tags). `TagSchema = z.union([KnownTagEnum, z.string()])` (line 165) is
  **non-enforcing**: the `z.string()` fallback already accepts any string, so the
  enum is documentation/autocomplete only.
- `KnownTag` type (`hex.ts:260`) has **no consumers** outside its own definition
  (confirmed by grep); only generated `docs/api/CATALOG.md` references the enum.
- GM hex payload already includes `tags`:
  `apps/web/src/pages/api/hexes.json.ts:82` spreads the full `data` for GMs. The
  player-redacted branches (visited/scouted/unknown) intentionally drop `tags`.
- Map detail pane already GM-gates content:
  `apps/web/src/components/InteractiveMap/DetailPanel.svelte:137`
  (`canAccess(role, [SCOPES.GM])`). `currentHex` is typed `HexPlayerData`, which
  includes `tags`.
- Hex page GM view is rendered inside `SecretContent` (GM-only):
  `apps/web/src/pages/session-toolkit/hexes/[id].astro:122` →
  `GmHexDetails.svelte`.
- Reusable warning-banner pattern already exists in `GmHexDetails.svelte` (the
  "Updates" `.warning` box, ~lines 44-53 markup + ~119-135 CSS). Reuse it.
- `tags.yaml` precedent: `data/tags.yaml` holds a `beat` vocabulary, validated by
  `apps/web/scripts/validate-tags.ts` + `apps/web/scripts/tags-analyzer.ts`
  (`parseBeatVocabulary`, `analyzeBeatTags`, warnings-only, `ACHM_STRICT_TAGS=1`
  strict gate). The file structure already anticipates sibling vocab keys.
- JSON schemas are generated from Zod via
  `packages/schemas/src/build-json-schemas.ts` (`npm run build:json-schemas`).

---

## Scope A — Tag + GM-only rendering

### Phase A1 — Schema

**File:** `packages/schemas/src/schemas/hex.ts`

Add `'lost-valley-barrier'` to `KnownTagEnum` (line 142). Regenerate JSON
schemas (`npm run build:json-schemas`) so `hex.schema.json` reflects the new
value. Refresh `docs/api/CATALOG.md` if a doc-gen step covers it. Add a
changeset (patch — additive enum value).

**Commit:** `feat(schemas): add lost-valley-barrier hex tag`

### Phase A2 — Shared constant

**File:** `apps/web/src/utils/constants.ts`

Define the tag literal and the banner message once, so the two render sites stay
in sync:

```ts
export const LOST_VALLEY_BARRIER_TAG = 'lost-valley-barrier';
export const LOST_VALLEY_BARRIER_MESSAGE =
  '⚠️ Hex is impassable. Access to the Lost Valley is only through L3 or P3. ⚠️';
```

### Phase A3 — Hex detail page (GM)

**File:** `apps/web/src/components/GmHexDetails/GmHexDetails.svelte`

Add a conditional banner near the top of the component, reusing the existing
`.warning` box styling:

```svelte
{#if hex.tags?.includes(LOST_VALLEY_BARRIER_TAG)}
  <p class="warning">{LOST_VALLEY_BARRIER_MESSAGE}</p>
{/if}
```

This is already GM-only because the component renders inside `SecretContent` on
the hex detail page. No change to `[id].astro` or `PlayerHexDetails.astro`.

### Phase A4 — Map detail pane (GM)

**File:** `apps/web/src/components/InteractiveMap/DetailPanel.svelte`

Add the same banner inside the existing GM-gated region (the
`canAccess(role, [SCOPES.GM])` block), keyed off the selected hex's tags:

```svelte
{#if canAccess(role, [SCOPES.GM]) && currentHex?.tags?.includes(LOST_VALLEY_BARRIER_TAG)}
  <p class="warning">{LOST_VALLEY_BARRIER_MESSAGE}</p>
{/if}
```

`currentHex.tags` is present on the GM payload — **no `hexes.json.ts` change
needed.** Port the `.warning` CSS rule into this component (or a shared style) to
match the page banner.

**Commit (A2–A4):** `feat(web): show impassable warning for lost-valley-barrier hexes`

### Phase A5 — Data (DATA repo: `skyreach`, separate commit)

Add `lost-valley-barrier` to the `tags` of the relevant barrier hex(es) in
`data/hexes/*.yml`. Data-only; use the `skip-changeset` label per the usual
code/data split.

**Commit:** `feat(data): tag Lost Valley barrier hexes`

---

## Scope B — Relocate hex vocabulary to `tags.yaml` (with validation)

Builds on Scope A. Order B after A so the warning ships first.

### Phase B1 — Vocabulary data

**File (DATA repo):** `data/tags.yaml`

Add a sibling `hex:` key listing the existing 10 tags plus `lost-valley-barrier`:

```yaml
hex:
  - crystal-bounty
  - dungeon
  - settlement
  - dragon-ruins
  - fc-city
  - fc-ruins
  - goblin-ruins
  - haven
  - landmark-known
  - scar-site
  - lost-valley-barrier
```

### Phase B2 — Schema: drop the enum

**File:** `packages/schemas/src/schemas/hex.ts`

- Remove `KnownTagEnum` (line 142) and the `KnownTag` type (line 260).
- Simplify `TagSchema` to `z.string()` and the hex `tags` field to
  `z.array(z.string())`. Runtime behavior is unchanged (the schema was already
  non-enforcing); the data file is now the source of truth.
- Regenerate JSON schemas and refresh `docs/api/CATALOG.md`. Add a changeset.

Verify nothing imports `KnownTagEnum`/`KnownTag` (grep currently shows only
self-references). Replace the `'lost-valley-barrier'` literal in the web
components with the `LOST_VALLEY_BARRIER_TAG` constant from Phase A2 (already the
case), so dropping the enum is safe.

**Commit:** `refactor(schemas): move hex tag vocabulary to tags.yaml`

### Phase B3 — Generalize the validator

**Files:** `apps/web/scripts/tags-analyzer.ts`, `apps/web/scripts/validate-tags.ts`

- Generalize `parseBeatVocabulary(doc)` → `parseVocabulary(doc, key)` (keep a
  thin `parseBeatVocabulary` wrapper, or update its one caller).
- Generalize `analyzeBeatTags(beats, vocab)` to operate on generic tagged items
  (`{ id: string; tags?: string[] }`), preserving the group-by-tag report shape.
- Add a hex-tag loader (read `data/hexes/*.yml` via `resolveDataPath('hexes')`;
  region-defined hexes without files carry no tags, so skip them) and wire a
  `hex`-domain check into `validate-tags.ts` (or a sibling
  `validate-hex-tags.ts`). Warnings-only, reusing the `ACHM_STRICT_TAGS` gate.
- Hook it into the same build/validate step that runs the beat validator (see
  the `build:web` / prebuild scripts).

**Commit:** `feat(validation): validate hex tags against tags.yaml vocabulary`

### Phase B4 — Tests & docs

- Extend `tags-analyzer` unit tests for the generalized parser/analyzer (hex
  domain cases: in-vocab passes, off-vocab flagged and grouped).
- Update `CLAUDE.md` to note the hex vocabulary now lives in `tags.yaml`.
- Close the follow-up note in `docs/specs/36-beat-tag-vocabulary.md:25`.

**Commit:** `test+docs: cover hex tag vocabulary relocation`

---

## LOE estimate

| Scope | Effort | Time |
|-------|--------|------|
| **A** — tag + GM-only rendering | Small | ~2–4 hrs (½ day) |
| **B** — A + relocate vocab with validation | Medium | ~1.5–2 days total (move adds ~1–1.5 days) |

**Why A is small:** one-line schema edit; reuses an existing banner pattern; the
GM-only decision eliminates loader plumbing; work is mostly wiring the same
banner into two components.

**Why B adds ~1–1.5 days:** generalizing the analyzer/validator, adding a hex
loader, cleanly dropping the enum, regenerating schemas/docs, and unit tests.
The existing beat-tag infrastructure removes the greenfield validator cost.

---

## Testing checklist

**Scope A:**
- [ ] `npm run typecheck && npm run lint && npm run build` clean.
- [ ] `hex.schema.json` includes `lost-valley-barrier`.
- [ ] In `npm run dev` as GM: tagging a hex `lost-valley-barrier` shows the ⚠️
  banner on both the map detail pane and the hex detail page.
- [ ] In a player session: no banner appears.
- [ ] An untagged hex shows no banner in either view.

**Scope B (additionally):**
- [ ] With `data/tags.yaml` `hex` key seeded, the validator reports zero
  off-vocabulary hex tags.
- [ ] An injected bogus hex tag is flagged, grouped by tag; `ACHM_STRICT_TAGS=1`
  fails the build on it.
- [ ] `npm test` passes (tags-analyzer unit tests).
- [ ] Hex YAML still validates after the enum is dropped (`validate-map.ts`).

---

## Deferred (not in this spec)

- Player-visible barrier warning (would require a derived flag through the
  player-redacted branches of `hexes.json.ts`).
- Migrating the **clue** `KnownTagEnum` (`packages/schemas/src/schemas/clue.ts:17`)
  to `tags.yaml` — same pattern, separate follow-up.
- A hex tag filter/dropdown UI driven by the relocated vocabulary.
- Map-level rendering of impassability (e.g. an icon or hatch on the map grid
  itself, beyond the detail pane).
