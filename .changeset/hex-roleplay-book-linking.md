---
'@achm/cli': minor
'@achm/web': minor
'@achm/data': patch
'@achm/schemas': patch
---

Link roleplay books to hexes, adding _place-arrival_ as a second surfacing
trigger for books (alongside the existing encounter-page surfacing). A hex
feature can now remind a roleplay book via `landmark.roleplayBooks` /
`hiddenSites[].roleplayBooks` (bare book slugs, e.g. `fort-dagaric`). The link is
one-directional — "which hexes remind this book" is derived by querying hexes.
Books are surfaced whole, as a pointer: the reminder names the book, never its
contents.

- **Schema (`@achm/schemas`)**: optional `roleplayBooks` array on `LandmarkSchema`
  and `BaseHiddenSiteSchema` (so all three hidden-site variants inherit it),
  mirroring the `beats` field.
- **Data (`@achm/data`)**: `loadRoleplayBooks()` / `parseRoleplayBookFile()` (reads
  `data/roleplay-books/*.yml` into `RoleplayBookData` keyed by file slug) and
  `REPO_PATHS.ROLEPLAY_BOOKS`. The hex-reference validator now also checks
  `roleplayBooks` anchors through this loader.
- **Web (`@achm/web`)**: the hex detail page lists linked books (title + link)
  beside clues/beats, and the interactive-map detail panel shows them too. Book
  data is resolved GM-side only — the `/api/hexes.json` GM branch attaches it and
  player payloads never carry it.
- **CLI (`@achm/cli`)**: on `move`, `backtrack`, and fast-travel arrival, scribe
  announces linked books on a separate labeled line, naming the title — e.g.
  `📖 Roleplay book(s) relevant here: Fort Dagaric — see hex v17.` A linked book
  counts as an arrival alert, so a flagged mid-route hex pauses fast travel there
  (existing `paused_hex_alert` path) and a note is written to the session log.
  Unlike beats, books carry no status gate — every linked, resolvable book
  surfaces. Book titles are cached per process; surfacing is display-only.
