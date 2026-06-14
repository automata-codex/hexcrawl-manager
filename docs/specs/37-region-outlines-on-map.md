# Spec: Region & Faction Territory Outlines on the Interactive Map

## Goal

Render outlines around groups of hexes on the interactive map (the orange
region borders in the reference design), plus a centroid text label per group.
The same primitive serves two data sources:

- **Regions** — one outline per region, driven by `region.hexes[]`, uniform color.
- **Faction territory** — one outline per faction, driven by a new `faction.hexes[]`,
  color per faction, GM-only.

This is deliberately **one primitive, two feeds**. Everything hard lives in a
single perimeter helper; regions and factions differ only in where the hex set
and the color come from.

## Core principle: partition vs. claim

`region.hexes[]` is a **partition** — every hex belongs to exactly one region,
coverage is exhaustive, and it drives terrain/biome defaults and is validated for
uniqueness. `faction.hexes[]` is a **claim** — overlapping (contested hexes are a
feature), non-exhaustive, no defaulting, pure overlay. Same array-of-hex-ID shape,
opposite contract. The contract is encoded in the schema `.describe()` (Phase 1)
and enforced by *not* pointing the region uniqueness validator at faction hexes
(Phase 5). This is the single most important thing not to get wrong.

---

## Phase 1 — Schema (code repo: `@achm/schemas`)

**File:** `packages/schemas/src/schemas/faction.ts`

Add two optional fields to `FactionSchema`:

```ts
hexes: z
  .array(z.string())
  .optional()
  .describe(
    'Hex IDs claimed as this faction\'s territory. Unlike region.hexes, this is ' +
    'an overlay CLAIM, not a partition: overlaps across factions are allowed ' +
    '(contested hexes), coverage is not exhaustive, and it drives no terrain/biome ' +
    'defaults. Do NOT apply region-style uniqueness/coverage validation to this field.',
  ),
  mapColor: z
  .string()
  .optional()
  .describe('Outline color for this faction\'s territory on the interactive map (CSS color).'),
```

Do **not** repurpose the existing `areaOfOperation` field — it stays as the coarse
"where they operate" concept; `hexes` is the precise per-hex claim.

No change required to `map-config.ts` — region outline styling is a constant
(see Phase 2) and faction color comes from `mapColor`. Both `regionBorders` and
`factionTerritory` are registered as scoped campaign layers in `map.yaml`
(Phase 4 / Phase 6), so visibility is a data edit, not a code change. (Future
option: move the region color/width into a `map.yaml` `outlines` block for
themeability — out of scope now.)

Add a changeset (minor bump; new optional fields).

**Commit:** `feat(schemas): add faction territory hex membership`

---

## Phase 2 — Perimeter & centroid helpers (code repo: `@achm/core`)

The topological part — *which* edges are boundaries — is pure and lives in core.
The pixel projection lives in the web app (Phase 4).

**File:** `packages/core/src/...` (alongside the existing coordinate utilities)

```ts
export interface PerimeterEdge {
  hexId: string;
  edge: number; // 0-5, indexes into the shared direction/vertex order
}

/**
 * Given a set of hex IDs, return the edges that lie on the group's outer boundary.
 * An edge is a boundary edge iff the neighbor across it is NOT in the set
 * (including out-of-bounds neighbors). Handles disjoint blobs and interior holes
 * naturally. Order-independent.
 */
export function getPerimeterEdges(
  hexIds: string[],
  notation: CoordinateNotation,
  mapConfig?: MapConfig,
): PerimeterEdge[];
```

**Direction/vertex alignment (single source of truth).** Define the 6 edge
directions once in core as an ordered list of axial deltas (`HEX_EDGE_DIRECTIONS`)
such that edge `i` faces direction `i`. The web vertex offsets (Phase 4) must be
ordered so edge `i` spans vertex `i` → vertex `(i+1) % 6`. Reuse the existing
neighbor logic (`getHexNeighbors`) rather than reimplementing adjacency; just make
it directional/ordered if it isn't already.

Implementation: for each hex in the set, for each edge `i` in 0–5, compute the
neighbor hex via `HEX_EDGE_DIRECTIONS[i]`; if that neighbor id is not in the set
(use a `Set` for O(1) membership), emit `{ hexId, edge: i }`.

**Tests** (`@achm/test-helpers` / core unit tests):
- Single hex → 6 boundary edges.
- 2×2 contiguous block → interior shared edges excluded (verify count, not 24).
- Group with a one-hex hole → inner ring edges present.
- Two disjoint blobs → two separate edge rings.
- Hex on the grid edge → out-of-bounds neighbors counted as boundary.
- Both notations (`letter-number`, `numeric`).

**Commit:** `feat(core): add hex group perimeter helper`

---

## Phase 3 — Territory API endpoint (code repo: `apps/web`)

Regions need **no** endpoint — `Map.svelte` already receives per-hex `regionId`
and `regionName` via `hexes.json`; group client-side. Factions need a new gm-scoped
feed.

**File:** `apps/web/src/pages/api/map-territories.json.ts`

Returns, for each faction with a non-empty `hexes` array:

```ts
type MapTerritory = {
  id: string;
  name: string;
  color: string;   // faction.mapColor, with a sensible fallback
  hexes: string[];
};
```

Scope-gate behind `gm:view` (faction territory is GM-only), consistent with the
existing gm-scoped layers.

