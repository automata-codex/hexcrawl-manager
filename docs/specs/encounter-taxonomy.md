# Encounter Taxonomy and Usage Tracking Feature Specification

## Overview

This feature adds a two-axis organization system for encounters:
1. **Manual taxonomy** - tags for filtering encounters by context (location types, factions, etc.)
2. **Automated usage tracking** - cross-references showing where encounters are used

The system supports 60+ existing encounters and enables filtering like "show me all unused general-purpose wilderness encounters involving the Revenant Legion."

---

## Goals

- Enable contextual filtering of encounters (wilderness vs dungeon, by faction, etc.)
- Track which encounters are used and where (dungeons, hexes, regions)
- Identify unused encounters for both general-purpose and location-specific encounters
- Support both simple dungeons (stat blocks only) and complex ones (full encounter references)
- Maintain low-maintenance, pragmatic data structures

---

## Schema Changes

### 1. Encounter Schema Updates

**File**: `packages/schemas/src/schemas/encounter.ts`

**Add new fields**:

```typescript
export const EncounterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    contentPath: z.string().optional(),
    statBlocks: z.array(z.string()),

    // NEW FIELDS
    scope: z.enum(['general', 'hex', 'region', 'dungeon']),

    locationTypes: z.array(z.enum(['wilderness', 'dungeon']))
      .min(1)
      .optional()
      .describe('Required for general-scope encounters, optional for others'),

    factions: z.array(z.enum([
      'alseid',
      'bearfolk',
      'beldrunn-vok',
      'blackthorns',
      'flamehold-dwarves',
      'kobolds',
      'revenant-legion',
      'servitors',
      'three-dukes',
      'veil-shepherds',
    ])).optional(),

    isLead: z.boolean().optional()
      .describe('Marks this encounter as a lead (faction intelligence). Leads are considered "used" even if not referenced elsewhere.'),

    // DERIVED FIELDS (populated at build time)
    creatureTypes: z.array(z.enum([
      'aberration',
      'beast',
      'celestial',
      'construct',
      'dragon',
      'elemental',
      'fey',
      'fiend',
      'giant',
      'humanoid',
      'monstrosity',
      'ooze',
      'plant',
      'undead',
    ])).optional().describe('Automatically derived from stat blocks'),

    usedIn: z.array(z.object({
      type: z.enum(['hex', 'region', 'dungeon']),
      id: z.string(),
      name: z.string(),
    })).optional().describe('Automatically populated by analyzing references'),
  })
  .refine(
    (data) => data.description || data.contentPath,
    {
      message: "Either 'description' or 'contentPath' must be provided",
    },
  )
  .refine(
    (data) => {
      // locationTypes required for general scope
      if (data.scope === 'general' && (!data.locationTypes || data.locationTypes.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "locationTypes is required for general-scope encounters",
      path: ['locationTypes'],
    }
  )
  .describe('EncounterSchema');
```

**Field descriptions**:

- `scope`: Design intent - whether encounter is general-purpose or specific to a location type
- `locationTypes`: Where encounter can be used (wilderness/dungeon). Required for general encounters.
- `factions`: Which factions are involved (optional, omitted when not applicable)
- `isLead`: Boolean flag for lead encounters. Leads are always considered "used" in UI.
- `creatureTypes`: Derived from stat block types during build process
- `usedIn`: Populated during build by scanning dungeon/hex/region encounter references

### 2. Dungeon Schema Updates

**File**: `packages/schemas/src/schemas/dungeon.ts`

**Add encounters field and deprecate statBlocks**:

```typescript
export const DungeonDataSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    hexId: z.string(),
    name: z.string(),
    builders: z.array(z.enum([...])),
    images: z.array(...).optional(),
    source: z.string().optional(),
    summary: z.string().optional(),

    statBlocks: z.array(z.string()).optional()
      .describe('DEPRECATED: Use encounters array with full encounter files instead. Still supported for backward compatibility.'),

    // NEW FIELD
    encounters: z.array(z.string()).optional()
      .describe('Array of encounter IDs used in this dungeon'),

    treasure: z.array(TreasureSchema).optional(),
    unlocks: z.array(z.string()).optional(),
  })
  .describe('Data for a dungeon on a hex map');
```

**Note**: The `statBlocks` field only exists in the dungeon schema. Encounters retain their `statBlocks` field as the canonical place for listing stat blocks.

### 3. Hex Schema Updates

**File**: `packages/schemas/src/schemas/hex.ts`

**Add encounters field**:

