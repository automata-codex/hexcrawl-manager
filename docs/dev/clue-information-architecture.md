# Clue Information Architecture

## The Core Insight

A **clue** is any fact the party can learn through play.

There is no meaningful distinction between "clues," "knowledge," and "facts." They are all the same thing: discoverable information. The word "clue" suggests a larger context — something is a clue *to* something else — but that context comes from structured taxonomy and linking, not from the data type itself. "The gruelith have many tiefling slaves" is a fact that becomes a clue when viewed through the lens of Milly's search for her brother. "Dewberry moss grows blue crystals" is a fact about the world that might never connect to a larger mystery. Both are stored the same way.

This simplification eliminates the need for separate collections for fixed clues, floating clues, and knowledge tree nodes. One collection of clues, with good taxonomy and linking, serves all purposes.

## Clue Schema

Clues are the **canonical source of truth** for discoverable facts. Each clue has:

### Core Fields
- **id**: Unique identifier
- **name**: Display name
- **summary**: Brief description of the fact
- **details**: Extended GM-facing information (optional)
- **status**: `unknown` or `known`

### Structured Taxonomy
- **factions**: Array of faction enums (reuses `FactionEnum` from encounters) — for clues tied to specific factions the party can interact with
- **plotlines**: Array of plotline IDs (e.g., `"milly-and-baz"`) — connects clues to character arcs and ongoing storylines

### Flexible Categorization
- **tags**: Array of strings — for everything else: themes, creature types, locations, etc.

The structured fields enable reliable filtering and querying. Tags remain flexible for ad-hoc categorization.

## Delivery Mechanisms

Clues can be discovered in six types of locations:

### 1. Encounters
An encounter's `clues` field lists the clue IDs it can reveal. The encounter write-up describes how the information surfaces — who knows it, how they phrase it, what prompts them to share.

Encounters can be:
- **Random**: In regional encounter tables, can happen anywhere in the region
- **Keyed**: Attached to specific hexes with trigger conditions

### 2. Keyed Encounters
Keyed encounters are attached to hexes and fire under specific conditions:
- **Entry**: Happens when the party enters the hex
- **Exploration**: Happens when the party spends time investigating

Each keyed encounter specifies an `encounterId` and a `trigger` type, plus optional GM notes about timing.

### 3. Hex Landmarks
A landmark's `clues` field lists clue IDs discoverable at that location. The landmark description provides the context — what the party sees, what investigation reveals.

### 4. Hex Hidden Sites
A hidden site's `clues` field works the same as landmarks. Hidden sites must be discovered before their clues become accessible.

### 5. Dream-Clues (via GM Notes)
Hex GM notes support a polymorphic format:
- Simple strings for regular notes
- Objects with `description` and optional `clueId` for dreams

```yaml
notes:
  - "The party camped here in session 12"
  - description: "Sleeping here triggers visions of crystal conduits"
    clueId: velari-conduit-network
```

Dreams don't need encounter machinery — they're lightweight delivery for clues revealed through rest.

### 6. Dungeon Rooms and Pointcrawl Nodes
Both support a `clues` field listing discoverable clue IDs, with the room/node description providing context.

## The Separation Principle

The clue is the **canonical fact** — what's true and whether it's known.

The delivery mechanism describes **how** the clue appears in context — the NPC who knows it, the inscription that reveals it, the dream that shows it.

This separation means:
- A single clue can have multiple delivery points
- When any delivery point fires, the clue is marked known
- "Used in" derivation shows everywhere a clue can be discovered

## Plotline Outlines

Plotline outlines serve the **truth layer** — what's actually happening, what the antagonists want, why events are unfolding. This is GM-only narrative context for prep and improvisation.

There are three layers of information:

1. **The truth** (GM-only): What antagonists are doing, their plans, their timeline. Never directly surfaces to players.

2. **Evidence** (discoverable): The traces those actions leave. Clues, signs, encounters, NPC testimony. What players can interact with.

3. **Player knowledge** (tracked): What they've actually discovered. The `status` field on clues.

### Workflow
- During prep, read the outline to understand the big picture
- When antagonist actions leave discoverable evidence, create clues and link them from relevant locations
- Links from outline to clues let you drill into specific discoverable content
- At the table, you're in clues and encounters, not outlines

Not everything in the outline becomes a clue. Only facts with discoverable evidence get clue entries.

## Knowledge Trees vs. Objective Trees

**Knowledge trees** were originally conceived as an organizational view over clues — a way to see "here's everything you need to know about X, and here's what you've learned." The hierarchy is a presentation choice, not a mechanical feature.

With the unified clue model, knowledge trees can become **filtered views** over tagged/categorized clues rather than a separate data structure.

**Objective trees** are different. Something like "Skyspire Reactivation" tracks tasks to complete, not facts to discover. These are better handled as articles with checklist-style structure, linked from relevant locations. If a second use case emerges that needs structured objective tracking, that would warrant its own schema — but not until then.

## "Used In" Derivation

At build time, scan all delivery mechanisms and populate a `usedIn` array on each clue:

1. Encounters with `clues` field references
2. Hex landmarks with `clues` field references
3. Hex hidden sites with `clues` field references
4. Hex GM notes with `clueId` references (dream-clues)
5. Hexes with `keyedEncounters` referencing encounters that have clues
6. Dungeon rooms with `clues` field references
7. Pointcrawl nodes with `clues` field references

Output structure:
```typescript
usedIn: Array<{
  type: 'encounter' | 'hex-landmark' | 'hex-hidden-site' | 'hex-dream' | 'dungeon-room' | 'pointcrawl-node';
  id: string;
  name: string;
  hexId?: string; // For hex-based types
}>
```

## Validation

The clue display page should show a **warning icon** next to any plotline ID that doesn't match an actual plotline file. This catches typos and orphaned references.

At build time, collect all plotline IDs from `data/plotlines/` and compare against each clue's `plotlines` array.

## Migration Path

1. Create the new clue schema and collection
2. Build one clue and test the format in actual use
3. Build the display infrastructure for clues
4. Add cross-linking from hexes, encounters, dungeons, and pointcrawl nodes
5. Pause and evaluate — does this feel right?
6. Migrate floating clues (already structured, mostly mechanical)
7. Extract fixed clues from prose articles (do plotline-by-plotline as needed)
8. Migrate knowledge tree content that represents facts (not objectives)
9. Clean up duplicate infrastructure

## Principles

- One source of truth for each fact
- Multiple delivery points are fine; they all link to the same clue
- Structured taxonomy (factions, plotlines) for reliable filtering
- Tags for flexible categorization
- Build the minimal version first; add complexity only when friction demands it
- Duplicate code during migration is acceptable; a broken state is not
