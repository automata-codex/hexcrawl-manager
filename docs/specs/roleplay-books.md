# Roleplay Books Specification

## Overview

Roleplay books are reference documents that provide cultural context, voice guidance, and dynamic intelligence for roleplaying specific ancestries in the Skyreach campaign. They appear automatically on encounter pages when either the encounter ID or stat block IDs contain the relevant ancestry keyword.

## Purpose

**Primary goals:**
- Provide quick-reference cultural and voice guidance for the GM during encounters
- Deliver dynamic, context-aware intelligence reports that can introduce new content organically
- Reduce prep overhead by surfacing relevant roleplay information when needed

**Design principles:**
- **Automatic discovery**: Books appear when encounter IDs or stat block IDs contain the keyword—no manual linking required
- **Scannability**: Structured format optimized for at-the-table reference with markdown rendering for formatting
- **Dynamic content**: Intelligence reports can introduce new hexes, encounters, and plot threads
- **Author flexibility**: Intelligence report tables support arbitrary row counts (author ensures die type alignment)

## Data Structure

### Location
`data/roleplay-books/*.yml`

### Schema

```yaml
name: string               # Display title (e.g., "Roleplay Book: Bearfolk")
keyword: string            # Matching keyword for stat block IDs (e.g., "bearfolk")

culturalOverview: string   # Multi-paragraph overview of the culture

pritharaVariants:          # Language variants for "Prithara" (ancestral homeland)
  - name: string           # Variant name (e.g., "P'ratha")
    description: string    # Usage and connotation

rpVoiceNotes:             # Bullet points for voice/mannerism guidance
  - string

loreHooks:                # Bullet points for plot hooks and world-building hints
  - string

sampleDialogue:           # Example dialogue lines
  - string

intelligenceReports:      # Optional: dynamic content table
  instructions: string    # When/how to use the table (e.g., "Roll d10 or choose...")
  rows:
    - roll: number        # Die result
      report: string      # Title/summary (may reference encounters)
      sampleDialogue: string    # In-character delivery
      relevantConditions: string # When this report is relevant
```

## Intelligence Reports

### Purpose
Intelligence reports serve as a **dynamic content injection mechanism** that:
1. Makes the world feel reactive to player actions
2. Introduces new locations and encounters organically through NPC dialogue
3. Provides the GM with contextually appropriate rumors and leads

### Design Patterns

**Structure:**
- **Roll**: Numeric value (GM can roll or choose contextually)
- **Report**: Brief title, often linking to an encounter type (e.g., "→ Encounter: Dream Sickness")
- **Sample Dialogue**: How an NPC would describe this in-character
- **Relevant Conditions**: When this report makes sense (location, recent events, active plots)

**Usage workflow:**
1. GM encounters roleplay book during encounter prep or at the table
2. Checks "Relevant Conditions" to find appropriate reports
3. Delivers sample dialogue (adapting as needed)
4. Notes hex/encounter to add during post-session cleanup

**Row count conventions:**
- Author responsible for matching row counts to standard die types (d4, d6, d8, d10, d12, d20)
- Common patterns:
  - **d10**: Good balance of variety and usability (as seen in bearfolk example)
  - **d6**: Simpler tables for less complex cultures
  - **d12** or **d20**: Extensive tables for major cultures with many plot threads

### Integration with Session Workflow

Intelligence reports bridge **encounter execution** and **world state management**:

```
Encounter occurs
    ↓
GM consults roleplay book
    ↓
Selects contextually appropriate intelligence report
    ↓
Delivers dialogue at table
    ↓
[Post-session cleanup]
    ↓
Adds referenced hex/encounter to campaign data
    ↓
Content becomes discoverable through normal exploration
```

This creates a feedback loop where:
- NPC conversations feel informed and reactive
- New content emerges from player investigation
- The world expands organically rather than through pre-placed fixed content

## Encounter Integration

### Matching Logic

Roleplay books appear on encounter pages through automatic keyword matching:

```typescript
// Get all roleplay books
const allRoleplayBooks = await getCollection('roleplay-books');

// Match roleplay books based on keywords in encounter ID or stat block IDs
const statBlockIds = encounter.statBlocks ?? [];
const matchedRoleplayBooks = allRoleplayBooks.filter((book) => {
  const keyword = book.data.keyword;
  // Check if encounter ID contains keyword
  if (id.includes(keyword)) return true;
  // Check if any stat block ID contains keyword
  return statBlockIds.some((statBlockId) => statBlockId.includes(keyword));
});
```

### Keyword Guidelines

**Keyword selection:**
- Use lowercase, singular form of ancestry name
- Should match common patterns in encounter IDs and stat block IDs
- Examples:
  - `bearfolk` matches encounter `bearfolk-elder` or stat blocks like `bearfolk-warrior`
  - `kobold` matches encounter `kobold-ambush` or stat blocks like `kobold-inventor`, `kobold-scale-sorcerer`
  - `alseid` matches encounter `alseid-patrol` or stat blocks like `alseid-scout`, `alseid-hoplite`

**Multiple matches:**
- If an encounter includes multiple ancestry types (e.g., bearfolk and kobolds), all relevant roleplay books appear
- Books render in the order they match (deterministic but not explicitly sorted)

## Content Guidelines

### Cultural Overview
- **Length**: 2-4 paragraphs recommended
- **Focus**: Core cultural values, social structures, key distinguishing traits
- **Tone**: Descriptive and practical for GM reference
- **Avoid**: Don't just rehash generic fantasy tropes—capture what makes this culture unique in Baruun Khil
- **Formatting**: Supports markdown - use `**bold**` for emphasis, bullet lists, etc.

### Prithara Variants
- **Purpose**: Show how different groups pronounce/use "Prithara" (ancestral homeland)
- **Pattern**: Name + brief descriptor of usage context
- **Optional**: Can be empty array if culture doesn't use Prithara or language variants aren't relevant

### RP & Voice Notes
- **Focus**: Actionable guidance for portraying the culture
- **Include**:
  - Speech patterns (cadence, vocabulary preferences, rhetorical devices)
  - Physical mannerisms
  - Cultural communication patterns
  - How they refer to important concepts
- **Keep concrete**: "Deep, slow cadence" not "speaks wisely"
- **Formatting**: Rendered as bulleted list; supports markdown in individual items

### Lore Hooks
- **Purpose**: Give GM tools to weave this culture into larger plot threads
- **Pattern**: Short, evocative statements that hint at connections
- **Types**:
  - References to First Civilization ruins
  - Cultural interpretations of magical phenomena
  - Terms/phrases that could be plot-relevant passwords or keys
  - Cultural practices that tie to campaign mysteries
- **Formatting**: Rendered as bulleted list; supports markdown in individual items

### Sample Dialogue
- **Purpose**: Demonstrate voice in practice
- **Format**: 1-3 complete dialogue lines that show the voice notes in action
- **Quality**: Should be table-ready—GM can deliver verbatim or adapt slightly
- **Formatting**: Rendered with left border and italic styling; supports markdown for emphasis

### Intelligence Reports
- **When to include**: Cultures that are:
  - Common enough to appear frequently in encounters
  - Well-integrated into multiple plot threads
  - Likely sources of rumors and intelligence
- **When to omit**: Rare, isolated, or plot-specific cultures that don't serve as general information sources

## Author Workflow

### Creating a New Roleplay Book

1. **Determine scope**
  - Will this culture appear in multiple encounters?
  - Are they intelligence sources or plot-involved actors?
  - How complex is their cultural differentiation?

2. **Research existing content**
  - Review stat blocks that will use this keyword
  - Check for existing world-building notes
  - Identify plot threads this culture intersects

3. **Draft core sections**
  - Start with Cultural Overview
  - Add RP & Voice Notes
  - Include Sample Dialogue early (helps validate voice guidance)

4. **Consider intelligence reports**
  - Evaluate if this culture serves as information source
  - Identify 4-10 plot-relevant rumors/leads
  - Write from culture's perspective and knowledge base
  - Ensure geographic/temporal relevance

5. **Test keyword matching**
  - Verify keyword appears in relevant stat block IDs
  - Check for false positives (overly broad keywords)
  - Build/test on an encounter page

