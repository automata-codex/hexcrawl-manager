# Hidden Sites Schema Expansion & Intelligence Reports Migration

## Overview

This spec describes changes to support tracking hidden sites that emerge during play (from faction intelligence reports or clue discoveries) rather than being pre-placed during campaign design. It also includes migrating intelligence reports from path-based to ID-based linking.

## Goals

1. Expand the hidden sites schema to support discriminated union of multiple source types
2. Add metadata tracking for when/how/why sites were added during play
3. Migrate intelligence reports from `linkPath` to `linkType`/`linkId` pattern
4. Maintain backward compatibility with existing pre-placed hidden sites

## Schema Changes

### 1. New LinkType Enum

Create a new enum for link types in `packages/schemas/src/schemas/roleplay-book.ts`:

```typescript
const LinkTypeEnum = z.enum([
  'clue',
  'encounter',
  'dungeon',
  'faction',
  'region',
  'hex',
  'knowledge-node',
  // Extensible for future types
]);
```

### 2. Updated IntelligenceReportRowSchema

Modify `IntelligenceReportRowSchema` in `packages/schemas/src/schemas/roleplay-book.ts`:

**Before:**
```typescript
export const IntelligenceReportRowSchema = z.object({
  roll: z.number().describe('Die result'),
  report: z.string().describe('Title/summary of the report'),
  linkText: z.string().optional().describe('Text for the link'),
  linkPath: z.string().optional().describe('Path to the linked content'),
  sampleDialogue: z.string().describe('In-character delivery'),
  relevantConditions: z.string().describe('When this report is relevant'),
});
```

**After:**
```typescript
export const IntelligenceReportRowSchema = z.object({
  roll: z.number().describe('Die result'),
  report: z.string().describe('Title/summary of the report'),
  linkType: LinkTypeEnum.optional().describe('Type of the linked content'),
  linkId: z.string().optional().describe('ID of the linked content'),
  sampleDialogue: z.string().describe('In-character delivery'),
  relevantConditions: z.string().describe('When this report is relevant'),
}).refine(
  (data) => (data.linkType && data.linkId) || (!data.linkType && !data.linkId),
  { message: 'linkType and linkId must both be present or both be absent' }
);
```

**Notes:**
- Remove `linkText` field (will be generated dynamically)
- Replace `linkPath` with `linkType` and `linkId`
- Add refinement to ensure both link fields are present together or both absent

### 3. Expanded HiddenSiteSchema

Replace the simple `HiddenSitesSchema` in `packages/schemas/src/schemas/hex.ts`:

**Before:**
```typescript
export const HiddenSitesSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z.array(z.string()).optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
});
```

**After:**
```typescript
// Base schema for all hidden sites
const BaseHiddenSiteSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z.array(z.string()).optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
});

// Hidden site added from a faction intelligence report
const FactionLeadHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  source: z.literal('faction-lead'),
  sessionAdded: z.string()
    .describe('Session identifier when this site was added, e.g. "session-20"'),
  faction: z.string()
    .describe('Which faction provided the intelligence report'),
  leadName: z.string()
    .describe('Name/title of the intelligence report that created this site'),
  linkType: LinkTypeEnum.optional()
    .describe('Type of the linked content'),
  linkId: z.string().optional()
    .describe('ID of the linked content (encounter, dungeon, etc.)'),
}).refine(
  (data) => (data.linkType && data.linkId) || (!data.linkType && !data.linkId),
  { message: 'linkType and linkId must both be present or both be absent' }
);

// Hidden site added from a clue discovery
const ClueHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  source: z.literal('clue'),
  sessionAdded: z.string()
    .describe('Session identifier when this site was added'),
  clueId: z.string()
    .describe('ID of the floating or fixed clue that revealed this site'),
  discoveredBy: z.string().optional()
    .describe('Which character(s) discovered the clue'),
  linkType: LinkTypeEnum.optional(),
  linkId: z.string().optional(),
}).refine(
  (data) => (data.linkType && data.linkId) || (!data.linkType && !data.linkId),
  { message: 'linkType and linkId must both be present or both be absent' }
);

// Original pre-placed sites (no source field)
const PreplacedHiddenSiteSchema = BaseHiddenSiteSchema;

// Discriminated union of all hidden site types
export const HiddenSiteSchema = z.discriminatedUnion('source', [
  FactionLeadHiddenSiteSchema,
  ClueHiddenSiteSchema,
]).or(PreplacedHiddenSiteSchema);

// The array that goes in hex data (supports legacy format)
export const HiddenSitesSchema = z.union([
  z.array(z.string()), // Legacy format: just descriptions
  z.array(HiddenSiteSchema), // New format: full objects
]);
```

**Notes:**
- Import `LinkTypeEnum` from roleplay-book schema
- Maintain backward compatibility with simple string arrays and objects without `source` field
- Use discriminated union on `source` field for type safety
- Faction-lead sites can optionally link to content (encounters, dungeons, etc.)
- Clue sites can also optionally link to content

### 4. Export Updates

Ensure `LinkTypeEnum` is exported from `packages/schemas/src/schemas/roleplay-book.ts` so it can be imported by `hex.ts`.

## Migration Tasks

### 1. Intelligence Reports Migration Script

Create a migration script at `scripts/migrate-intel-reports.ts` that:

1. Reads all roleplay book YAML files from `data/roleplay-books/`
2. For each intelligence report with `linkPath`:
  - Parse the path to extract `linkType` and `linkId`
  - Remove `linkText` and `linkPath` fields
  - Add `linkType` and `linkId` fields
3. Write updated YAML back to file

