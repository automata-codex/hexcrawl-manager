# Implementation Plan: Region & Faction Territory Outlines on the Map

**Spec:** `docs/specs/37-region-outlines-on-map.md`
**Branch:** `region-outlines-on-map` (off `develop`)
**Working style:** Each Part below is sized to land as **one focused commit** with a
pause for manual code review before moving on. Parts are ordered so each builds and
passes CI on its own; nothing later breaks if you stop after any Part.

---

## The one invariant not to get wrong

`region.hexes[]` is a **partition** (exhaustive, unique, drives terrain/biome
defaults, validated for uniqueness). `faction.hexes[]` is a **claim** (overlapping,
non-exhaustive, pure overlay, drives nothing). Same `string[]` shape, opposite
contract. The contract is encoded by:

- Schema `.describe()` text (Part 1).
- **Not** pointing the region uniqueness validator at faction hexes (Part 6).

The region validator (`apps/web/scripts/validate-map.ts`) already iterates
`region.hexes` only — it is *not* generalized to "any `.hexes` field." Part 6's main
job is to **confirm** that and add a *separate*, claim-shaped validator for factions.

---

## Codebase reality check (deltas from the spec's wording)

The spec was written before final code inspection. These are accurate as of this
plan — the Parts below use the real names:

| Spec says | Actual code |
|---|---|
| `getHexNeighbors` | `getNeighborCoords(coord: HexCoord): HexCoord[]` in `packages/core/src/coordinates/geometry.ts` (returns 6, unfiltered, already directional) |
| "axial deltas `HEX_EDGE_DIRECTIONS`" | Core uses **offset** coords (`{col,row}`) with parity-dependent `NEIGHBOR_OFFSETS`. No need to add a new direction constant — reuse `getNeighborCoords`. |
| `map-config.ts` styling | `REGION_BORDER_COLOR`/`WIDTH` live in `apps/web/src/utils/interactive-map.ts` (Part 4) |
| Phase 4 touches `layer-visibility.ts` | **No code change needed there.** New layers register purely via `map.yaml`; the store already merges campaign layers. The component just reads `$layerVisibility[key]`. |
| `getRegionShortTitle` | `apps/web/src/utils/regions.ts` |
| API auth | `getCurrentUserRole(locals)` + `SECURITY_ROLE.GM` from `apps/web/src/utils/{auth,constants}.ts`; mirror `apps/web/src/pages/api/dungeons.json.ts` |

**Two `map.yaml` files:** the code repo's `/data/map.yaml` is the small sample/dev
dataset (4×4, numeric notation); real campaign data is in `../skyreach` via
`ACHM_DATA_PATH`. Layer registration is a *data* edit and happens in both places
(sample in Part 5 for local rendering; real campaign in Part 7).

**The one real risk — coordinate seam (Part 2 ↔ Part 4).** Core boundary topology is
in offset coords; the web projects pixels via `axialToPixel(q,r)` (treats `q=col,
r=row`; flat-topped, even-q). Edge `i` from core must line up with the right pixel
vertex pair. The alignment is worked out for you in Part 4 — but **verify it visually**,
it's the thing most likely to be a hex-rotation off.

---

## Cross-cutting: definition of done for every code-repo Part

Run before requesting review:

```bash
npm run build          # or build:force if package outputs are stale
npm run typecheck
npm run lint
npm test               # at minimum the package(s) you touched
npm run arch:check     # dependency-cruiser boundaries
```

**Changesets:** the spec only calls for one in Phase 1, but `@achm/schemas`,
`@achm/core`, and `@achm/web` are all versioned. Recommendation: add **one combined
changeset** in Part 1 covering the whole feature (matching the existing
`.changeset/*.md` format), e.g. `@achm/schemas: minor`, `@achm/core: minor`,
`@achm/web: patch`. Don't sprinkle three separate ones unless you intend separate PRs.

---

## Part 1 — Schema: faction territory fields

**Package:** `@achm/schemas` · **Commit:** `feat(schemas): add faction territory hex membership`

**File:** `packages/schemas/src/schemas/faction.ts`