```typescript
export const HexSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    landmark: z.union([z.string(), LandmarkSchema]),
    // ... existing fields ...

    // NEW FIELD
    encounters: z.array(z.string()).optional()
      .describe('Array of encounter IDs that can occur in this hex'),

    encounterChance: z.number().int().min(1).max(20).optional(),
    encounterOverrides: EncounterOverrideSchema.optional(),
    // ... rest of fields ...
  })
  .describe('HexSchema');
```

### 4. Region Schema Updates

**File**: `packages/schemas/src/schemas/region.ts`

**Add encounters field** (regions already have encounter tables, but add explicit encounters array):

```typescript
export const RegionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    haven: z.string(),
    encounterChance: z.number().int().min(1).max(20),
    encounters: EncounterTableSchema.optional(),

    // NEW FIELD (optional since encounter tables already exist)
    encounterIds: z.array(z.string()).optional()
      .describe('Explicit list of encounters for this region, derived from encounter tables or specified directly'),

    type: z.enum([...]),
    contentDensity: z.number().int().min(1).max(5),
    treasureRating: z.number().int().min(1).max(5),
  })
  .describe('Data for a region on a hex map');
```

---

## Build-Time Processing

### Creature Type Derivation

**File**: Create `packages/schemas/src/processors/encounter-processor.ts`

```typescript
import { getCollection } from 'astro:content';
import type { EncounterData, StatBlockData } from '../schemas';

export async function deriveCreatureTypes(encounter: EncounterData): Promise<string[]> {
  const statBlocks = await getCollection('statBlocks');
  const statBlockMap = new Map(statBlocks.map(sb => [sb.id, sb.data]));

  const creatureTypes = new Set<string>();

  for (const statBlockId of encounter.statBlocks || []) {
    const statBlock = statBlockMap.get(statBlockId);
    if (statBlock?.type) {
      creatureTypes.add(statBlock.type);
    }
  }

  return Array.from(creatureTypes).sort();
}
```

### Usage Tracking

**File**: `packages/schemas/src/processors/encounter-usage-tracker.ts`

```typescript
import { getCollection } from 'astro:content';
import type { EncounterData } from '../schemas';

interface UsageReference {
  type: 'hex' | 'region' | 'dungeon';
  id: string;
  name: string;
}

export async function buildEncounterUsageMap(): Promise<Map<string, UsageReference[]>> {
  const usageMap = new Map<string, UsageReference[]>();

  // Scan dungeons
  const dungeons = await getCollection('dungeons');
  for (const dungeon of dungeons) {
    const encounterIds = dungeon.data.encounters || [];
    for (const encounterId of encounterIds) {
      if (!usageMap.has(encounterId)) {
        usageMap.set(encounterId, []);
      }
      usageMap.get(encounterId)!.push({
        type: 'dungeon',
        id: dungeon.data.id,
        name: dungeon.data.name,
      });
    }
  }

  // Scan hexes
  const hexes = await getCollection('hexes');
  for (const hex of hexes) {
    const encounterIds = hex.data.encounters || [];
    for (const encounterId of encounterIds) {
      if (!usageMap.has(encounterId)) {
        usageMap.set(encounterId, []);
      }
      usageMap.get(encounterId)!.push({
        type: 'hex',
        id: hex.data.id,
        name: hex.data.name,
      });
    }
  }

  // Scan regions (extract from encounter tables)
  const regions = await getCollection('regions');
  for (const region of regions) {
    const encounterIds = extractEncounterIdsFromRegion(region.data);
    for (const encounterId of encounterIds) {
      if (!usageMap.has(encounterId)) {
        usageMap.set(encounterId, []);
      }
      usageMap.get(encounterId)!.push({
        type: 'region',
        id: region.data.id,
        name: region.data.name,
      });
    }
  }

  return usageMap;
}

function extractEncounterIdsFromRegion(regionData: any): string[] {
  const encounterIds = new Set<string>();

  // Extract from encounter tables
  if (regionData.encounters?.categoryTables) {
    for (const categoryTable of Object.values(regionData.encounters.categoryTables)) {
      for (const tierEntries of Object.values(categoryTable as any)) {
        for (const entry of tierEntries) {
          if (entry.encounterId) {
            encounterIds.add(entry.encounterId);
          }
        }
      }
    }
  }

  // Also include explicit encounterIds if present
  if (regionData.encounterIds) {
    for (const id of regionData.encounterIds) {
      encounterIds.add(id);
    }
  }

  return Array.from(encounterIds);
}
```

### Integration Point