**Commit:** `feat(web): add map territories endpoint`

---

## Phase 4 — Rendering (code repo: `apps/web`)

### Pixel projection helper

**File:** `apps/web/src/utils/interactive-map.ts`

Add ordered hex vertex offsets (`HEX_VERTICES`, aligned with core's edge order, see
Phase 2) and:

```ts
// (hexId, edge) -> a pixel segment, via axialToPixel + HEX_VERTICES
export function perimeterEdgesToSegments(
  edges: PerimeterEdge[],
  notation: CoordinateNotation,
): Array<{ x1: number; y1: number; x2: number; y2: number }>;

// average of member-hex pixel centers, for label placement
export function centroidOf(
  hexIds: string[],
  notation: CoordinateNotation,
): { x: number; y: number };
```

### Outline component (parallels `MapPath.svelte`)

**File:** `apps/web/src/components/InteractiveMap/MapOutline.svelte`

Props: `groups: Array<{ id; hexes: string[]; color: string; label?: string }>`,
`layerKey: string`, `notation`, plus stroke styling. For each group: compute
perimeter via `getPerimeterEdges` → `perimeterEdgesToSegments`, render as `<line>`
segments with `stroke-linecap="round"` / `stroke-linejoin="round"` (MVP — visually
matches the continuous look without path-stitching). If `label` present, render a
`<text>` at `centroidOf(hexes)`, using `labelFont`. Wrap in a `<g>` gated by
`$layerVisibility[layerKey]`.

### Wire into `Map.svelte`

- **Region groups (derived):** group `hexes` by `regionId`; label = `regionName`
  (or `getRegionShortTitle`). Color = region outline constant (define
  `REGION_BORDER_COLOR` / `REGION_BORDER_WIDTH` in `interactive-map.ts`; use the
  reference orange). Render with `layerKey="regionBorders"`.
- **Faction groups:** fetch `/api/map-territories.json` (gm only); pass straight
  through. Render with `layerKey="factionTerritory"`.
- **Z-order:** place both `<g>` blocks after the `MapPath` / `tagIcons` groups and
  before the player-mask and `hex-labels` groups — outlines sit above terrain fills,
  labels read on top.

### Layer registration

**File:** `apps/web/src/stores/interactive-map/layer-visibility.ts`

Register **both** `regionBorders` and `factionTerritory` as campaign layers in
`map.yaml` (Phase 6) rather than hardcoding either in `frameworkLayers`. Both then
flow through the existing scope-filtering path. Region borders ship `gm:view` for
now; making them player-visible later is a one-line `map.yaml` edit (remove or
change the scope), no code change.

**Commit:** `feat(web): render region and faction territory outlines`

---

## Phase 5 — Validation (code repo: prebuild)

Add prebuild validation for `faction.hexes`:

- Each hex ID is well-formed and in-bounds (valid against `map.yaml` grid /
  not in `outOfBounds`).
- **Overlaps across factions are allowed** — do not dedupe-check.
- The region unique-assignment validator must **not** be run over faction hexes.
  Confirm it iterates region data only and is not generalized to "any `.hexes`
  field."

**Commit:** `feat(validation): validate faction hexes as overlay claim`

---

## Phase 6 — Data (DATA repo: `skyreach`, separate PR/commits)

- Add both outline layers to `data/map.yaml`:
  ```yaml
  - key: regionBorders
    label: Region Borders
    defaultVisible: false
    scopes:
      - gm:view
  - key: factionTerritory
    label: Faction Territory
    defaultVisible: false
    scopes:
      - gm:view
  ```
  (To make region borders player-visible later, drop the `scopes` from
  `regionBorders` — no code change.)
- Populate `hexes` and `mapColor` on the relevant factions (Revenant Legion,
  Stoneclan, …).

Keep this in its own commit(s), separate from the code-repo changes, per the usual
code/data split. Use the `skip-changeset` label if it's data-only.

**Commit:** `feat(data): add faction territory for Revenant Legion and Stoneclan`

---

## Testing checklist

- [ ] Core perimeter unit tests pass (both notations, holes, disjoint, grid edge).
- [ ] Region outlines match the existing region partition (every region outlined,
  shared borders draw once per region — adjacent regions producing a doubled
  line on the shared edge is acceptable for MVP).
- [ ] Region and faction outlines only visible with `gm:view`; both hidden for
  players. (Region borders are intentionally GM-only for now; flipping them on
  for players is a `map.yaml` scope edit.)
- [ ] Overlapping faction claims both render (contested hex shows two outlines).
- [ ] Centroid labels land inside their group for typical convex regions; note any
  concave/disjoint cases that look wrong (candidates for future overrides).
- [ ] Layer toggles persist via the existing localStorage path.
- [ ] Prebuild rejects an out-of-bounds faction hex but accepts an overlapping one.

---

## Deferred (YAGNI — not in this spec)

- Per-faction layer toggles (one shared "Faction Territory" toggle for now).
- `labelAnchor` / `labelRotation` overrides for hand-tuned label placement and
  rotation (revisit only for the handful of regions where auto-centroid looks bad).
- Stitched continuous `<path>` instead of round-capped segments.
- Insetting overlapping faction outlines inward so contested edges separate
  visibly (add if overlaps read poorly in practice).
- Themeable region outline color/width via a `map.yaml` `outlines` block.