### Updating Existing Books

**Minor updates** (typos, clarification):
- Edit YAML directly
- Rebuild to verify

**Adding intelligence reports**:
- Add `intelligenceReports` section if not present
- Consider how many rows fit the culture's prominence
- Ensure reports tie to active or latent plot threads

**Structural changes**:
- Consider impact on encounters already using this book
- Test render on multiple encounter pages
- Update specification if changing patterns

## Technical Notes

### Collection Configuration

Roleplay books use Astro's glob loader for YAML files:

```typescript
const roleplayBooks = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.ROLEPLAY_BOOKS }),
  schema: RoleplayBookSchema,
});
```

### Components

**Primary renderer:**
- `apps/web/src/components/RoleplayBook/RoleplayBook.astro`
- Renders all sections of a roleplay book with markdown processing
- Uses semantic HTML lists (`<ul>/<li>`) for bullet points
- Conditionally includes intelligence reports table

**Intelligence reports table:**
- `apps/web/src/components/RoleplayBook/IntelligenceReportsTable.astro`
- Standalone component for report table rendering
- Includes instructions display and responsive table layout

### Styling

Roleplay books follow standard component styling:
- Uses Bulma utilities for base layout (title classes, etc.)
- Markdown rendered via `renderMarkdown()` for all text fields (supports **bold**, *italic*, etc.)
- Semantic HTML lists for RP notes, lore hooks (native browser styling)
- Compact spacing between sections for scannability
- Custom styles scoped to components
- Responsive table design for intelligence reports
- Print-friendly (consideration for at-table reference)

## Examples

### Minimal Example (No Intelligence Reports)

```yaml
name: "Roleplay Book: Gearforged"
keyword: "gearforged"
culturalOverview: |
  Gearforged are constructed beings, souls bound into mechanical bodies.
  They retain their memories and personalities from their previous lives,
  but exist in a form that is both resilient and alien to their former existence.

pritharaVariants: []

rpVoiceNotes:
  - "Mechanical precision in speech; may pause to 'process' complex emotional topics."
  - "Some retain quirks from their former life; others speak with unsettling formality."
  - "May describe sensations in mechanical terms: 'my gears grind' instead of 'I'm frustrated.'"

loreHooks:
  - "Gearforged remember their creation - some have knowledge of the forgemasters who built them."
  - "Older gearforged may have fragmentary memories of the Dragon Empire's fall."

sampleDialogue:
  - "The logic is sound, but my memory-gears spin when I consider it. I was... afraid once. I remember the shape of fear."
```

### Full Example (With Intelligence Reports)

See `data/roleplay-books/bearfolk.yml` in the implementation plan for a complete example with 10 intelligence report rows (d10 table).

## Future Considerations

### Potential Enhancements

**Related content linking:**
- Link to specific encounters referenced in intelligence reports
- Cross-reference to world-building articles
- Ties to specific hexes or regions

**Mechanical integration:**
- Reaction tables for different cultures
- Morale modifiers
- Trade goods and prices specific to culture

**Media enrichment:**
- Pronunciation guides (audio or phonetic)
- Cultural symbol/sigil images
- Reference art for appearance

**Dynamic filtering:**
- Filter intelligence reports by active plot threads
- Regional relevance filtering
- Temporal filtering (reports that make sense "now" in campaign timeline)

### Maintenance Patterns

**When to retire intelligence reports:**
- Plot thread resolved
- Geographic region no longer accessible
- Temporal event passed

**Approach**: Keep historical reports in YAML (with notes about resolution) rather than deleting—provides continuity and can be re-enabled if plot circles back.

**Versioning consideration**: As campaign progresses, some cultures may need "era" variants (pre-event vs. post-event perspectives). Current structure doesn't support this explicitly—consider if it becomes necessary.

## Related Specifications

- **Encounter Specification**: How encounters reference stat blocks (and thus trigger roleplay book matching)
- **Hex Specification**: Structure of hexes that intelligence reports reference
- **Session Lifecycle**: How intelligence report content gets added to campaign data post-session