**File**: Update content processing in `apps/web/src/content.config.ts` or create a build hook

```typescript
// This should run during the build process
import { deriveCreatureTypes } from '@skyreach/schemas/processors/encounter-processor';
import { buildEncounterUsageMap } from '@skyreach/schemas/processors/encounter-usage-tracker';

// Augment encounter data during build
export async function processEncounters() {
  const encounters = await getCollection('encounters');
  const usageMap = await buildEncounterUsageMap();

  for (const encounter of encounters) {
    // Derive creature types
    encounter.data.creatureTypes = await deriveCreatureTypes(encounter.data);

    // Add usage information
    encounter.data.usedIn = usageMap.get(encounter.id) || [];
  }
}
```

---

## Migration Script

### Purpose

Automatically populate new taxonomy fields on 60+ existing encounters using intelligent inference.

### Script Location

`scripts/one-time-scripts/migrate-encounter-taxonomy.ts`

### Script Logic

```typescript
import { readFile, writeFile } from 'fs/promises';
import { parse, stringify } from 'yaml';
import { getCollection } from 'astro:content';

interface MigrationReport {
  processed: number;
  modified: number;
  skipped: number;
  errors: string[];
  details: Array<{
    id: string;
    changes: {
      scope?: string;
      locationTypes?: string[];
      factions?: string[];
    };
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
}

interface TaxonomyInference {
  scope: 'general' | 'hex' | 'region' | 'dungeon';
  locationTypes?: string[];
  factions?: string[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function migrateEncounterTaxonomy(): Promise<MigrationReport> {
  const report: MigrationReport = {
    processed: 0,
    modified: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  // Load all encounters, dungeons, hexes, regions for analysis
  const encounters = await getCollection('encounters');
  const dungeons = await getCollection('dungeons');
  const hexes = await getCollection('hexes');
  const regions = await getCollection('regions');

  // Build usage map
  const usageMap = buildUsageMapForMigration(dungeons, hexes, regions);

  for (const encounter of encounters) {
    report.processed++;

    try {
      const encounterPath = `data/encounters/${encounter.id}.yaml`;
      const fileContent = await readFile(encounterPath, 'utf-8');
      const data = parse(fileContent);

      // Skip if already has new fields
      if (data.scope) {
        report.skipped++;
        continue;
      }

      // Infer taxonomy
      const inference = inferEncounterTaxonomy(
        encounter.data,
        usageMap.get(encounter.id) || []
      );

      // Apply inferred values
      data.scope = inference.scope;
      if (inference.locationTypes && inference.locationTypes.length > 0) {
        data.locationTypes = inference.locationTypes;
      }
      if (inference.factions && inference.factions.length > 0) {
        data.factions = inference.factions;
      }

      // Write back
      await writeFile(encounterPath, stringify(data), 'utf-8');

      report.modified++;
      report.details.push({
        id: encounter.id,
        changes: {
          scope: inference.scope,
          locationTypes: inference.locationTypes,
          factions: inference.factions,
        },
        confidence: inference.confidence,
        reasoning: inference.reasoning,
      });

    } catch (error) {
      report.errors.push(`${encounter.id}: ${error.message}`);
    }
  }

  return report;
}

/**
 * Infer taxonomy for an encounter based on content and usage
 * @param {Object} encounterData - The encounter data
 * @param {Array<{type: string, id: string}>} usageLocations - Where this encounter is used
 * @returns {TaxonomyInference}
 */
function inferEncounterTaxonomy(
  encounterData: any,
  usageLocations: Array<{ type: string; id: string }>
): TaxonomyInference {
  const inference: TaxonomyInference = {
    scope: 'general',
    confidence: 'medium',
    reasoning: '',
  };

  const reasoningParts: string[] = [];

  // Infer scope based on usage
  if (usageLocations.length === 0) {
    inference.scope = 'general';
    inference.confidence = 'low';
    reasoningParts.push('Not currently used anywhere, assuming general');
  } else if (usageLocations.length === 1) {
    const location = usageLocations[0];
    if (location.type === 'dungeon') {
      inference.scope = 'dungeon';
      inference.confidence = 'high';
      reasoningParts.push(`Only used in dungeon ${location.id}`);
    } else if (location.type === 'hex') {
      inference.scope = 'hex';
      inference.confidence = 'high';
      reasoningParts.push(`Only used in hex ${location.id}`);
    } else if (location.type === 'region') {
      inference.scope = 'general';
      inference.confidence = 'medium';
      reasoningParts.push('Used in region encounter table, likely general');
    }
  } else {
    // Used in multiple places
    const types = new Set(usageLocations.map(l => l.type));
    if (types.has('region') || types.size > 1) {
      inference.scope = 'general';
      inference.confidence = 'high';
      reasoningParts.push(`Used in ${usageLocations.length} locations, likely general`);
    }
  }

  // Infer locationTypes from encounter name and description
  const text = `${encounterData.id} ${encounterData.name} ${encounterData.description || ''}`.toLowerCase();
  const locationTypes = new Set<string>();

  // Wilderness indicators
  if (
    text.includes('wilderness') ||
    text.includes('forest') ||
    text.includes('patrol') ||
    text.includes('camp') ||
    text.includes('ambush') ||
    text.includes('trail') ||
    text.includes('road') ||
    text.includes('hex')
  ) {
    locationTypes.add('wilderness');
  }

  // Dungeon indicators
  if (
    text.includes('dungeon') ||
    text.includes('chamber') ||
    text.includes('room') ||
    text.includes('corridor') ||
    text.includes('crypt') ||
    text.includes('tomb') ||
    text.includes('underground') ||
    text.includes('cave')
  ) {
    locationTypes.add('dungeon');
  }

  // Default to both if unclear
  if (locationTypes.size === 0 && inference.scope === 'general') {
    locationTypes.add('wilderness');
    locationTypes.add('dungeon');
    reasoningParts.push('No clear location indicators, assuming both wilderness and dungeon');
  }

  if (locationTypes.size > 0) {
    inference.locationTypes = Array.from(locationTypes);
  }

  // Infer factions from stat blocks and encounter name
  const factions = new Set<string>();
  const knownFactions = [
    { keywords: ['legion', 'revenant'], faction: 'revenant-legion' },
    { keywords: ['bearfolk', 'bear-folk'], faction: 'bearfolk' },
    { keywords: ['alseid'], faction: 'alseid' },
    { keywords: ['kobold'], faction: 'kobolds' },
    { keywords: ['ironguard'], faction: 'ironguard' },
    { keywords: ['shadowcult', 'shadow-cult'], faction: 'shadowcult' },
    { keywords: ['dwarf', 'dwarven'], faction: 'flamehold-dwarves' },
  ];

  for (const { keywords, faction } of knownFactions) {
    if (keywords.some(keyword => text.includes(keyword))) {
      factions.add(faction);
    }
  }

  if (factions.size > 0) {
    inference.factions = Array.from(factions);
    reasoningParts.push(`Detected factions: ${Array.from(factions).join(', ')}`);
  }

  inference.reasoning = reasoningParts.join('; ');

  return inference;
}

/**
 * Build a map of encounter IDs to their usage locations
 * @param {Array} dungeons - All dungeons
 * @param {Array} hexes - All hexes
 * @param {Array} regions - All regions
 * @returns {Map<string, Array<{type: string, id: string}>>}
 */
function buildUsageMapForMigration(dungeons: any[], hexes: any[], regions: any[]): Map<string, Array<{type: string, id: string}>> {
  const usageMap = new Map();

  // Scan dungeons for encounter references
  for (const dungeon of dungeons) {
    const encounterIds = dungeon.data.encounters || [];
    for (const encounterId of encounterIds) {
      if (!usageMap.has(encounterId)) {
        usageMap.set(encounterId, []);
      }
      usageMap.get(encounterId).push({ type: 'dungeon', id: dungeon.data.id });
    }
  }

  // Scan hexes
  for (const hex of hexes) {
    const encounterIds = hex.data.encounters || [];
    for (const encounterId of encounterIds) {
      if (!usageMap.has(encounterId)) {
        usageMap.set(encounterId, []);
      }
      usageMap.get(encounterId).push({ type: 'hex', id: hex.data.id });
    }
  }

  // Scan regions
  for (const region of regions) {
    const encounterIds = extractEncounterIdsFromRegion(region.data);
    for (const encounterId of encounterIds) {
      if (!usageMap.has(encounterId)) {
        usageMap.set(encounterId, []);
      }
      usageMap.get(encounterId).push({ type: 'region', id: region.data.id });
    }
  }

  return usageMap;
}

/**
 * Extract encounter IDs from a region's encounter tables
 * @param {Object} regionData - The region data
 * @returns {string[]}
 */
function extractEncounterIdsFromRegion(regionData: any): string[] {
  const encounterIds = new Set<string>();

  if (regionData.encounters?.categoryTables) {
    for (const categoryTable of Object.values(regionData.encounters.categoryTables)) {
      for (const tierEntries of Object.values(categoryTable as any)) {
        for (const entry of tierEntries) {
          if (entry.encounterId) {
            encounterIds.add(entry.encounterId);
          }
        }
      }
    }
  }

  return Array.from(encounterIds);
}

// CLI integration
export async function runMigration() {
  console.log('Starting encounter taxonomy migration...\n');

  const report = await migrateEncounterTaxonomy();

  console.log('\n=== Migration Report ===');
  console.log(`Processed: ${report.processed}`);
  console.log(`Modified: ${report.modified}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Errors: ${report.errors.length}\n`);

  if (report.errors.length > 0) {
    console.log('Errors:');
    report.errors.forEach(err => console.log(`  - ${err}`));
    console.log('');
  }

  // Group by confidence
  const byConfidence = {
    high: report.details.filter(d => d.confidence === 'high'),
    medium: report.details.filter(d => d.confidence === 'medium'),
    low: report.details.filter(d => d.confidence === 'low'),
  };

  console.log(`High confidence: ${byConfidence.high.length}`);
  console.log(`Medium confidence: ${byConfidence.medium.length}`);
  console.log(`Low confidence: ${byConfidence.low.length}\n`);

  // Show low confidence cases for review
  if (byConfidence.low.length > 0) {
    console.log('=== Low Confidence Cases (Review Recommended) ===');
    for (const detail of byConfidence.low) {
      console.log(`\n${detail.id}:`);
      console.log(`  Scope: ${detail.changes.scope}`);
      console.log(`  Location Types: ${detail.changes.locationTypes?.join(', ') || 'none'}`);
      console.log(`  Factions: ${detail.changes.factions?.join(', ') || 'none'}`);
      console.log(`  Reasoning: ${detail.reasoning}`);
    }
  }

  console.log('\n✓ Migration complete. Review low-confidence cases and adjust as needed.');
}
```

