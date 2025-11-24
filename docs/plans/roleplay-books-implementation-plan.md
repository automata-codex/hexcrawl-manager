# Roleplay Books Implementation Plan

## Overview

This plan details the steps to promote roleplay books from being a special type of article to their own first-class content collection with support for intelligence reports tables.

## Current State

- **Location**: `data/articles/roleplay-books/*.mdx`
- **Collection**: Part of the `articles` collection
- **Integration**: Hardcoded lookup in `apps/web/src/pages/gm-reference/encounters/[id].astro` via `ROLEPLAY_BOOKS` array
- **Rendering**: Uses `renderSubArticleMarkdown()` for body content

## Target State

- **Location**: `data/roleplay-books/*.yml`
- **Collection**: New `roleplay-books` collection
- **Schema**: TypeScript schema with intelligence reports support
- **Integration**: Same encounter matching logic, but using new collection
- **Rendering**: New React/Astro component for intelligence reports table

---

## Implementation Steps

### Phase 1: Schema and Type Definitions

#### 1.1 Create TypeScript Schema (`packages/schemas/src/schemas/roleplay-book.ts`)

```typescript
import { z } from 'zod';

// Intelligence report row schema
export const IntelligenceReportRowSchema = z.object({
  roll: z.number(),
  report: z.string(),
  sampleDialogue: z.string(),
  relevantConditions: z.string(),
});

export type IntelligenceReportRow = z.infer<typeof IntelligenceReportRowSchema>;

// Full roleplay book schema
export const RoleplayBookSchema = z.object({
  // Basic metadata
  name: z.string(),
  keyword: z.string(), // Used for matching against stat block IDs

  // Cultural overview
  culturalOverview: z.string(),

  // Prithara variants
  pritharaVariants: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),

  // RP & Voice notes
  rpVoiceNotes: z.array(z.string()),

  // Lore hooks & hints
  loreHooks: z.array(z.string()),

  // Sample dialogue
  sampleDialogue: z.array(z.string()),

  // Intelligence reports (optional)
  intelligenceReports: z.object({
    instructions: z.string().optional(), // Instructions for when to add reports
    rows: z.array(IntelligenceReportRowSchema),
  }).optional(),
});

export type RoleplayBookData = z.infer<typeof RoleplayBookSchema>;

// Collection entry type
export type RoleplayBookEntry = {
  id: string;
  data: RoleplayBookData;
};
```

#### 1.2 Export from index (`packages/schemas/src/schemas/index.ts`)

Add to exports:
```typescript
export * from './roleplay-book';
```

#### 1.3 Generate JSON Schema

Run schema generation:
```bash
npm run generate:schemas
```

This should create `packages/schemas/dist/roleplay-book.schema.json`

---

### Phase 2: Content Collection Setup

#### 2.1 Create Data Directory

```bash
mkdir -p data/roleplay-books
```

#### 2.2 Configure Content Collection (`apps/web/src/content.config.ts`)

Add imports:
```typescript
import { RoleplayBookSchema } from '@skyreach/schemas';
import type { RoleplayBookData } from '@skyreach/schemas';
```

Add collection definition:
```typescript
const roleplayBooks = defineCollection({
  loader: getDirectoryYamlLoader<RoleplayBookData>(DIRS.ROLEPLAY_BOOKS),
  schema: RoleplayBookSchema,
});
```

Add to collections export:
```typescript
export const collections = {
  articles,
  bounties,
  characters,
  classes,
  dungeons,
  encounters,
  factions,
  floatingClues,
  hexes,
  'loot-packs': lootPacks,
  'map-paths': mapPaths,
  npcs,
  players,
  regions,
  'roleplay-books': roleplayBooks, // NEW
  rumors,
  sessions,
  statBlocks,
  supplements,
  trails,
};
```

#### 2.3 Update Directory Constants (`apps/web/src/content.config.ts`)

