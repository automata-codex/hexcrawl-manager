# Clues, Plotlines, and Tags

A short reference documenting how these three concepts relate in the campaign management system.

## Clues: The Atomic Unit of Player Knowledge

Clues represent discrete facts or pieces of information that players can discover. Each clue has a `status` field (`known` or `unknown`) that tracks whether the party has learned this information.

**Clues are the source of truth for what players know.** When you need to answer "what does the party know about X?" — look at clues.

## Plotlines: Narrative Containers

Plotlines organize clues (and other elements like NPCs, factions, encounters) into coherent story threads. A plotline has characters, dramatic tension, and potential progression.

**Plotlines reference clues but don't duplicate knowledge tracking.** To see player progress on a plotline, look at which of its referenced clues have `status: known`.

Examples of plotlines:
- Thorn & Thistle (character-driven investigation)
- Skyspire Repairs (location-driven objective)
- Alistar's Mentor (backstory-driven mystery)

## Tags: Thematic Groupings

Tags group related clues that share a theme or category but don't form a narrative thread. Tags help during prep.

**Tags reflect your mental model, not a generic taxonomy.** Good tags are ones that help you find related content when you need it.

Examples of useful tag categories:
- **Thematic**: `dragon-empire`, `first-civilization`, `conspiracy`
- **Regional**: `fort-dagaric`, `north-of-river`, `skyspire`

## Summary

| Concept  | Purpose                                      | Tracks Knowledge?             |
|----------|----------------------------------------------|-------------------------------|
| Clue     | A discoverable fact                          | Yes (`status: known/unknown`) |
| Plotline | A narrative thread grouping related elements | No (derived from clue status) |
| Tag      | A thematic/categorical grouping              | No (organizational only)      |

## Design Principle

Players manage their own notes and knowledge. The clue system tracks what's been *revealed*, not what players *remember*. This keeps GM cognitive load manageable and lets imperfect player recall be a feature of play.