### Running the Migration

```bash
npx tsx scripts/one-time-scripts/migrate-encounter-taxonomy.ts
```

---

## UI Changes

### Encounter List Page Filtering

**File**: `apps/web/src/pages/gm-reference/encounters/index.astro`

**Add filter UI**:

```astro
---
import { getCollection } from 'astro:content';

const encounters = await getCollection('encounters');

// Extract unique values for filters
const allScopes = [...new Set(encounters.map(e => e.data.scope))];
const allLocationTypes = [...new Set(encounters.flatMap(e => e.data.locationTypes || []))];
const allFactions = [...new Set(encounters.flatMap(e => e.data.factions || []))];
const allCreatureTypes = [...new Set(encounters.flatMap(e => e.data.creatureTypes || []))];
---

<div class="encounter-filters">
  <h2>Filter Encounters</h2>

  <div class="filter-group">
    <label>Scope:</label>
    <select id="filter-scope" multiple>
      <option value="">All</option>
      {allScopes.map(scope => <option value={scope}>{scope}</option>)}
    </select>
  </div>

  <div class="filter-group">
    <label>Location Types:</label>
    <select id="filter-location" multiple>
      <option value="">All</option>
      {allLocationTypes.map(type => <option value={type}>{type}</option>)}
    </select>
  </div>

  <div class="filter-group">
    <label>Factions:</label>
    <select id="filter-faction" multiple>
      <option value="">All</option>
      <option value="__none__">No Faction</option>
      {allFactions.map(faction => <option value={faction}>{faction}</option>)}
    </select>
  </div>

  <div class="filter-group">
    <label>Creature Types:</label>
    <select id="filter-creature" multiple>
      {allCreatureTypes.map(type => <option value={type}>{type}</option>)}
    </select>
  </div>

  <div class="filter-group">
    <label>Status:</label>
    <select id="filter-status">
      <option value="">All</option>
      <option value="used">Used</option>
      <option value="unused">Unused</option>
    </select>
  </div>

  <div class="filter-group">
    <label>
      <input type="checkbox" id="filter-leads-only" />
      Show leads only
    </label>
  </div>

  <button id="clear-filters">Clear All Filters</button>
</div>

<div class="encounter-list">
  {encounters.map(encounter => (
    <div
      class="encounter-card"
      data-scope={encounter.data.scope}
      data-locations={JSON.stringify(encounter.data.locationTypes || [])}
      data-factions={JSON.stringify(encounter.data.factions || [])}
      data-creatures={JSON.stringify(encounter.data.creatureTypes || [])}
      data-is-lead={encounter.data.isLead || false}
      data-used={encounter.data.usedIn && encounter.data.usedIn.length > 0}
    >
      <h3><a href={`/gm-reference/encounters/${encounter.id}`}>{encounter.data.name}</a></h3>
      <div class="encounter-meta">
        <span class="badge">{encounter.data.scope}</span>
        {encounter.data.isLead && (
          <span class="badge lead">Lead</span>
        )}
        {(encounter.data.locationTypes || []).map(type => (
          <span class="badge location">{type}</span>
        ))}
        {(encounter.data.factions || []).map(faction => (
          <span class="badge faction">{faction}</span>
        ))}
      </div>
      <p>{encounter.data.description}</p>
      {encounter.data.usedIn && encounter.data.usedIn.length > 0 && (
        <div class="usage-info">
          Used in: {encounter.data.usedIn.map(ref => ref.name).join(', ')}
        </div>
      )}
      {encounter.data.isLead && (
        <div class="usage-info lead-info">
          ✓ Lead encounter (always used)
        </div>
      )}
      {(!encounter.data.usedIn || encounter.data.usedIn.length === 0) && !encounter.data.isLead && (
        <div class="usage-info unused">⚠️ Unused</div>
      )}
    </div>
  ))}
</div>

<script>
  // Client-side filtering logic
  function applyFilters() {
    const scopeFilter = Array.from(document.querySelectorAll('#filter-scope option:checked')).map(o => o.value);
    const locationFilter = Array.from(document.querySelectorAll('#filter-location option:checked')).map(o => o.value);
    const factionFilter = Array.from(document.querySelectorAll('#filter-faction option:checked')).map(o => o.value);
    const creatureFilter = Array.from(document.querySelectorAll('#filter-creature option:checked')).map(o => o.value);
    const statusFilter = document.querySelector('#filter-status').value;
    const leadsOnly = document.querySelector('#filter-leads-only').checked;

    document.querySelectorAll('.encounter-card').forEach(card => {
      let visible = true;

      // Scope filter
      if (scopeFilter.length > 0 && !scopeFilter.includes('')) {
        if (!scopeFilter.includes(card.dataset.scope)) visible = false;
      }

      // Location filter
      if (locationFilter.length > 0 && !locationFilter.includes('')) {
        const locations = JSON.parse(card.dataset.locations);
        if (!locationFilter.some(f => locations.includes(f))) visible = false;
      }

      // Faction filter
      if (factionFilter.length > 0 && !factionFilter.includes('')) {
        const factions = JSON.parse(card.dataset.factions);
        const hasNoFaction = factions.length === 0;
        const wantsNoFaction = factionFilter.includes('__none__');

        if (wantsNoFaction && !hasNoFaction) visible = false;
        if (!wantsNoFaction && !factionFilter.some(f => factions.includes(f))) visible = false;
      }

      // Creature filter
      if (creatureFilter.length > 0) {
        const creatures = JSON.parse(card.dataset.creatures);
        if (!creatureFilter.some(f => creatures.includes(f))) visible = false;
      }

      // Leads filter
      if (leadsOnly && card.dataset.isLead !== 'true') {
        visible = false;
      }

      // Status filter - leads are always considered "used"
      const isLead = card.dataset.isLead === 'true';
      const isUsed = card.dataset.used === 'true' || isLead;

      if (statusFilter === 'used' && !isUsed) visible = false;
      if (statusFilter === 'unused' && isUsed) visible = false;

      card.style.display = visible ? 'block' : 'none';
    });
  }

  document.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', applyFilters);
  });

  document.querySelector('#filter-leads-only').addEventListener('change', applyFilters);

  document.querySelector('#clear-filters').addEventListener('click', () => {
    document.querySelectorAll('select').forEach(select => {
      select.selectedIndex = 0;
    });
    document.querySelector('#filter-leads-only').checked = false;
    applyFilters();
  });
</script>

<style>
  .encounter-filters {
    background: #f5f5f5;
    padding: 1rem;
    margin-bottom: 2rem;
    border-radius: 8px;
  }

  .filter-group {
    margin-bottom: 1rem;
  }

  .filter-group label {
    display: block;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  .filter-group select {
    width: 100%;
    max-width: 400px;
  }

  .encounter-card {
    border: 1px solid #ddd;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }

  .encounter-meta {
    margin: 0.5rem 0;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    margin-right: 0.5rem;
    background: #e0e0e0;
    border-radius: 3px;
    font-size: 0.875rem;
  }

  .badge.location {
    background: #bbdefb;
  }

  .badge.faction {
    background: #c8e6c9;
  }

  .badge.lead {
    background: #fff9c4;
    font-weight: bold;
  }

  .usage-info {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #666;
  }

  .usage-info.unused {
    color: #f57c00;
    font-weight: bold;
  }

  .usage-info.lead-info {
    color: #558b2f;
    font-weight: bold;
  }
</style>
```

