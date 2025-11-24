# Encounter System Specification

## Overview

The encounter system manages D&D encounters for the Skyreach hexcrawl campaign. It provides structured data for encounters, supports rich narrative content, and integrates with encounter tables for random generation with tiered difficulty resolution.

---

## Content Management

### Schema

Encounters are defined using the `EncounterSchema` in `packages/schemas/src/schemas/encounter.ts`:

```typescript
export const EncounterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    contentPath: z.string().optional(),
    statBlocks: z.array(z.string()),

    // Taxonomy fields (see "Encounter Taxonomy" section)
    scope: z.enum(['general', 'hex', 'region', 'dungeon']),
    locationTypes: z.array(z.enum(['wilderness', 'dungeon'])).optional(),
    factions: z.array(FactionEnum).optional(),

    // Derived fields (populated at build time)
    isLead: z.boolean().optional(),
    creatureTypes: z.array(CreatureTypeEnum).optional(),
    usedIn: z.array(UsageReferenceSchema).optional(),
  })
  .refine(
    (data) => data.description || data.contentPath,
    { message: "Either 'description' or 'contentPath' must be provided" }
  )
  .refine(
    (data) => data.scope !== 'general' || (data.locationTypes && data.locationTypes.length > 0),
    { message: "locationTypes is required for general-scope encounters", path: ['locationTypes'] }
  )
  .describe('EncounterSchema');
```

### Fields

#### Required Fields

- **`id`**: Unique identifier for the encounter (kebab-case)
- **`name`**: Display name of the encounter
- **`statBlocks`**: Array of stat block IDs referenced by this encounter
- **`scope`**: Design intent - `general`, `hex`, `region`, or `dungeon`

#### Taxonomy Fields

- **`locationTypes`**: Array of `wilderness` and/or `dungeon` (required for general-scope)
- **`factions`**: Array of faction IDs involved (optional, omit for wildlife encounters)

#### Derived Fields (populated at build time)

- **`isLead`**: Automatically set if encounter is referenced in roleplay book intelligence reports

- **`creatureTypes`**: Automatically derived from stat block creature types
- **`usedIn`**: Automatically populated by scanning dungeons, hexes, and regions

#### Optional Fields

- **`description`**: Short summary text (inline in YAML)
  - Used for: lists, tables, random encounter displays, GM quick reference
  - Typically 1-3 sentences
  - Stored directly in the YAML file

- **`contentPath`**: Relative path to external markdown file
  - Used for: detailed narrative content on encounter detail pages
  - Path resolved relative to the YAML file's location (not repo root)
  - Example: `./abandoned-watchtower.md` or `abandoned-watchtower.md`
  - Typically co-located with the YAML file in the same directory

### Content Strategy

Encounters support three content patterns:

1. **Summary Only**: Just `description` field
   - Quick, minimal encounters
   - Sufficient for simple random encounters

2. **Detailed Only**: Just `contentPath` field
   - Rich narrative encounters
   - Generated content with extensive detail

3. **Both Summary and Detail**: Both fields present
   - `description` serves as quick reference/preview
   - `contentPath` provides full narrative content
   - Recommended for complex encounters

### File Structure

```
data/encounters/
├── goblin-ambush.yaml           # Encounter metadata
├── goblin-ambush.md             # Detailed content (optional, co-located)
├── abandoned-watchtower.yaml
├── abandoned-watchtower.md
└── merchant-caravan.yaml        # No .md file = summary only
```

**Note**: Markdown content files are co-located with their YAML files in the same directory for simplicity and maintainability.

### Example: Minimal Encounter

```yaml
id: goblin-patrol
name: Goblin Patrol
description: A group of 3-5 goblins on patrol, armed with shortbows and scimitars.
statBlocks:
  - goblin
```

### Example: Detailed Encounter

```yaml
id: abandoned-watchtower
name: Abandoned Watchtower
description: Ancient stone watchtower, partially collapsed, with signs of recent occupation.
contentPath: ./abandoned-watchtower.md
statBlocks:
  - bandit-captain
  - bandit
```

**File location**: `data/encounters/abandoned-watchtower.yaml`
**Content file**: `data/encounters/abandoned-watchtower.md` (co-located)

### Rendering Logic

#### List/Table Views

When displaying encounters in lists or tables:
- Show `name` and `description` (if present)
- Do NOT load `contentPath` content (performance)
- Provide link to full encounter page

#### Detail Pages

When displaying a single encounter:
1. Render `description` (if present) as summary section
2. Load and render markdown from `contentPath` (if present)
3. Display stat blocks
4. Show related roleplay books (if stat blocks match)

#### Processing External Content

