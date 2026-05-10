---
'@achm/schemas': minor
'@achm/web': minor
---

Add `situational` reports to roleplay book intelligence reports for
GM-selected, unnumbered entries that sit alongside the existing d12
random table.

- **Schema** (`@achm/schemas`): new `SituationalReportRowSchema` —
  identical to `IntelligenceReportRowSchema` minus the `roll` field,
  with the same `linkType`/`linkId` co-presence refinement. New
  optional `situational` field on `IntelligenceReportsSchema`.
  Backward compatible: existing roleplay book YAMLs continue to
  validate unchanged.
- **Web** (`@achm/web`): `IntelligenceReportsTable` now renders a
  separate "Situational Reports" table above the d12 table when
  situational entries are present, with a "Random Reports (d12)"
  sub-heading on the rolls table for clarity. When `situational` is
  absent or empty, the d12 table renders alone with no sub-heading
  (no behavior change beyond the rename below). Tracking utilities
  (`clue-usage-tracker`, `encounter-processor` lead detection) now
  walk situational rows so links from situational entries participate
  in clue-usage tracking and `isLead` derivation.
- **Heading rename**: the section heading on roleplay book pages is
  now "Faction Tidings" (was "Intelligence Reports").