### Encounter Detail Page Updates

**File**: `apps/web/src/pages/gm-reference/encounters/[id].astro`

**Add taxonomy display and usage links**:

```astro
---
// ... existing imports and data loading ...

const { id } = Astro.params;
const encounter = await getEntry('encounters', id);

// Get usage information (already in encounter.data.usedIn from build process)
const usedIn = encounter.data.usedIn || [];
---

<div class="encounter-taxonomy">
  <h2>Taxonomy</h2>

  <dl>
    <dt>Scope:</dt>
    <dd><span class="badge">{encounter.data.scope}</span></dd>

    {encounter.data.isLead && (
      <>
        <dt>Type:</dt>
        <dd><span class="badge lead">Lead</span></dd>
      </>
    )}

    {encounter.data.locationTypes && encounter.data.locationTypes.length > 0 && (
      <>
        <dt>Location Types:</dt>
        <dd>
          {encounter.data.locationTypes.map(type => (
            <span class="badge location">{type}</span>
          ))}
        </dd>
      </>
    )}

    {encounter.data.factions && encounter.data.factions.length > 0 && (
      <>
        <dt>Factions:</dt>
        <dd>
          {encounter.data.factions.map(faction => (
            <span class="badge faction">{faction}</span>
          ))}
        </dd>
      </>
    )}

    {encounter.data.creatureTypes && encounter.data.creatureTypes.length > 0 && (
      <>
        <dt>Creature Types:</dt>
        <dd>
          {encounter.data.creatureTypes.map(type => (
            <span class="badge creature">{type}</span>
          ))}
        </dd>
      </>
    )}
  </dl>
</div>

{usedIn.length > 0 && (
  <div class="encounter-usage">
    <h2>Used In</h2>
    <ul>
      {usedIn.map(ref => (
        <li>
          {ref.type === 'dungeon' && (
            <a href={`/gm-reference/dungeons/${ref.id}`}>{ref.name} (Dungeon)</a>
          )}
          {ref.type === 'hex' && (
            <a href={`/gm-reference/hexes/${ref.id}`}>{ref.name} (Hex)</a>
          )}
          {ref.type === 'region' && (
            <a href={`/gm-reference/regions/${ref.id}`}>{ref.name} (Region)</a>
          )}
        </li>
      ))}
    </ul>
  </div>
)}

{encounter.data.isLead && usedIn.length === 0 && (
  <div class="encounter-usage">
    <p>✓ This is a lead encounter (faction intelligence).</p>
  </div>
)}

{usedIn.length === 0 && !encounter.data.isLead && (
  <div class="encounter-usage unused">
    <p>⚠️ This encounter is not currently used anywhere.</p>
  </div>
)}

<!-- Rest of encounter detail page -->
```

