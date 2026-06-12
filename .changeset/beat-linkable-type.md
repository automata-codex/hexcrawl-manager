---
'@achm/schemas': minor
'@achm/web': minor
---

Add `beat` as a linkable type for tidings, so a Faction Tiding row
(rolled or selectable) can link to a beat detail page. The `linkId` is
the compound `<plotlineSlug>/<beatSlug>`, mirroring the existing
pointcrawl-node compound-ID pattern.

- **Schema** (`@achm/schemas`): add `'beat'` to `LinkTypeEnum`. Purely
  additive; existing data continues to validate.
- **Web** (`@achm/web`):
  - New `getBeatPath(compoundId)` route helper (added in
    `generate-config.ts`, emitted to the generated `routes.ts`) —
    builds off `getPlotlinePath`, exactly as `getPointcrawlNodePath`
    builds off `getPointcrawlPath`.
  - `getLinkPath` resolves `'beat'` links to the beat detail page
    (`/gm-reference/plotlines/<plotline>/beats/<beat>`).
  - `getLinkText` labels beat links as `Beat: <Title>` using the beat
    slug only (the plotline half of the compound ID is omitted from
    the label).

Authoring: link a tiding row with `linkType: 'beat'` and
`linkId: '<plotlineSlug>/<beatSlug>'`.

Deferred (logged, not built): a build-time validator that checks
`'beat'`-typed `linkId`s contain exactly one `/` and that both halves
resolve to real content. A malformed compound currently falls through
to `'#'` silently.