```typescript
// Pseudo-code for loading external markdown
if (encounter.contentPath) {
  // Resolve path relative to the YAML file's directory
  const yamlDir = dirname(encounterYamlPath);
  const fullPath = join(yamlDir, encounter.contentPath);

  const markdownContent = await readFile(fullPath, 'utf-8');
  const renderedContent = await renderMarkdown(markdownContent);
  // Render to page
}
```

**Path Resolution**: The `contentPath` is always resolved relative to the directory containing the encounter's YAML file. This allows for co-location and keeps paths simple (e.g., `./goblin-ambush.md` or just `goblin-ambush.md`).

### Validation

- At least one of `description` or `contentPath` must be provided (enforced by schema refinement)
- If `contentPath` is provided, file must exist when resolved relative to YAML file's directory (enforced at build time)
- `contentPath` should be relative, not absolute (convention, not enforced)
- Co-location recommended: markdown files in same directory as YAML files

### Migration Strategy

For bulk-generated encounters:
1. Generate markdown files with full narrative content
2. Create YAML files with `contentPath` references
3. Optionally add `description` summaries later for UI purposes
4. No breaking changes - both fields optional individually

---

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

**Automatically derived field** - set to `true` during build process if the encounter is referenced in any roleplay book intelligence report (via the `linkPath` field).

Lead encounters:
- Display a "Lead" badge in the UI
- Are always considered "used" (never show as unused)
- Can be filtered with the Leads dropdown (All / Leads / Non-leads)
- Represent faction intelligence that points players toward content

**How it works**: The build process scans all roleplay books for intelligence report entries where `linkPath` contains `/gm-reference/encounters/`. Any encounter found this way is automatically marked as a lead.

**No manual tagging needed** - simply link to an encounter from an intelligence report and it becomes a lead automatically.

#### Creature Types

Automatically derived from stat blocks during build process. Includes D&D creature types like:
- `aberration`, `beast`, `celestial`, `construct`, `dragon`, `elemental`, `fey`, `fiend`, `giant`, `humanoid`, `monstrosity`, `ooze`, `plant`, `undead`

### Usage Tracking

The `usedIn` field is automatically populated during build by scanning:
- Dungeon `encounters` arrays
- Hex `encounters` arrays and `encounterOverrides`
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
- **Leads**: All / Leads / Non-leads

All filters can be combined (AND logic) for precise queries like "show me all unused general-purpose wilderness encounters involving the Revenant Legion."

### Example Encounter with Taxonomy

```yaml
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
# creatureTypes: [undead]
# usedIn:
#   - type: region
#     id: region-7
#     name: The Floating Fen
```

### Build-Time Processing

Taxonomy processing happens in `apps/web/src/utils/`:

- **`encounter-processor.ts`**: Derives creature types from stat blocks
- **`encounter-usage-tracker.ts`**: Builds usage map by scanning dungeons, hexes, regions
- **`load-augmented-encounters.ts`**: Main loader combining both processors

### Dungeon Encounter Validation

For dungeons with encounter content, a validation script ensures frontmatter stays in sync with content:

```bash
npm run validate:dungeons  # from apps/web
```

This checks that:
- All encounters in frontmatter are linked in content via `getEncounterPath()`
- All `getEncounterPath()` calls have corresponding frontmatter entries

---

## Encounter Staging System

Each encounter can exist in **three stages** based on timing and player interaction. The GM chooses which stage to use based on:
- What the party has seen/done recently
- How much immediate action feels right
- What would make sense fictionally

**No tracking required** - this is pure GM intuition at the table, not a campaign status to record.

### The Three Stages

**Evidence Stage (Aftermath or Clue)**
- "You find signs this happened"
- The event is over; only traces remain
- Gives players information and choice about whether to investigate further
- Lower tension, investigation-focused
- Example: Empty revenant camp with drag marks leading into a cave

**In-progress Stage (Active Encounter)**
- "This is happening now, what do you do?"
- Immediate decision required: interfere, observe, join, attack, flee
- Creates tension and urgency
- Example: Revenants actively performing a ritual to awaken more of their kind

**Consequence Stage (Follow-up or Escalation)**
- "Because this happened before, now this occurs"
- The situation has evolved or worsened
- Shows how the world changes when players don't (or do) intervene
- Can reference previous player actions
- Example: Ritual is complete; area is now permanently corrupted and patrols changed

### Using the Stages

**At the table:**
- Roll encounter from intelligence reports
- Look at the three stage options in the encounter write-up
- Pick whichever feels right for the moment
- No need to remember which stage you used before

**When writing encounters:**
- Each encounter should have all three stages defined
- Stages should feel connected but work independently
- Evidence → In Progress → Consequence shows natural progression
- Players can jump in at any stage depending on timing