---

## Documentation Updates

### Update Encounter System Spec

**File**: `docs/specs/encounter-system.md`

Add new section:

```markdown
## Encounter Taxonomy

### Overview

Encounters are classified using a two-axis system:

1. **Manual taxonomy** - contextual tags for filtering
2. **Automated usage tracking** - where encounters are referenced

### Taxonomy Fields

#### Scope

Indicates design intent and coupling:

- `general`: Usable anywhere, generic design
- `hex`: Specific to a particular hex
- `region`: Specific to regional themes/factions
- `dungeon`: Tightly coupled to a specific dungeon's narrative

#### Location Types

Where the encounter can be used (required for general-scope encounters):

- `wilderness`: Outdoor hex exploration
- `dungeon`: Structured interior locations

Encounters can have multiple location types (e.g., `[wilderness, dungeon]` for encounters that work in both contexts).

#### Factions

Optional array of faction IDs involved in the encounter. Omitted when not applicable (e.g., wildlife encounters).

Valid factions:
- `alseid`
- `bearfolk`
- `beldrunn-vok`
- `blackthorns`
- `flamehold-dwarves`
- `kobolds`
- `revenant-legion`
- `servitors`
- `three-dukes`
- `veil-shepherds`

#### Is Lead

Optional boolean flag that marks an encounter as a "lead" - faction intelligence that points players toward content. Lead encounters:
- Display a "Lead" badge in the UI
- Are always considered "used" (never show as unused)
- Can be filtered with "Show leads only" checkbox

This is used for encounters where factions provide information about threats or opportunities in the region.

#### Creature Types

Automatically derived from stat blocks during build process. Includes D&D creature types like:
- `aberration`, `beast`, `celestial`, `construct`, `dragon`, `elemental`, `fey`, `fiend`, `giant`, `humanoid`, `monstrosity`, `ooze`, `plant`, `undead`

### Usage Tracking

The `usedIn` field is automatically populated during build by scanning:
- Dungeon `encounters` arrays
- Hex `encounters` arrays
- Region encounter tables

Each usage reference includes:
- `type`: 'hex', 'region', or 'dungeon'
- `id`: The content ID
- `name`: Display name

### Filtering Encounters

The encounter list page supports filtering by:
- **Scope**: general, hex, region, dungeon
- **Location Types**: wilderness, dungeon
- **Factions**: Any faction or "No Faction"
- **Creature Types**: Any D&D creature type
- **Status**: Used or Unused (leads always count as "used")
- **Leads Only**: Checkbox to show only lead encounters

All filters can be combined (AND logic) for precise queries like "show me all unused general-purpose wilderness encounters involving the Revenant Legion."

### Example Encounter

\`\`\`yaml
id: legion-patrol
name: Legion Patrol
scope: general
locationTypes: [wilderness]
factions: [revenant-legion]
description: A patrol of Legion soldiers investigating reports in the area.
contentPath: ./legion-patrol.md
statBlocks:
  - legion-soldier
  - legion-lieutenant

# These fields are auto-populated at build time:
creatureTypes: [undead]
usedIn:
  - type: region
    id: region-7
    name: The Floating Fen
  - type: hex
    id: s18
    name: Misty Hollow
\`\`\`

### Example Lead Encounter

```yaml
id: bearfolk-intelligence-undead-camp
name: Bearfolk Intelligence - Undead Camp
scope: general
locationTypes: [wilderness]
factions: [bearfolk, revenant-legion]
isLead: true
description: Bearfolk scouts report seeing an undead encampment three hexes to the west.
statBlocks:
  - bearfolk-scout

