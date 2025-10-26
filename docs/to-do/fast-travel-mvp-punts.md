# Fast Travel MVP — Deferred Features

This document tracks features from the `fast` command spec (v1.0) that were intentionally deferred or simplified for the MVP implementation.

## Automatic Day Advancement

**Status:** Deferred
**Spec Reference:** Section "Execution Model" → "Capacity check"

### What the spec says:

When a leg would exceed daily capacity (active or daylight), the system should:
1. Emit `day_end` with summary (active, daylight, night hours)
2. Emit `day_start` with next calendar date, season, and daylight cap
3. Emit `weather_committed` for the new day
4. Reset counters and re-evaluate the same leg

### MVP behavior:

When capacity would be exceeded, the system **pauses** with status `paused_no_capacity`. The user must manually:
- End the current day with `day end`
- Start a new day with `day start`
- Commit weather if needed
- Resume with `fast resume`

### Implementation notes:

The MVP checks capacity before each leg in `execute-leg.ts:24-35`:
```typescript
if (activeSegmentsToday + segments > ACTIVE_CAP_SEGMENTS) {
  return { canExecute: false, reason: 'no_capacity' };
}
```

The runner in `fast-travel-runner.ts:144-170` pauses on `no_capacity` rather than advancing the day.

### Why deferred:

- Weather commitment requires user decisions or weather generation logic
- Calendar advancement needs date rollover logic (including month/year boundaries)
- Wanted to validate basic travel mechanics before adding automatic day management

---

## Night Travel

**Status:** Partially Implemented
**Spec Reference:** Section "Emitted events for a fitting leg" → "time_log"

### What the spec says:

Travel time should be allocated to daylight first, then overflow to night:
```typescript
daylightSegments = min(legSegments, daylightSegmentsLeft)
nightSegments = legSegments - daylightSegments
phase = (nightSegments > 0 ? 'night' : 'daylight')
```

### MVP behavior:

- The state tracking includes `nightSegments` counter
- `execute-leg.ts` calculates night segments correctly (lines 47-48)
- However, the MVP **effectively never uses night travel** because it pauses when daylight runs out

### Implementation notes:

The infrastructure exists but is gated by the daylight capacity check in `execute-leg.ts:29-31`:
```typescript
if (daylightSegmentsLeft < segments) {
  return { canExecute: false, reason: 'new_day_needed' };
}
```

### Why deferred:

- Night travel has gameplay implications (risk, visibility, exhaustion)
- Wanted to validate daylight travel mechanics first
- Easier to add night travel rules after MVP is stable

### To implement:

Remove or modify the daylight capacity check to allow night overflow. May need additional rules around:
- Maximum night segments per day
- Exhaustion mechanics for night travel
- Encounter rate modifiers for night travel

---

## Weather Commitment for Future Days

**Status:** Deferred
**Spec Reference:** Section "Capacity check" → step 2 "Start next day"

### What the spec says:

When automatically advancing to a new day during fast travel, emit `weather_committed` with today's weather.

### MVP behavior:

The system pauses instead of advancing days, so weather commitment is handled manually by the user.

### Why deferred:

- Part of the automatic day advancement feature (deferred above)
- Weather generation/selection logic needs user input or automation rules
- Manual weather commitment gives GM control over conditions

### To implement:

When automatic day advancement is added, integrate with weather generation:
- Generate or select weather for the new day
- Emit `weather_committed` event
- Update fast travel state with new weather
- Consider weather effects on subsequent legs

---

## Encounter Table Selection

**Status:** Simplified
**Spec Reference:** Section "Helpers" → "Encounters"

### What the spec says:

```typescript
// Choose & roll the correct table (hex > region > default)
export function makeEncounterNote(hexId: string): string;
```

The spec implies a hierarchy: hex-specific → region → default encounter table.

### MVP behavior:

Always uses the default encounter table loaded from `data/encounter-tables/default-encounter-table.yaml`. The `hexId` parameter is used only for the note text.

### Implementation notes:

