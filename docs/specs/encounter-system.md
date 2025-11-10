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
    weight: z.number().default(1),
  })
  .refine(
    (data) => data.description || data.contentPath,
    {
      message: "Either 'description' or 'contentPath' must be provided",
    }
  )
  .describe('EncounterSchema');
```

### Fields

#### Required Fields

- **`id`**: Unique identifier for the encounter (kebab-case)
- **`name`**: Display name of the encounter
- **`statBlocks`**: Array of stat block IDs referenced by this encounter

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

- **`weight`**: Numeric weight for encounter table selection (default: 1)

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
weight: 2
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
weight: 1
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

## Encounter Tables

### Overview

[TODO: Document encounter table structure]

- Main table with weighted categories
- Category tables with tiered subtables
- Encounter references with weights

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
- Weights must be positive numbers

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
