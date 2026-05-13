---
'@achm/schemas': minor
---

Add visibility + campaign-status fields to content schemas. Additive and
backward-compatible: existing YAML/MDX files validate unchanged, since
every new field has a default that matches the current implicit
behaviour.

- **New shared fragment** (`packages/schemas/src/schemas/campaign-status.ts`):
  `CampaignStatusEnum` (`'active' | 'inactive'`) and an `isActive(content)`
  helper that defaults to `'active'` when the field is absent.

- **NPC** gains two fields and a visibility helper:
  - `visibility: 'player' | 'gm'` (default `'player'`) — controls whether
    an NPC appears on player-facing aggregations and detail routes.
  - `campaignStatus: 'active' | 'inactive'` (default `'active'`) — controls
    default-hide filtering on index/list views.
  - `isPlayerVisible(npc)` helper — single source of truth for the
    player/GM check; defaults to `'player'` when the field is absent.

- **Clue, Encounter, Faction, Plotline** each gain
  `campaignStatus: 'active' | 'inactive'` (default `'active'`). On
  Plotline this coexists with the existing 3-way lifecycle `status`
  (`'active' | 'dormant' | 'resolved'`); on Clue it coexists with the
  existing discovery `status` (`'unknown' | 'known'`). The two axes are
  independent.

Consumer code (default-hide filtering, visibility gating, build-time
cross-reference validation) lands in follow-up changesets in the web
package.