### Example: Crystal Corruption

**Evidence:** Party finds area where nothing grows, geometric patterns of death, faint necromantic aura. Black crystal shards visible in soil.

**In Progress:** 2-3 revenants placing black crystal shards in ritual pattern. Party can interrupt, observe, or avoid.

**Consequence:** Ritual complete. Area permanently corrupted - no vegetation, animals avoid it, sleeping here causes nightmares. Hex properties changed.

**Key principle:** The staging gives you **three pre-written responses to the same basic situation**, and you just eyeball which one fits the moment. No campaign tracking needed.

### Full Example Encounter: The Crystal Corruption

**Core Concept:** An area shows signs of spreading black crystal corruption - different from normal First Civilization crystals. This is where revenants have been active or where their influence is growing.

#### Evidence Stage (Clue)
The party notices vegetation dying in geometric patterns radiating from a central point. Close inspection reveals thin black crystal filaments spreading through the soil like veins. Animals avoid the area. If examined magically, the crystals emit a faint necromantic aura mixed with something alien/void-touched.

**What it reveals:** Something unnatural is spreading here. The geometric pattern suggests intelligence/purpose, not random decay.

**Potential follow-up:** Tracking the crystal veins leads toward their source (a crypt entrance, a revenant patrol route, or a ritual site).

#### In-progress Stage (Active Encounter)
The party arrives to find 2-3 revenants (undead soldiers) methodically placing black crystal shards at specific points around a clearing or ruin. They move with military precision, completely focused on their task. They're creating a ritual circle or reinforcing a seal - either to awaken more of their kind or to mark territory.

**Immediate choices:**
- Interrupt them (combat)
- Observe to learn what they're doing
- Avoid and mark the location
- Attempt to disrupt the ritual after they leave

**Scaling:** Solo revenant for small party, or add a revenant officer with black crystal embedded in its skull (retains tactical intelligence) for larger/higher-level groups.

#### Consequence Stage (Follow-up)
The ritual is complete. The area is now permanently corrupted - vegetation won't grow, animals won't enter, and spending the night here causes disturbing dreams of "the old hunger" and "marching formations."

If the party previously encountered this location:
- **If they stopped the ritual:** They find evidence revenants returned and completed it by force, possibly with greater numbers
- **If they observed:** The corruption has spread to neighboring hexes
- **If they did nothing:** Local factions (bearfolk, alseid) now avoid this area and may seek the party's help

**Changed hex properties:** This area now counts as Revenant Legion territory. Random encounters here are more likely to be undead. The corruption can be cleansed, but requires significant ritual work or destroying the source.

---

## Encounter Tables

### Overview

[TODO: Document encounter table structure]

- Main table with weighted categories
- Category tables with tiered subtables
- Encounter table entries reference encounters and include weights for selection probability

### Schema

[TODO: Document EncounterTableSchema]

### File Structure

[TODO: Document table file organization]

---

## Tiered Resolution

### Overview

[TODO: Document tiered encounter resolution system]

- How party tier is determined
- Matching encounters to appropriate difficulty
- Fallback behavior when no tier match exists

### Resolution Algorithm

[TODO: Document the algorithm for resolving encounters based on party tier]

### Configuration

[TODO: Document any configuration for tier thresholds or difficulty scaling]

---

## Stat Block Integration

### Overview

[TODO: Document how stat blocks are referenced and loaded]

### Roleplay Book Matching

[TODO: Document how roleplay books are matched to encounters via stat block keywords]

---

## Random Encounter Generation

### Overview

[TODO: Document the workflow for generating random encounters]

### Weighting System

[TODO: Document how weights affect encounter selection probability]

---

## CLI Tools

### Overview

[TODO: Document CLI commands for encounter management]

### Commands

[TODO: List and document encounter-related CLI commands]

- `weave apply encounters` - [TODO]
- Other relevant commands

---

## Data Integrity

### Validation Rules

[TODO: Document validation rules beyond schema]

- Stat block references must exist
- Content files must exist if referenced

### Testing Strategy

[TODO: Document how encounter data is tested]

---

## Future Considerations

### Potential Enhancements

- **Encounter variants**: Multiple versions of the same encounter with different difficulties
- **Dynamic content**: Template variables in markdown for runtime customization
- **Media support**: Images, maps, handouts referenced from encounter data
- **Conditional content**: Show/hide content based on campaign state
- **Tags/categories**: Additional classification beyond stat blocks

### Open Questions

- Should we support multiple `contentPath` entries for modular content sections?
- Should we add a `shortDescription` field separate from `description` for even more granular control?
- How do we handle encounter scaling (adjusting difficulty on the fly)?