**Path parsing logic:**
```typescript
function parseLinkPath(linkPath: string): { linkType: string, linkId: string } | null {
  if (!linkPath) return null;

  // /gm-reference/encounters/{id} -> { linkType: 'encounter', linkId: '{id}' }
  const encounterMatch = linkPath.match(/\/gm-reference\/encounters\/(.+)/);
  if (encounterMatch) {
    return { linkType: 'encounter', linkId: encounterMatch[1] };
  }

  // /gm-reference/dungeons/{id} -> { linkType: 'dungeon', linkId: '{id}' }
  const dungeonMatch = linkPath.match(/\/gm-reference\/dungeons\/(.+)/);
  if (dungeonMatch) {
    return { linkType: 'dungeon', linkId: dungeonMatch[1] };
  }

  // Add more patterns as needed
  console.warn(`Could not parse linkPath: ${linkPath}`);
  return null;
}
```

### 2. UI Updates for Dynamic Link Text Generation

Update any code that displays intelligence report links to generate link text dynamically:

**Function to generate link text:**
```typescript
function generateLinkText(linkType: string, linkId: string, collections: Collections): string {
  // Look up the item name from the appropriate collection
  const item = collections[linkType]?.find(i => i.id === linkId);

  // Format the type name nicely (e.g., 'knowledge-node' -> 'Knowledge Node')
  const typeName = linkType
    .split('-')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');

  return `${typeName}: ${item?.name || linkId}`;
}
```

**Function to generate link path:**
```typescript
function generateLinkPath(linkType: string, linkId: string): string {
  const pathMap: Record<string, string> = {
    'encounter': `/gm-reference/encounters/${linkId}`,
    'dungeon': `/gm-reference/dungeons/${linkId}`,
    'clue': `/clues/${linkId}`,
    'faction': `/factions/${linkId}`,
    'region': `/regions/${linkId}`,
    'hex': `/hexes/${linkId}`,
    'knowledge-node': `/knowledge/${linkId}`,
  };

  return pathMap[linkType] || '#';
}
```

### 3. Encounter List Page "Lead" Tags

Update the code that generates "lead" tags on the encounter list page:

**Before:** Parsed `linkPath` to find encounters
**After:** Filter by `linkType === 'encounter' && linkId === targetEncounterId`

```typescript
function findLeadsForEncounter(encounterId: string, roleplayBooks: RoleplayBook[]): Lead[] {
  const leads: Lead[] = [];

  for (const book of roleplayBooks) {
    if (!book.intelligenceReports) continue;

    for (const row of book.intelligenceReports.rows) {
      if (row.linkType === 'encounter' && row.linkId === encounterId) {
        leads.push({
          faction: book.name,
          report: row.report,
        });
      }
    }
  }

  return leads;
}
```

## Testing Requirements

### 1. Schema Validation Tests

- Pre-placed hidden sites (simple objects without `source`) still validate
- Legacy string array format for hidden sites still validates
- Faction-lead hidden sites validate with all required fields
- Clue hidden sites validate with all required fields
- Validation fails when `linkType` present but `linkId` absent (and vice versa)
- Intelligence reports validate with new `linkType`/`linkId` fields
- Intelligence reports fail validation with incomplete link fields

### 2. Migration Script Tests

- Script successfully migrates all existing intelligence reports
- All `linkPath` values are correctly parsed into `linkType`/`linkId`
- No intelligence reports are lost or corrupted
- YAML formatting is preserved
- Script reports any unparseable `linkPath` values

### 3. UI Tests

- Intelligence report links display with correct generated text
- Links navigate to correct pages
- Encounter list page shows correct "lead" tags
- No broken links from old `linkPath` references

## Backward Compatibility

- Existing hex data with simple hidden site objects continues to work
- Existing hex data with string arrays for hidden sites continues to work
- No changes required to existing hex YAML files until sites are added during play
- Migration script is idempotent (can be run multiple times safely)

## Future Extensions

This schema design allows for easy addition of new source types:

```typescript
const PlayerInvestigationHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  source: z.literal('player-investigation'),
  sessionAdded: z.string(),
  investigatingCharacter: z.string(),
  // ... other fields
});

const RandomEventHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  source: z.literal('random-event'),
  sessionAdded: z.string(),
  eventType: z.string(),
  // ... other fields
});

// Then update the discriminated union:
export const HiddenSiteSchema = z.discriminatedUnion('source', [
  FactionLeadHiddenSiteSchema,
  ClueHiddenSiteSchema,
  PlayerInvestigationHiddenSiteSchema,
  RandomEventHiddenSiteSchema,
]).or(PreplacedHiddenSiteSchema);
```

## Files to Modify

1. `packages/schemas/src/schemas/roleplay-book.ts` - Add LinkTypeEnum, update IntelligenceReportRowSchema
2. `packages/schemas/src/schemas/hex.ts` - Expand HiddenSiteSchema
3. Create `scripts/migrate-intel-reports.ts` - Migration script
4. Update UI code that renders intelligence report links (exact files TBD based on codebase structure)
5. Update encounter list page code (exact files TBD based on codebase structure)
6. All YAML files in `data/roleplay-books/` - Will be modified by migration script

## Success Criteria

- [ ] All schema changes implemented and validated
- [ ] Migration script successfully updates all roleplay book YAML files
- [ ] No validation errors when loading existing data
- [ ] Intelligence report links display correctly with generated text
- [ ] Encounter list page "lead" tags work correctly
- [ ] All tests pass
- [ ] No broken links or missing content
- [ ] Ready to add play-generated hidden sites to hex data