`load-encounter-table.ts` hardcodes:
```typescript
const encounterTablePath = resolveDataPath('default-encounter-table.yaml');
```

### Why simplified:

- Hex-specific and region encounter tables don't exist yet in the data
- Default table covers basic encounter needs
- Easier to validate encounter mechanics with single table

### To implement:

1. Create hex-specific encounter table data structure
2. Create region encounter table data structure
3. Modify `loadEncounterTable` to accept `hexId` parameter
4. Implement cascade logic: try hex table, fall back to region, fall back to default
5. Update all call sites to pass hex ID

---

## Hex-Specific Encounter Rates

**Status:** Simplified
**Spec Reference:** Section "Helpers" → "Encounters"

### What the spec says:

```typescript
export function rollEncounterOccurs(hexId: string): boolean;
```

The `hexId` parameter suggests encounter probability varies by hex (danger level, terrain type, etc.).

### MVP behavior:

Hardcoded 5% chance (roll 1 on d20) for all hexes:
```typescript
export function rollEncounterOccurs(): boolean {
  const roll = rollDice('1d20');
  return roll === 1;
}
```

### Why simplified:

- No hex danger/threat level data exists yet
- Wanted consistent encounter rate for testing
- Easier to validate encounter pause/resume logic with fixed rate

### To implement:

1. Add danger level or encounter frequency to hex data
2. Modify `rollEncounterOccurs` to accept `hexId` parameter
3. Look up hex encounter rate from data
4. Adjust dice roll or threshold based on hex properties
5. Consider factors: terrain, proximity to settlements, season, etc.

---

## Tiered Encounter Tables

**Status:** Simplified
**Spec Reference:** Implied by schema structure `TieredSubtableData`

### What the spec implies:

Encounter subtables are tiered (presumably by party level/strength), and the appropriate tier should be selected based on party composition.

### MVP behavior:

Always uses tier "1" (hardcoded in `roll-encounter-entry.ts:19`):
```typescript
// For MVP, always use tier 1
const tier = '1';
```

### Why simplified:

- No party level/tier tracking exists yet
- Tier data structure exists but tier selection logic doesn't
- Wanted to validate encounter mechanics before adding complexity

### To implement:

1. Add party tier tracking to session state
2. Pass party tier to `rollEncounterEntry`
3. Select appropriate tier from encounter table
4. Handle missing tiers gracefully (fall back to tier 1?)
5. Consider dynamic tier adjustment based on party strength

---

## Pathfinding Tie-Breaker

**Status:** Partially Implemented
**Spec Reference:** Section "Planning" → "Shortest path"

### What the spec says:

When multiple paths have equal length, prioritize by:
1. `permanent` trails (true before false)
2. `usedThisSeason` trails (true before false)
3. Higher `streak` value

### MVP behavior:

Basic BFS implemented in `trails.ts:41-77`. Tie-breaker logic may not be fully implemented or tested.

### Why partially implemented:

- BFS finds *a* shortest path correctly
- Tie-breaker is optimization, not correctness requirement
- Trail metadata (streak, usedThisSeason) exists in data but may not affect pathfinding

### To implement:

1. Verify tie-breaker logic in BFS implementation
2. Add test cases for scenarios where tie-breaker matters
3. Consider using priority queue instead of plain queue for stable ordering
4. Document tie-breaker behavior in function comments

---

## Route Preview

**Status:** Not Implemented
**Spec Reference:** Section "Status & UX" → "Preview before execute"

### What the spec says:

Before executing travel, show:
- Route path (e.g., `P12 → P13 → Q13 → … → U17`)
- Leg count
- Best-case total segments (assumes no encounters, all daylight)
- First expected camp estimate

### MVP behavior:

Immediately begins executing travel after finding route. Only shows:
```
Found route: P12 → P13 → Q13 → …
Fast travel plan created. Starting journey...
```

### Why not implemented:

- MVP focuses on core execution mechanics
- Preview requires estimation logic (camps, weather impact)
- User can abort if unhappy with initial leg