Add two optional fields to `FactionSchema` (use `.describe()` per the spec — match the
existing `plotlines` field's `.optional().describe(...)` style in this same file):

- `hexes: z.array(z.string()).optional().describe(...)` — the long claim-vs-partition
  description verbatim from the spec (the "Do NOT apply region-style
  uniqueness/coverage validation" sentence is load-bearing; keep it).
- `mapColor: z.string().optional().describe('Outline color for this faction's territory on the interactive map (CSS color).')`

Do **not** touch `areaOfOperation` (stays the coarse "where they operate" concept).

**Then:**
- `npm run build` (runs `tsc -b` then `build:json-schemas`; a plain
  `build:json-schemas` reads the *stale* compiled `dist/index.js`, so do a full build).
  This regenerates `packages/schemas/dist/faction.schema.json` + manifest, but
  `dist/` is **gitignored** — the schemas are build output, nothing to commit there.
  Only the `faction.ts` source change ships.
- Add the combined changeset (see cross-cutting note).

**Review checklist:** describe text present and contract-correct; JSON schema regen
committed; no change to `areaOfOperation`; `FactionData` type still compiles.

---

## Part 2 — Core: perimeter helper + tests

**Package:** `@achm/core` · **Commit:** `feat(core): add hex group perimeter helper`

**File:** new module beside the coordinate utilities, e.g.
`packages/core/src/coordinates/perimeter.ts`, exported from
`packages/core/src/coordinates/index.ts` and the package barrel.

```ts
export interface PerimeterEdge {
  hexId: string;
  edge: number; // 0–5, indexes the getNeighborCoords() direction order
}

export function getPerimeterEdges(
  hexIds: string[],
  notation: CoordinateNotation,
  mapConfig?: MapConfig, // accepted for signature/forward-compat; not needed for boundary logic
): PerimeterEdge[];
```

**Algorithm (pure, order-independent):**
1. Parse each input ID to a `HexCoord` (`parseHexId`); build a membership `Set`
   keyed by a **coordinate string** like `` `${col},${row}` `` — *not* by formatted
   hex ID. This avoids `formatHexId` throwing on negative/out-of-bounds neighbor
   coords and makes out-of-bounds neighbors fall out as boundaries for free.
2. For each member hex, call `getNeighborCoords(coord)` → 6 neighbors in fixed order.
   For each index `i` in 0–5, if the neighbor's coord key is **not** in the Set, emit
   `{ hexId, edge: i }` (use the original input ID string for `hexId`).

`edge: i` is defined by `getNeighborCoords`'s order, which is geometrically consistent
across column parity (the parity-dependent `NEIGHBOR_OFFSETS` exist precisely to keep
direction-per-index stable). This is the single source of truth Part 4 aligns to.

**Tests** — `packages/core/src/coordinates/perimeter.spec.ts` (mirror
`coordinates.spec.ts`, Vitest unit mode):
- Single hex → 6 edges.
- 2×2 contiguous block → interior shared edges excluded (assert the reduced count, not 24).
- Group with a one-hex hole → inner-ring edges present.
- Two disjoint blobs → two separate rings (counts add up).
- Hex on the grid edge → out-of-bounds neighbors counted as boundary.
- Both notations (`letter-number` and `numeric`).

**Review checklist:** no I/O imports (passes `arch:check` — core stays pure); membership
keyed by coord not formatted ID; all six test scenarios present and green; barrel exports
`PerimeterEdge` + `getPerimeterEdges`.

---

## Part 3 — Web: faction territory API endpoint

**App:** `apps/web` · **Commit:** `feat(web): add map territories endpoint`

**File:** `apps/web/src/pages/api/map-territories.json.ts`

Mirror `apps/web/src/pages/api/dungeons.json.ts`:
- `GET: APIRoute`; read role via `getCurrentUserRole(locals)`.
- If `role !== SECURITY_ROLE.GM`, return `[]` (faction territory is GM-only — match how
  `dungeons.json.ts` returns empty for non-GM rather than 403).
- Load factions via `getCollection('factions')`; for each faction with a **non-empty**
  `hexes`, emit:

```ts
type MapTerritory = { id: string; name: string; color: string; hexes: string[] };
```

`color = faction.mapColor ?? <sensible fallback>` (pick one default; document it inline).

**Review checklist:** GM-gated; only non-empty-`hexes` factions returned; fallback color
defined; shape matches what Part 5 consumes.

---

## Part 4 — Web: pixel-projection helpers

**App:** `apps/web` · **Commit:** `feat(web): add perimeter pixel projection helpers`

**File:** `apps/web/src/utils/interactive-map.ts`

Add (alongside `axialToPixel`, `HEX_WIDTH`, `HEX_HEIGHT`, `HEX_RADIUS`):

```ts
export const REGION_BORDER_COLOR = '<reference orange>';
export const REGION_BORDER_WIDTH = <px>;

// 6 vertex offsets from hex center, ordered so edge i spans vertex i → vertex (i+1)%6
export const HEX_VERTICES: ReadonlyArray<{ dx: number; dy: number }> = [...];

export function perimeterEdgesToSegments(
  edges: PerimeterEdge[],
  notation: CoordinateNotation,
): Array<{ x1: number; y1: number; x2: number; y2: number }>;

export function centroidOf(
  hexIds: string[],
  notation: CoordinateNotation,
): { x: number; y: number };
```

**Vertex ordering (derived from current `NEIGHBOR_OFFSETS` + `axialToPixel`; verify
visually).** `getNeighborCoords` index → geometric direction is:

`0:NW  1:N  2:NE  3:SE  4:S  5:SW` (clockwise).

For a flat-topped hex of radius `HEX_RADIUS`, that makes the aligned vertex offsets
(center-relative, screen y-down), edge `i` = `HEX_VERTICES[i] → HEX_VERTICES[(i+1)%6]`:

| i | vertex (angle) | dx, dy |
|---|---|---|
| 0 | left (180°)        | `(-R, 0)` |
| 1 | upper-left (240°)  | `(-R/2, -H/2)` |
| 2 | upper-right (300°) | `(+R/2, -H/2)` |
| 3 | right (0°)         | `(+R, 0)` |
| 4 | lower-right (60°)  | `(+R/2, +H/2)` |
| 5 | lower-left (120°)  | `(-R/2, +H/2)` |

where `R = HEX_RADIUS`, `H = HEX_HEIGHT`. `perimeterEdgesToSegments`: for each
`{hexId, edge}`, project the hex center with `axialToPixel(parseHexId(hexId).col, .row)`,
then add `HEX_VERTICES[edge]` and `HEX_VERTICES[(edge+1)%6]` for the segment endpoints.
`centroidOf`: average the member-hex pixel centers.

**Optional but cheap:** a small `*.spec.ts` asserting a single-hex perimeter projects to
6 segments forming a closed loop, and `centroidOf([oneHex])` equals its center — catches
a mis-ordered vertex table without needing the browser.

**Review checklist:** edge→vertex pairing matches the table; a single hex's 6 segments
visually close into a hexagon (sanity-check in Part 5); constants exported.

---

## Part 5 — Web: render outlines (component + wiring)

**App:** `apps/web` · **Commit:** `feat(web): render region and faction territory outlines`

This is the heaviest Part; it's cohesive (everything needed to actually *see* outlines).
If you'd rather split it, the natural seam is "component file" vs "Map.svelte wiring."

**1. Component** — `apps/web/src/components/InteractiveMap/MapOutline.svelte` (parallels
`MapPath.svelte`):
- Props: `groups: Array<{ id: string; hexes: string[]; color: string; label?: string }>`,
  `layerKey: string`, `notation: CoordinateNotation`, plus stroke styling.
- Per group: `getPerimeterEdges(hexes, notation)` → `perimeterEdgesToSegments(...)`,
  render as `<line>` with `stroke-linecap="round"` / `stroke-linejoin="round"` (MVP — no
  path stitching). If `label`, render `<text>` at `centroidOf(hexes)` using `labelFont`.
- Wrap everything in a `<g>` gated by `$layerVisibility[layerKey]` (same pattern
  `MapPath` uses with `$layerVisibility[type]`).

**2. Wire into** `apps/web/src/components/InteractiveMap/Map.svelte`:
- **Region groups (derived, no fetch):** group the existing `hexes` (`HexPlayerData`
  already carries `regionId`/`regionName`) by `regionId`; `label = getRegionShortTitle(...)`;
  `color = REGION_BORDER_COLOR`. Render `<MapOutline layerKey="regionBorders" .../>`.
- **Faction groups:** in `onMount`, fetch `/api/map-territories.json` (returns `[]` for
  non-GM, so it's naturally empty for players); pass straight through. Render
  `<MapOutline layerKey="factionTerritory" .../>`.
- **Z-order:** place both `<g>` blocks **after** `MapPath`/tag-icon groups and **before**
  `#layer-player-mask` and `#layer-hex-labels` — outlines above terrain fills, hex labels
  on top.

**3. Layer registration — data, not code.** No edit to `layer-visibility.ts`. To render
locally, add the two layers to the **code repo's sample** `data/map.yaml` (the same YAML
block Part 7 adds to skyreach). Until those keys exist in the store,
`$layerVisibility['regionBorders' | 'factionTerritory']` is `undefined` → hidden, so this
step is what makes outlines appear.

**Verify locally:** `npm run dev`, log in as GM, toggle both layers; confirm region
outlines trace the partition and labels land near centroids. (For real campaign data,
point `ACHM_DATA_PATH` at `../skyreach` once Part 7 lands, or eyeball with sample data.)

**Review checklist:** segments close cleanly (Part 4 alignment confirmed by eye); region
outlines match the partition; faction fetch GM-gated and empty for players; z-order
correct; toggles persist via existing localStorage path.

---

## Part 6 — Prebuild validation for faction hexes

**App:** `apps/web` (scripts) · **Commit:** `feat(validation): validate faction hexes as overlay claim`

**File:** new `apps/web/scripts/validate-faction-hexes.ts`; register it in
`apps/web/scripts/prebuild.sh` next to the other `tsx scripts/validate-*.ts` steps.

Pattern after `validate-faction-ids.ts` (load factions via `resolveDataPath('factions')`
+ YAML) and reuse `validate-map.ts`'s bounds logic:
- For each faction's `hexes`, each ID must be well-formed and in-bounds — `isValidHex` /
  `isOutOfBounds` from `@achm/core` against `loadMapConfig()`'s grid + `outOfBounds`.
- **Allow overlaps across factions** — do *not* dedupe-check (that's a region rule).
- Match the existing error-report format (`Faction {id}: ...`) and non-zero exit on error.

**Confirm (and note in the commit/PR) the region validator is not generalized:**
`validate-map.ts` iterates `region.hexes` only (`if (!region.hexes) continue;`) and
factions have no bearing on it — no change needed there, just verify.

**Review checklist:** rejects an out-of-bounds faction hex; **accepts** an overlapping
one; region uniqueness validator untouched and still region-only; wired into prebuild.

---

## Part 7 — Data (skyreach repo, separate PR/commits)

**Repo:** `../skyreach` · **Commit:** `feat(data): add faction territory for Revenant Legion and Stoneclan`

Per the usual code/data split, this is separate from Parts 1–6. Use the `skip-changeset`
label if data-only.

- Add both layers to skyreach `data/map.yaml` (top of file lists top-most layer first;
  the store reverses for render order):
  ```yaml
  - key: regionBorders
    label: Region Borders
    defaultVisible: false
    scopes: [gm:view]
  - key: factionTerritory
    label: Faction Territory
    defaultVisible: false
    scopes: [gm:view]
  ```
  (To make region borders player-visible later, drop `scopes` from `regionBorders` — no
  code change.)
- Populate `hexes` + `mapColor` on the relevant factions (Revenant Legion, Stoneclan, …).

**Review checklist:** layers present + GM-scoped; faction hexes pass Part 6's validator;
outlines render against real data with `ACHM_DATA_PATH=../skyreach`.

---

## Sequencing & dependencies

```
Part 1 (schema) ──┬─► Part 3 (endpoint) ──┐
                  └─► Part 6 (validation) │
Part 2 (core) ──────► Part 4 (web helpers)┼─► Part 5 (render) ──► Part 7 (data)
```

- Parts 1 and 2 are independent and could be done in either order.
- Part 3 needs Part 1 (`faction.hexes`). Part 4 needs Part 2 (`PerimeterEdge`).
- Part 5 needs Parts 2, 3, 4. Part 6 needs Part 1. Part 7 (data) is last and is what
  makes everything render against the real campaign.

## Testing checklist (from the spec — map to the Parts that satisfy each)

- [ ] Core perimeter unit tests pass (both notations, holes, disjoint, grid edge) — **Part 2**
- [ ] Every region outlined; shared borders may double-draw (acceptable MVP) — **Part 5**
- [ ] Region + faction outlines GM-only; hidden for players — **Parts 3, 5, 7**
- [ ] Overlapping faction claims both render — **Parts 5, 7**
- [ ] Centroid labels land inside typical convex regions; note bad concave/disjoint cases — **Part 5**
- [ ] Layer toggles persist via existing localStorage — **Part 5**
- [ ] Prebuild rejects an out-of-bounds faction hex, accepts an overlapping one — **Part 6**

## Explicitly deferred (YAGNI — not in this work)

Per-faction toggles; `labelAnchor`/`labelRotation` overrides; stitched continuous
`<path>`; insetting overlapping outlines; themeable region color/width via `map.yaml`.