Add to `DIRS` object:
```typescript
const DIRS = {
  ARTICLES: `${DATA_DIR}/articles`,
  BOUNTIES: `${DATA_DIR}/bounties`,
  CHARACTERS: `${DATA_DIR}/characters`,
  CLASSES: `${DATA_DIR}/classes`,
  DUNGEONS: `${DATA_DIR}/dungeons`,
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  FACTIONS: `${DATA_DIR}/factions`,
  FLOATING_CLUES: `${DATA_DIR}/floating-clues`,
  HEXES: `${DATA_DIR}/hexes`,
  LOOT_PACKS: `${DATA_DIR}/loot-packs`,
  MAP_PATHS: `${DATA_DIR}/map-paths`,
  NPCS: `${DATA_DIR}/npcs`,
  PLAYERS: `${DATA_DIR}/players`,
  REGIONS: `${DATA_DIR}/regions`,
  ROLEPLAY_BOOKS: `${DATA_DIR}/roleplay-books`, // NEW
  RUMORS: `${DATA_DIR}/rumors`,
  SESSIONS: `${DATA_DIR}/sessions`,
  STAT_BLOCKS: `${DATA_DIR}/stat-blocks`,
  SUPPLEMENTS: `${DATA_DIR}/supplements`,
} as const;
```

#### 2.4 Update TypeScript Types (`apps/web/src/types.ts`)

Add roleplay book entry type:
```typescript
import type { RoleplayBookEntry as RoleplayBookEntryBase } from '@skyreach/schemas';

export type RoleplayBookEntry = RoleplayBookEntryBase;
```

---

### Phase 3: Data Migration

#### 3.1 Convert MDX to YAML

Create the following YAML files in `data/roleplay-books/`:

**`bearfolk.yml`:**
```yaml
name: "Roleplay Book: Bearfolk"
keyword: "bearfolk"
culturalOverview: |
  Bearfolk live in small, independent clans scattered across Baruun Khil's wilderness. Each clan is led by democratically chosen elders who serve as spiritual guides and mediators rather than rulers. Their worldview centers on relationships with individual spirits tied to specific places, animals, and natural phenomena - not an abstract "nature" but particular beings with names, personalities, and histories.

  Key cultural elements:

  - **Apprenticeship tradition:** Young bearfolk train under guides (spiritual specialists) or craftspeople, learning through practical mentorship
  - **Trading posts:** Seasonal gathering places where clans exchange goods, stories, and knowledge
  - **Spiritual practice:** Offerings and relationship-building with specific spirits; elders maintain these connections
  - **Material culture:** Rich traditions in leatherwork, carved wood totems, woven grasses, and preserved foods

pritharaVariants:
  - name: "P'ratha"
    description: "Soft and resonant; often used in storytelling"
  - name: "Urthara"
    description: "Means \"rootland\" or \"deep homeland\" in their tongue; spiritual connotation"

rpVoiceNotes:
  - "Deep, slow cadence, as if speaking every word with deep wisdom. Gravitas in even simple speech."
  - "Prefers parable and metaphor over direct statement."
  - "May close their eyes when speaking of ancestral things."
  - "Repeats phrases for emphasis and rhythm, especially in storytelling."
  - "References specific spirits by name rather than abstract \"nature\" (e.g., \"Stone-That-Listens\" not \"the mountain spirit\")"
  - "Speaks of places with personal connection: \"the meadow where Grandfather taught me to fish\" not \"a meadow\""

loreHooks:
  - "\"Urthara sleeps under our paws\" implies a forgotten Velari site nearby"
  - "\"The land remembers Tharaan\" hints at ambient Velari crystal growth in the region"
  - "\"When P'ratha calls, we answer\" may be the opening to an ancient bearfolk oath"
  - "References to \"the broken people\" (their term for the Servitors)"
  - "May mention specific spirits' behaviors as omens (e.g., \"Three-Claw-Brook has gone silent\")"

sampleDialogue:
  - "The stone cracked. The sky wept. But P'ratha stood. We stood."
  - "You walk where Moss-on-Stone watches. Show respect, and the path will open."
  - "Our guide spoke with Fire-That-Dances. She says: the hungry dead march when the moon hides."

intelligenceReports:
  instructions: "Roll d10 or choose based on location and recent events. When mentioned, note which hex to add as hidden site during post-session cleanup."
  rows:
    - roll: 1
      report: "Dream Sickness Spreading (→ Encounter: Dream Sickness)"
      sampleDialogue: "Three of our hunters wake screaming. They speak of endless marching, of a voice that commands service. Our elders say: this - it poisons the spirit, not the body."
      relevantConditions: "Party within 2-3 hexes of black crystal corruption or Revenant Legion activity. Add \"Dream-Sick Camp\" to appropriate hex."

    - roll: 2
      report: "Dead Ground Found (→ Encounter: Crystal Corruption)"
      sampleDialogue: "We found a place where nothing grows. The earth is cold. The pattern - straight lines, perfect circles - this is not P'ratha's way. We marked it with stones so our young ones know to stay away."
      relevantConditions: "Recent Revenant Legion ritual activity. Add \"Dead Meadow\" or \"Crystal Corruption Site\" to hex matching bearfolk territory."

    - roll: 3
      report: "Strange Soldiers Seen (→ Encounter: Lost Patrol)"
      sampleDialogue: "We saw your people in the forest - the ones with metal shirts and sharp sticks. They moved in straight lines. They did not eat. They did not sleep. We watched for two days. They only marched. We did not approach."
      relevantConditions: "Fort Dagaric patrols have gone missing. Add \"Patrol Route of the Changed\" to hex between bearfolk territory and Fort Dagaric."

    - roll: 4
      report: "Unsealed Tomb Discovered (→ Encounter: Unsealed Barrow)"
      sampleDialogue: "The old place on the ridge - the one we do not enter - its stone door stands open. We hear sounds at night: metal scraping stone, voices in the Old Tongue. The spirits there are angry... or afraid."
      relevantConditions: "Party near Dragon Empire ruins. Add \"Opened Barrow\" to hex with ancient ruins."

    - roll: 5
      report: "Kobold Expansion Warning (→ Kobold Encounter)"
      sampleDialogue: "The scale-kin dig new holes in the eastern hills. They carry banners with dragon-marks. They sing songs of glory and conquest. Three clans have moved their camps away. We think they seek something beneath the earth."
      relevantConditions: "Kobold activity increasing in borderlands. Add \"New Kobold Tunnels\" to hex on alseid/kobold border."

    - roll: 6
      report: "Alseid Request Aid (→ Alseid Encounter or Clue)"
      sampleDialogue: "The swift-footed ones sent a messenger. Their sacred pool has been... touched. Made wrong. They ask if you know the ways of cleansing. They offer honey and safe passage in return."
      relevantConditions: "Alseid territory experiencing desecration. Add \"Defiled Sacred Pool\" to alseid hex."

    - roll: 7
      report: "Strange Marks in Territory (→ Clue: Blackthorns Operating)"
      sampleDialogue: "We found marks carved in trees near the old stone tower. Made with metal, not claw. Five petals in a circle, like a flower that grows nowhere. The camp was empty but recently used. Someone watches these lands who does not belong."
      relevantConditions: "Party in Regions 16-18. Add \"Marked Trees at Collapsed Tower\" to appropriate hex."

    - roll: 8
      report: "Ancient Machinery Awakening (→ Servitor Encounter)"
      sampleDialogue: "The broken people walk again in the valley of standing stones. We saw one - tall as three bears, made of metal and crystal. It moved with purpose, repairing the old things. We do not know if this is good or ill, but the spirits are... stirring."
      relevantConditions: "Party near First Civilization ruins. Add \"Active Servitor Site\" to hex with Velari ruins."

    - roll: 9
      report: "Dangerous Beast Sighted (→ Beast Encounter)"
      sampleDialogue: "A great beast moves through the northern woods. Twice the size of our largest warrior. Its eyes glow with wrongness. Claw-marks on trees stand higher than a man can reach. We track it, but carefully. It hunts with intelligence, not just hunger."
      relevantConditions: "Party in wilderness areas. Add \"Great Beast Territory\" to appropriate hex - could be corrupted creature, dire animal, or void-touched monstrosity."

    - roll: 10
      report: "Trading Post Gossip (→ Variable Clues)"
      sampleDialogue: "At the gathering-place, we heard strange tales: wagoneers speaking of haunted roads, miners finding black stones that whisper, scouts seeing lights where no fires burn. Many threads weave through these woods. Which will you follow?"
      relevantConditions: "Party near bearfolk trading posts. This is a catch-all for introducing multiple minor rumors - choose 2-3 that fit current plots."
```