# This encounter is not referenced anywhere but isLead: true marks it as "used"
creatureTypes: [humanoid]
usedIn: []
```
```

---

## Testing Plan

### Schema Validation

1. Run build with new schemas
2. Verify Zod validation catches:
   - Missing locationTypes on general-scope encounters
   - Invalid enum values
   - Invalid scope values

### Migration Script Testing

1. Run migration on test subset of encounters
2. Review generated report
3. Spot-check low-confidence inferences
4. Verify YAML syntax remains valid

### Build Process Testing

1. Verify creature types are correctly derived
2. Verify usage tracking correctly identifies all references
3. Verify encounter detail pages show usage information
4. Check performance impact of build-time processing

### UI Testing

1. Test all filter combinations work correctly
2. Verify "unused" encounters are correctly identified
3. Test encounter detail page displays taxonomy
4. Verify usage links navigate correctly

---

## Rollout Plan

### Phase 1: Schema and Build Process

1. Update encounter, dungeon, hex, region schemas
2. Implement creature type derivation
3. Implement usage tracking
4. Update build configuration
5. Test build with existing data (new fields optional, backward compatible)

### Phase 2: Migration

1. Run migration script
2. Review migration report
3. Manually adjust low-confidence cases
4. Commit migrated encounter files

### Phase 3: UI Implementation

1. Update encounter list page with filters
2. Update encounter detail page with taxonomy display
3. Test filtering functionality
4. Deploy to staging

### Phase 4: Documentation and Validation

1. Update documentation
2. Validate all encounters have proper taxonomy
3. Review "unused" encounters list
4. Deploy to production

---

## Future Enhancements

### Possible Additions

- **Difficulty tags**: Easy, medium, hard for quick encounter scaling
- **Environment tags**: More specific than locationTypes (e.g., forest, mountain, swamp)
- **Season tags**: Winter-specific encounters, etc.
- **Tier filtering**: Show encounters appropriate for party tier

### Considerations

- Keep taxonomy lightweight and maintainable
- Only add fields that support real filtering needs
- Prefer automated derivation over manual tagging where possible

---

## Success Criteria

✓ All 60+ encounters have scope and locationTypes tags
✓ Build process successfully derives creature types
✓ Usage tracking correctly identifies all references
✓ Encounter list page supports multi-axis filtering
✓ Can easily identify unused encounters
✓ Migration script generates useful report for review
✓ No breaking changes to existing content
✓ Documentation is complete and accurate
