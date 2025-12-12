# Clue Information Architecture

## The Core Insight

A **clue** is any fact the party can learn through play.

There is no meaningful distinction between "clues," "knowledge," and "facts." They are all the same thing: discoverable information. The word "clue" suggests a larger context — something is a clue *to* something else — but that context comes from tagging and linking, not from the data type itself. "The gruelith have many tiefling slaves" is a fact that becomes a clue when viewed through the lens of Milly's search for her brother. "Dewberry moss grows blue crystals" is a fact about the world that might never connect to a larger mystery. Both are stored the same way.

This simplification eliminates the need for separate collections for fixed clues, floating clues, and knowledge tree nodes. One collection of clues, with good tagging and linking, serves all purposes.

## Architecture

### Clues

Clues are the **canonical source of truth** for discoverable facts. Each clue has:

- An identifier
- A name and summary
- Optional detailed information for GM reference
- Tags connecting it to plotlines, factions, characters, or themes
- A status indicating whether the party has discovered it

Clues live in a master list. During prep, this list shows what the party knows and what remains hidden. Filtering by tag produces a "clue list" for any given plotline or topic.

### Delivery Mechanisms

Clues can be discovered in four types of locations:

- **Encounters** — a clue delivered through interaction with NPCs, events, or situations
- **Hexes** — a clue embedded in a location's description, landmarks, or hidden sites
- **Dungeons** — a clue found in a keyed room or area
- **Pointcrawl nodes** — a clue placed at a specific node in a pointcrawl

The delivery mechanism describes **how** the clue appears in context — who knows it, what it looks like, what check reveals it, how an NPC phrases it. The clue itself is just the fact. The encounter or location provides the flavor.

This separation means a single clue can have multiple delivery points. If the party can learn that "the gruelith target tieflings" from an orc patrol, a rescued slave, or a gearforged's memory, all three encounters link to the same clue. When any one of them fires, the clue is marked known.

### Plotline Outlines

Plotline outlines serve the **truth layer** — what's actually happening, what the antagonists want, why events are unfolding. This is GM-only narrative context that helps with prep and improvisation.

Outlines link to clues for the **evidence layer** — the traces those events leave in the world. Not everything in an outline becomes a clue. Only facts that have discoverable evidence get clue entries.

The workflow:
- During prep, read the outline to understand the big picture
- Links to clues let you drill into specific discoverable content
- At the table, you're in clues and encounters, not outlines

### Knowledge Trees vs. Objective Trees

Knowledge trees were originally conceived as an organizational view over clues — a way to see "here's everything you need to know about X, and here's what you've learned." The hierarchy is a presentation choice, not a mechanical feature.

With the unified clue model, knowledge trees can become **filtered views** over tagged clues rather than a separate data structure.

**Objective trees** are different. Something like "Skyspire Reactivation" tracks tasks to complete, not facts to discover. These are better handled as articles with checklist-style structure, linked from relevant locations. If a second use case emerges that needs structured objective tracking, that would warrant its own schema — but not until then.

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
- Tags provide flexible grouping without forcing hierarchy
- Build the minimal version first; add complexity only when friction demands it
- Duplicate code during migration is acceptable; a broken state is not