**`alseid.yml`:**
```yaml
name: "Roleplay Book: Alseid"
keyword: "alseid"
culturalOverview: |
  Alseid are an intelligent, forest-dwelling species with a centauroid body plan. They have many deer-like traits, including antlers that grow from their heads and hooves instead of feet. They are known for their deep connection to nature, particularly the land they inhabit.

pritharaVariants:
  - name: "Thalaira"
    description: "Poetic, reverent. Used in songs and rituals."
  - name: "Prithal"
    description: "Common among traveling bands."

rpVoiceNotes:
  - "Light, melodic tones; phrases often resemble poetry."
  - "Favors metaphor, indirect speech, and evocative imagery."
  - "Might pause and \"listen\" before answering, as if consulting the land."
  - "Refers to the land as a *personified spirit*."

loreHooks:
  - "May refer to the \"wound beneath Thalaira\"—a Velari ruin or damaged conduit."
  - "\"The humming root\" is actually a buried magical collector."
  - "A lullaby sung in full may contain **encoded directions** to a sacred site."

sampleDialogue:
  - "You ask about the storm, stranger? *Thalaira* has turned in her sleep. She remembers… something."
```

**`gearforged.yml`:**
```yaml
name: "Roleplay Book: Gearforged"
keyword: "gearforged"
culturalOverview: |
  Gearforged are constructed beings, souls bound into mechanical bodies. They retain their memories and personalities from their previous lives, but exist in a form that is both resilient and alien to their former existence.

pritharaVariants: []

rpVoiceNotes:
  - "Mechanical precision in speech; may pause to \"process\" complex emotional topics."
  - "Some retain quirks from their former life; others speak with unsettling formality."
  - "May describe sensations in mechanical terms: \"my gears grind\" instead of \"I'm frustrated.\""

loreHooks:
  - "Gearforged remember their creation - some have knowledge of the forgemasters who built them."
  - "Older gearforged may have fragmentary memories of the Dragon Empire's fall."

sampleDialogue:
  - "The logic is sound, but my memory-gears spin when I consider it. I was... afraid once. I remember the shape of fear."
```

**`kobolds.yml`:**
```yaml
name: "Roleplay Book: Kobolds"
keyword: "kobold"
culturalOverview: |
  Kobolds are a small, reptilian species known for their cunning and resourcefulness. They are often found in caves or underground, where they build intricate tunnels and traps. Kobolds are known for their loyalty to their clans and their fierce protectiveness of their territory.

pritharaVariants:
  - name: "P'tra"
    description: "Common shorthand; clipped and efficient."

rpVoiceNotes:
  - "Raspy, suspicious, and evil minion-like."
  - "Proud, clever, and suspicious—may test PCs before trusting."
  - "May inject speech with clan jargon or encoded phrases."

loreHooks:
  - "Kobold maps label ruins as **\"Old Parka\"**—their term for ancient Velari caches."
  - "**P'tra** might be used in war-paint symbols or mural chants."

sampleDialogue:
  - "We came from *P'tra*. Not your maps. Old bones, old roots, old fire. Ours now."
```

#### 3.2 Delete Old MDX Files

After confirming the YAML files work:
```bash
rm data/articles/roleplay-books/*.mdx
```

#### 3.3 Update Routes Config

In `apps/web/src/config/routes.ts`, the roleplay book routes can stay the same since they're referencing URL paths, not file locations.

---

### Phase 4: Component Development

#### 4.1 Create Intelligence Reports Component

Create `apps/web/src/components/IntelligenceReportsTable.astro`:

```astro
---
import type { IntelligenceReportRow } from '@skyreach/schemas';

interface Props {
  instructions?: string;
  rows: IntelligenceReportRow[];
}

const { instructions, rows } = Astro.props;
---

<style>
  .intelligence-reports {
    margin-top: 2rem;
  }

  .instructions {
    font-style: italic;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: var(--bulma-scheme-main-bis);
    border-left: 3px solid var(--bulma-link);
  }

  .reports-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  .reports-table th {
    background-color: var(--bulma-scheme-main-ter);
    border: 1px solid var(--bulma-border);
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
  }

  .reports-table td {
    border: 1px solid var(--bulma-border);
    padding: 0.75rem;
    vertical-align: top;
  }

  .reports-table tbody tr:nth-child(even) {
    background-color: var(--bulma-scheme-main-bis);
  }

  .reports-table tbody tr:hover {
    background-color: var(--bulma-scheme-main-ter);
  }

  .roll-column {
    width: 5%;
    text-align: center;
    font-weight: 600;
  }

  .report-column {
    width: 25%;
  }

  .dialogue-column {
    width: 40%;
    font-style: italic;
  }

  .conditions-column {
    width: 30%;
  }
</style>

<div class="intelligence-reports">
  <h2 class="title is-4">Intelligence Reports</h2>

  {instructions && (
    <div class="instructions">
      {instructions}
    </div>
  )}

  <table class="reports-table">
    <thead>
      <tr>
        <th class="roll-column">Roll</th>
        <th class="report-column">Report</th>
        <th class="dialogue-column">Sample Dialogue</th>
        <th class="conditions-column">Relevant Conditions</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr>
          <td class="roll-column">{row.roll}</td>
          <td class="report-column">{row.report}</td>
          <td class="dialogue-column">"{row.sampleDialogue}"</td>
          <td class="conditions-column">{row.relevantConditions}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### 4.2 Create Roleplay Book Display Component

Create `apps/web/src/components/RoleplayBook.astro`:

```astro
---
import IntelligenceReportsTable from './IntelligenceReportsTable.astro';
import type { RoleplayBookData } from '@skyreach/schemas';

interface Props {
  data: RoleplayBookData;
}

const { data } = Astro.props;
---

