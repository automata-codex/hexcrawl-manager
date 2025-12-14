# Clue Placement in Characters, Plotlines, and NPCs

## Problem

The clue list component shows clues as "used" or "unused" based on hex placements. However, many clues are actually placed in character backstories, plotlines, or NPC knowledge—not in hexes. These show as "unused" even though they're accounted for.

## Goal

Allow clues to be "placed" in characters, plotlines, and NPCs. Update the "used in" algorithm to scan all these sources so the accounting is accurate.

## Schema Changes

### Shared Clue Reference Schema

Create a reusable schema that accepts either a string (just the clue ID) or an object with `id` and optional `context`:

```typescript
const ClueReferenceSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    context: z.string().optional(),
  }),
]);

const ClueReferencesSchema = z.array(ClueReferenceSchema).optional();
```

### Apply to Existing Schemas

Add a `clues` field using `ClueReferencesSchema` to:

- Character schema
- Plotline schema
- NPC schema (if one exists)

## Example Usage

Simple list of IDs:
```yaml
clues:
  - fathers-legion-service
  - mothers-locket-inscription
```

With context:
```yaml
clues:
  - fathers-legion-service
  - id: mothers-locket-inscription
    context: "Discovered if locket is examined closely"
```

Mixed:
```yaml
clues:
  - fathers-legion-service
  - id: twin-sigils
    context: "Core discovery at Twin Rapids"
  - secret-meeting-rumor
```

## Algorithm Update

Update the clue usage algorithm to:

1. Scan hex clue placements (existing behavior)
2. Scan character files for `clues` arrays
3. Scan plotline files for `clues` arrays
4. Scan NPC files for `clues` arrays (if applicable)

### Normalizing References

When processing clue references, normalize them to a consistent shape:

```typescript
function normalizeClueRef(ref: string | { id: string; context?: string }) {
  return typeof ref === 'string' ? { id: ref } : ref;
}
```

### Display

The "used in" display should indicate the source type, e.g.:

- "Twin Sigils — used in: S15 (Twin Rapids)"
- "Father's Legion Service — used in: Valen (character)"
- "Strange Coin — used in: Revenant Conspiracy (plotline)"