### To implement:

1. Calculate total segments for route (sum base segments, estimate doublers)
2. Estimate camp locations based on daylight/activity caps
3. Format preview message with route, stats, and estimates
4. Add confirmation prompt or auto-proceed flag
5. Consider showing weather impact on estimates

---

## Enhanced Fast Status

**Status:** Partially Implemented
**Spec Reference:** Section "Status & UX" → "`fast status`"

### What the spec says:

Show:
- Current leg `i/n` and next edge `A→B`
- Active time today: `X.Yh`
- Daylight left: `Z.Zh`
- Today's weather category

### MVP behavior:

Status command may show subset of information. Need to verify against spec requirements.

### To implement:

1. Audit current `fast status` output
2. Add missing fields (weather, formatted times)
3. Format edge as `A→B` instead of hex IDs separately
4. Ensure all counters convert segments to hours correctly

---

## Note Scope for Encounters

**Status:** Different from Spec
**Spec Reference:** Line 123

### What the spec says:

```typescript
note { text: "Encounter entering <B>: <one-liner>", scope: 'day' }
```

### MVP behavior:

Uses `scope: 'session'` for encounter notes (see `fast-travel-runner.ts:118`):
```typescript
events.push({
  type: 'note',
  payload: {
    text: encounterNote,
    scope: 'session',
  },
});
```

### Why different:

- Uncertainty about note scope semantics and display
- Session scope ensures encounter notes aren't lost in daily summaries
- Can change easily once scope behavior is clarified

### To implement:

1. Clarify difference between 'day' and 'session' scope
2. Change hardcoded 'session' to 'day' if appropriate
3. Test note visibility with both scopes
4. Document scope decision in code comments

---

## Integrity Tracking Fields

**Status:** Simplified
**Spec Reference:** Section "Sidecar" → shape example

### What the spec says:

Plan should track:
```yaml
lastSeq: 1234         # last event seq written by runner
lastHash: "sha256:…"  # hash of recent log tail
```

### MVP behavior:

Uses `currentSeq` and `currentHash` instead:
- `currentSeq` tracks event count when plan created/updated
- `currentHash` is SHA-256 of entire event log

### Why simplified:

- Hash of entire log is simpler than "recent tail"
- Sequence number concept is same, just different naming
- Achieves same integrity goal (detect log changes)

### To implement:

If "recent tail" optimization is desired:
1. Define "tail" size (last N events?)
2. Modify `computeSessionHash` to hash only tail
3. Update integrity check logic
4. Consider trade-offs: smaller hash input vs. missing changes outside tail

---

## Session vs Group ID

**Status:** Inconsistent with Spec
**Spec Reference:** Section "Sidecar" → shape example

### What the spec says:

Plan includes both `groupId` and `sessionId`:
```yaml
groupId: "b6a3f7d2-9e9a-4a4e-9d8a-3b8b9a2c5e8f"
sessionId: 42
```

### MVP behavior:

Plan includes only `sessionId` (may be string, not number).

### Why inconsistent:

- Session ID alone is sufficient for MVP file naming
- Group ID relationship to sessions needs clarification
- Can add group ID later without breaking existing plans

### To implement:

1. Add group ID to plan structure
2. Update plan creation to include group ID
3. Consider using group ID in file path or name
4. Document relationship between group ID and session ID

---

## Summary

The MVP successfully implements the core fast travel mechanics:
- ✅ Trail-based pathfinding (BFS)
- ✅ Leg-by-leg execution with time tracking
- ✅ Pace-based travel time (slow/normal/fast)
- ✅ Terrain and weather doublers (correctly applies one maximum)
- ✅ Daily capacity limits (active and daylight)
- ✅ Encounter detection and pause/resume
- ✅ Plan persistence and integrity checking

Deferred features are primarily around automation (auto-advance days), sophistication (hex-specific encounters, tiered tables), and UX polish (previews, enhanced status). The MVP provides a solid foundation for adding these features incrementally.