<style>
  .roleplay-book {
    margin-top: 2rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section-title {
    margin-bottom: 0.75rem;
  }

  .cultural-overview {
    white-space: pre-wrap;
    line-height: 1.6;
  }

  .prithara-variant {
    margin-bottom: 0.5rem;
  }

  .variant-name {
    font-weight: 600;
  }

  .list-item {
    margin-bottom: 0.5rem;
    padding-left: 1.5rem;
    position: relative;
  }

  .list-item::before {
    content: "•";
    position: absolute;
    left: 0.5rem;
  }

  .dialogue-item {
    font-style: italic;
    margin-bottom: 0.5rem;
    padding-left: 1rem;
    border-left: 3px solid var(--bulma-grey-light);
  }
</style>

<div class="roleplay-book">
  <h2 class="title is-3">{data.name}</h2>

  <div class="section">
    <h3 class="title is-4 section-title">Cultural Overview</h3>
    <div class="cultural-overview">{data.culturalOverview}</div>
  </div>

  {data.pritharaVariants.length > 0 && (
    <div class="section">
      <h3 class="title is-4 section-title">Prithara Variants</h3>
      {data.pritharaVariants.map((variant) => (
        <div class="prithara-variant">
          <span class="variant-name">{variant.name}</span> – {variant.description}
        </div>
      ))}
    </div>
  )}

  <div class="section">
    <h3 class="title is-4 section-title">RP & Voice Notes</h3>
    {data.rpVoiceNotes.map((note) => (
      <div class="list-item">{note}</div>
    ))}
  </div>

  <div class="section">
    <h3 class="title is-4 section-title">Lore Hooks & Hints</h3>
    {data.loreHooks.map((hook) => (
      <div class="list-item">{hook}</div>
    ))}
  </div>

  <div class="section">
    <h3 class="title is-4 section-title">Sample Dialogue</h3>
    {data.sampleDialogue.map((dialogue) => (
      <div class="dialogue-item">{dialogue}</div>
    ))}
  </div>

  {data.intelligenceReports && (
    <IntelligenceReportsTable
      instructions={data.intelligenceReports.instructions}
      rows={data.intelligenceReports.rows}
    />
  )}
</div>
```

---

### Phase 5: Integration Updates

#### 5.1 Update Encounter Page (`apps/web/src/pages/gm-reference/encounters/[id].astro`)

Replace the current roleplay book integration:

**Remove:**
```typescript
export const ROLEPLAY_BOOKS = [
  { keyword: 'bearfolk', slug: 'roleplay-book-bearfolk' },
  { keyword: 'alseid', slug: 'roleplay-book-alseid' },
  { keyword: 'gearforged', slug: 'roleplay-book-gearforged' },
  { keyword: 'kobold', slug: 'roleplay-book-kobolds' },
];

const statBlockIds = encounter.statBlocks ?? [];
const matchedRoleplayBooks = ROLEPLAY_BOOKS.filter(({ keyword }) =>
  statBlockIds.some((id) => id.includes(keyword)),
);
const roleplayBookEntries = (
  await Promise.all(
    matchedRoleplayBooks.map(({ slug }) => getEntry('articles', slug)),
  )
).filter((entry) => entry !== undefined);
```

**Replace with:**
```typescript
// Get all roleplay books
const allRoleplayBooks = await getCollection('roleplay-books');

// Match roleplay books based on keywords in stat block IDs
const statBlockIds = encounter.statBlocks ?? [];
const matchedRoleplayBooks = allRoleplayBooks.filter((book) =>
  statBlockIds.some((id) => id.includes(book.data.keyword)),
);
```

**Update imports:**
```typescript
import RoleplayBook from '../../../components/RoleplayBook.astro';
```

**Update template:**
```astro
<div class="roleplay-books">
  {matchedRoleplayBooks.map((entry) => (
    <RoleplayBook data={entry.data} />
  ))}
</div>
```

---

### Phase 6: IDE Configuration

#### 6.1 Add JSON Schema Configuration

Update `.idea/jsonSchemas.xml` to add roleplay books schema:

```xml
<entry key="roleplay-book">
  <value>
    <SchemaInfo>
      <option name="generatedName" value="New Schema" />
      <option name="name" value="roleplay-book" />
      <option name="relativePathToSchema" value="packages/schemas/dist/roleplay-book.schema.json" />
      <option name="patterns">
        <list>
          <Item>
            <option name="directory" value="true" />
            <option name="path" value="data/roleplay-books" />
            <option name="mappingKind" value="Directory" />
          </Item>
        </list>
      </option>
    </SchemaInfo>
  </value>
</entry>
```

---

### Phase 7: Testing & Validation

#### 7.1 Build Test
```bash
npm run build
```

Ensure no TypeScript errors and schema validation passes.

#### 7.2 Visual Test
- Start dev server: `npm run dev`
- Navigate to an encounter page that should show roleplay books (e.g., one with bearfolk stat blocks)
- Verify:
  - Roleplay book displays correctly
  - Intelligence reports table renders properly
  - Styling matches expectations
  - All sections display as expected

#### 7.3 Data Validation
- Verify all YAML files validate against schema
- Test with different numbers of intelligence report rows
- Ensure optional fields (like `intelligenceReports`) work correctly

---

## Future Considerations

### Adding New Roleplay Books
1. Create new YAML file in `data/roleplay-books/`
2. Ensure `keyword` field matches stat block ID patterns
3. No code changes needed - automatic discovery via collection

### Intelligence Report Row Counts
- Authors responsible for ensuring row count matches standard die types (d4, d6, d8, d10, d12, d20)
- Schema allows arbitrary number of rows for flexibility
- Consider adding validation warning if row count doesn't match standard dice

### Additional Fields
If future needs require additional fields (e.g., images, links to related content):
1. Update schema in `packages/schemas/src/schemas/roleplay-book.ts`
2. Run `npm run generate:schemas`
3. Update component to render new fields
4. Update existing YAML files as needed

---

## Rollback Plan

If issues arise during implementation:

1. **Immediate Rollback:**
  - Restore MDX files from git
  - Revert encounter page changes
  - Remove roleplay-books collection from `content.config.ts`

2. **Partial Rollback:**
  - Keep schema and types
  - Use MDX files temporarily
  - Migrate data gradually per roleplay book

3. **Data Preservation:**
  - All original MDX content preserved in git history
  - YAML files are human-readable and can be manually edited if schema issues arise

---

## Success Criteria

- ✅ Roleplay books display on encounter pages
- ✅ Intelligence reports table renders correctly
- ✅ Styling matches design mockup
- ✅ Schema validation passes
- ✅ Build succeeds without errors
- ✅ No TypeScript errors
- ✅ IDE provides autocomplete for YAML editing
- ✅ All existing roleplay book content preserved and functional
