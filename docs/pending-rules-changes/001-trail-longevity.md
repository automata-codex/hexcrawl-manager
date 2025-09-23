# Trail Longevity and Permanence

**ID:** 004
**Status:** Proposed
**Owner:** —
**Date Opened:** 2025-09-23
**Source:** Conversation notes; Hexcrawl Rules (Trails section)
**Affects:** `Hexcrawl Rules §Trail Formation and Use`; `docs/dev/session-lifecycle.md` (Finalize / season rollovers); Trail bookkeeping in data files

## Summary of Software Behavior
Proposed update to how trails evolve and persist across seasons:
- Trails have a seasonal survival mechanic.
- Trails near havens are maintained automatically and progress toward permanence.
- Trails far from havens must roll each season to survive; usage improves odds of permanence.
- Mid-session season boundaries are resolved by synthetic rollovers, ensuring trail checks are performed exactly once per boundary.

This replaces the simpler “use-count + decay roll” model currently in the Hexcrawl Rules with a system tied explicitly to **seasons** and **haven proximity**.

## Current Rules Text (canonical)
From *Hexcrawl Rules — Trail Decay*:

> If a trail is unused for one season, roll a d6:
> 1–3 Trail degrades one step (e.g., from Established to Visible)
> 4–6 Trail persists at current level
>
> If unused for a year, it automatically degrades one step.

And from *Trail Progression*:
> With repeated use, a trail may become permanent.

## Proposed Rules Update

### Trail Longevity
- A newly marked trail always lasts until the end of the current season.
- At the change of season, check each trail:
  - **Near a haven (≤3 hexes):** Automatically maintained. After 3 consecutive seasons, the trail becomes permanent.
  - **Far from havens:** Roll 1d6.
    - On 1–3 → trail is lost.
    - On 4–6 → trail persists.
    - If **used this season**, it gains 1 season toward permanence.
    - If **unused**, streak resets to 0.

### Permanent Trails
- After **3 consecutive seasons** of use/maintenance, a trail becomes permanent.
- Permanent trails never fade, require no upkeep, and always provide benefits.
- Benefits: party cannot get lost; travel time reduced by 50%.

### Mid-Session Season Handling
- If a session crosses into a new season, `finalize` inserts a `season_rollover` event.
- Trails must resolve their longevity check at that rollover boundary, even mid-session.
- Ensures seasonal decay/permanence logic remains consistent regardless of session length.

### Paradox Rule
- Once a `season_rollover` has been applied via `weave`, its trail updates are immutable.
- Rollovers are one-way and cannot be “re-applied” differently later.
- This prevents paradoxes where trail states would diverge depending on re-ordering.

### Bookkeeping Fields
Each trail segment tracks:
- **permanent** (boolean)
- **streak** (0–3 consecutive seasons of use/maintenance)
- **usedThisSeason** (boolean, reset each season)
- **lastUpdatedSeason** (season id of last rollover applied)

### Randomness Storage
- Any dice rolls for trail decay (e.g., 1d6 survival check) must be persisted in the rollover/session log.
- Roll outcomes are part of canonical history; they must not be re-rolled later.
- Ensures full determinism when reapplying session/rollover files.

## Open Questions / Decisions Needed
- Should “Permanent” trails still be vulnerable to catastrophic events (storms, planar scars, etc.)?
- Do haven thresholds scale with haven size/importance, or is 3 hexes always the range?
- Should trail permanence accelerate if multiple groups use the trail heavily in one season?

## Acceptance Criteria / Tests
- Trails last through the season they’re created.
- Trails near havens auto-progress toward permanence after 3 seasons.
- Trails far from havens require d6 roll each season.
- Mid-session rollovers trigger correct trail updates.
- “Permanent” trails persist forever and always provide benefits.
- Trail data structure records **permanent**, **streak**, **usedThisSeason**, and **lastUpdatedSeason**.
- Randomness for trail decay is persisted and replayed consistently.

## Migration Notes
- Existing trail data may need conversion to add `streak`, `permanent`, `usedThisSeason`, and `lastUpdatedSeason` fields.
- Old “decay roll” mechanic should be deprecated once permanence is implemented.
