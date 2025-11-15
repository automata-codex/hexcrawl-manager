# Encounter Format Guide

This document captures the formatting standards for creating encounters in the Dragon Empire campaign.

## Markdown File Structure

### File Header
- **NO h1 title** at the top of the file
- Start directly with the core concept paragraph

### Core Concept
```markdown
**Core Concept:** Brief description of the encounter's central idea and what makes it distinct.
```

### Stage Headers
Use sentence case with "or" alternatives:
- `## Evidence Stage (Aftermath or Clue)`
- `## In-progress Stage (Active Encounter)`
- `## Consequence Stage (Follow-up/Escalation)`

### GM Notes Section
- `## GM Notes`
- **Use bullets for ALL items** in this section
- Each bullet should be a complete thought or guideline
- Use bold for emphasis on key terms: `**term**`

### General Formatting
- Use `**bold**` for emphasized terms and section labels within prose
- Use proper em-dashes where appropriate
- Maintain consistent voice (direct, GM-facing)
- Include specific DCs and mechanics where applicable
- Scale encounters for 3-4, 5-6, and 6-7 player parties

## YAML File Structure

### Basic Format
```yaml
id: encounter-slug
name: Encounter Display Name
contentPath: ./encounter-slug.md
statBlocks:
  - stat-block-id-1
  - stat-block-id-2
```

### Key Points
- `id`: kebab-case, matches filename
- `name`: Title case, human-readable
- `contentPath`: Relative path starting with `./`
  - Format: `./encounter-name.md`
  - **NOT** `/gm-reference/encounters/encounter-name.md`
- `statBlocks`: Array of stat block IDs that might be used in this encounter

## Content Guidelines

### Evidence Stage
- Focus on investigation and discovery
- Provide clear clues and tracks
- Include skill DCs for investigation
- Offer multiple follow-up paths

### In-Progress Stage
- Present active situation requiring immediate decision
- List **Immediate choices:** with bullet points
- Include **Scaling:** section with party sizes
- Provide tactical notes for running combat
- Offer non-combat alternatives where appropriate

### Consequence Stage
- Show how the world changes based on party action/inaction
- Include **If the party previously encountered this:** sections
- Detail **Regional impact:**
- Specify **Changed faction relations:**
- List **Escalation possibilities:**

### GM Notes
- Use bullets exclusively
- Cover practical table-running advice
- Explain mechanical systems or special rules
- Note connections to other encounters or plotlines
- Clarify cultural or setting-specific elements
- Suggest variations or complications
- Emphasize long-term campaign implications

## Example Structure

```markdown
**Core Concept:** One sentence describing the encounter's essence.

## Evidence Stage (Aftermath or Clue)

Opening paragraph establishing what players discover.

**What they find:**
- Bullet points of physical evidence
- Observable details
- Environmental clues

**What it reveals:** Analysis paragraph.

**Investigation opportunities:**
- Skill checks and DCs
- Information gathering paths

**Potential follow-up:** Next steps available to party.

## In-progress Stage (Active Encounter)

Scene-setting paragraph.

**Immediate choices:**
- **Choice 1** (outcome)
- **Choice 2** (outcome)
- **Choice 3** (outcome)

**Scaling:**
- **Small party (3-4 players):** Enemy composition
- **Medium party (5-6 players):** Enemy composition
- **Large party (6-7 players):** Enemy composition

**Tactical notes:**
- Combat behavior patterns
- Environmental factors

## Consequence Stage (Follow-up/Escalation)

Current state description.

**If the party previously encountered this:**
- **If they did X:** Consequence
- **If they did Y:** Consequence
- **If they did nothing:** Consequence

**Regional impact:**
- Broader consequences

**Changed faction relations:**
- Specific reputation changes

**Escalation possibilities:**
- Future complications

## GM Notes

- **First consideration:** Explanation with mechanical details
- **Second consideration:** Table advice
- **Cultural context:** Setting-specific information
- **Connection to plotlines:** How this ties to larger campaign
- **Variations:** Optional ways to run differently
- **Long-term implications:** Campaign-wide consequences
```

## Common Patterns

### Faction Intelligence Reports
Encounters often originate from faction intelligence reports. Reference the appropriate roleplay book when relevant.

### Stat Block References
Only include stat blocks that are actually used or likely to be used in the encounter. Don't list every possible creature type.

### Scaling Philosophy
Scale by adding/removing creatures or adjusting leader quality, not by changing individual creature stats. Keep encounters manageable for table play.

### Multiple Solutions
Always provide combat, stealth, social, and creative problem-solving approaches. Avoid railroading to single solution.

### Fair But Opaque
Create tension through uncertainty rather than predetermined outcomes. Mechanical systems should feel natural, not artificial.
