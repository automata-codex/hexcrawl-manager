---
"@achm/core": patch
"@achm/web": minor
---

Add keyed encounters display and improve hex catalog search

**Keyed Encounters:**
- Display keyed encounters on hex detail pages with encounter name, trigger type, and notes
- Track keyed encounters in encounter usage map so they no longer appear as "unused"

**Hex Catalog Improvements:**
- Support numeric coordinate notation (e.g., "0303") in addition to letter-number (e.g., "F12")
- Enable prefix matching for hex ID search (e.g., "04" matches 0401, 0402, etc.)
- Simplify search results to show data bar and searchable fields only
- Fix notes search to handle both string and object note formats

**Rumors Page:**
- Convert rumors index to a simple dynamic list instead of hardcoded random table
- Remove redundant "all rumors" page

**Core Package:**
- Export `LETTER_NUMBER_PREFIX_RE` and `NUMERIC_PREFIX_RE` patterns for hex ID prefix matching
