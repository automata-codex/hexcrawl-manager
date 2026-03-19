---
'@achm/schemas': minor
'@achm/web': minor
---

Update faction schema and UI to support narrative-driven faction tracking.

**Schema (`@achm/schemas`):**
- Add `quote`, `goals`, `clocks`, `ifIgnored`, `pcIntersections`, and `activeAgents` optional fields to `FactionSchema`
- Add `FactionClockSchema` and `FactionAgentSchema` helper schemas
- Export `FactionClockData` and `FactionAgentData` types

**Web (`@achm/web`):**
- Add individual faction detail pages at `/gm-reference/factions/[id]`
- Update faction list page to show summaries with links to detail pages
- Display all new faction fields on detail pages
- Add Blades in the Dark-style SVG clock component for progress tracking
- Add `getFactionPath` route helper; update link generator to use it
