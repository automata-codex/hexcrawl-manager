# Spec: add `beat` as a linkable type for tidings

## Standing constraint
Before writing, pull the current versions of every schema/file named below from the repo — do not work from the copies in this thread. Confirm field names and shapes still match before editing.

## Goal
Let a Faction Tiding row (rolled or selectable) link to a beat detail page, so curated tidings can surface specific beats on the encounter page where the roleplay book renders.

## Background
Beat detail pages exist at `/gm-reference/plotlines/<plotlineSlug>/beats/<beatSlug>` — a compound path needing both the parent plotline slug and the beat slug. This mirrors the existing pointcrawl-node pattern (`getPointcrawlNodePath`), which resolves a `"parentSlug/childId"` compound by splitting on `/` and appending to the parent path. Follow that precedent; do not invent a new mechanism.

The compound ID requires no new data: the beat schema already carries both halves (`plotline` = parent slug, present explicitly for reverse-lookup; `slug` = beat slug). The `linkId` for a beat tiding is `` `${beat.plotline}/${beat.slug}` ``.

## Changes

**1. `LinkTypeEnum` (`roleplay-book.ts`)** — add `'beat'` to the enum. Purely additive. Also add the naming-map comment (provided separately) in the same commit.

**2. Path helper (`scripts/generate-config.ts`, emitting to generated `routes.ts`)** — add a `getBeatPath`, modeled on `getPointcrawlNodePath`. `routes.ts` is generated (`DO NOT EDIT` banner); the helper must be added in the generator and `routes.ts` regenerated, not hand-edited. There is no `beat` collection in `routes.yml` and none should be added — the path builds off `getPlotlinePath`, exactly as `getPointcrawlNodePath` builds off `getPointcrawlPath`. Target output:

```typescript
/**
 * Get path for a beat detail page.
 * @param compoundId - Format: "plotlineSlug/beatSlug"
 */
export function getBeatPath(compoundId: string): string {
  const [plotlineSlug, beatSlug] = compoundId.split('/');
  return `${getPlotlinePath(plotlineSlug)}/beats/${beatSlug}`;
}
```

**3. `getLinkPath` (`link-generator.ts`)** — add `getBeatPath` to the imports from `../config/routes`, and add the case:

```typescript
case 'beat':
  return getBeatPath(linkId);
```

⚠️ This switch has `default: '#'`. Adding `'beat'` to the enum will NOT produce a compile error here — a missing case fails silently to a dead link. The case must be added by hand; the compiler will not catch its absence.

**4. `getLinkText` (`link-generator.ts`)** — two edits:
- Add `beat: 'Beat'` to the `typeLabels` record. This one IS compiler-enforced (`Record<LinkType, string>` is exhaustive); the file won't typecheck until it's added.
- The ID formatter splits on `-` and title-cases, which mangles a compound beat ID (the `/` survives and the plotline slug bleeds into the label). Special-case beats so the label uses only the beat slug — split the compound on `/`, take the second segment, then apply the existing hyphen-to-title-case formatting to that. Decide whether the label reads e.g. `Beat: The Bearfolk Echo` (beat slug only) or includes the plotline; recommend beat-slug-only to match how the other types read.

## Authoring
Once shipped, a tiding row links a beat with `linkType: 'beat'` and `linkId: '<plotlineSlug>/<beatSlug>'`. This is the curated-push mechanism: hand-write a selectable tiding per beat you want surfaced on a faction's encounters.

## Defer (log, don't build)
A build-time validator that checks `'beat'`-typed `linkId`s contain exactly one `/` and that both halves resolve to real content (mirroring `validate-faction-ids.ts`). A malformed compound currently fails silently to `'#'`. Not worth building until a broken beat link actually bites — flag only.

## Verification
- Typecheck catches the `getLinkText` label (expected) — confirms enum wired.
- Manually confirm `getLinkPath` returns a real path, not `'#'`, for a beat link (the silent case).
- Render a tiding with a beat link on an encounter page; confirm the link resolves to the live beat detail page and the label reads cleanly.
