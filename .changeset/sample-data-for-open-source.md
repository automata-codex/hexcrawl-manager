---
"@achm/schemas": minor
"@achm/web": minor
---

Add sample data for open-source release

This change introduces a complete starter data set demonstrating core hexcrawl-manager
features through the "Thornwick Village" mini-campaign. The sample data includes:

- 1 region with encounter tables
- 7 hexes covering a 3x3 grid
- 1 dungeon (The Broken Tower) with rooms, treasure, and encounters
- 6 encounters demonstrating various encounter types
- 5 stat blocks (goblins, wolf, spider, boss monster)
- 3 factions with relationships
- 4 NPCs
- 1 character
- 1 roleplay book with intelligence reports
- 1 clue and 3 rumors
- Complete routes.yml, sidebar.yml, and map.yaml configuration
- Starter CSS with Fraunces (headings) and Source Serif 4 (body) fonts

Schema updates:
- Made `factions` optional in clue schema
- Made `pritharaVariants` optional in roleplay book schema
- Changed `FactionEnum` from hardcoded enum to flexible `FactionId` string type
  (validation now done at build time via validate-faction-ids.ts)

Web app improvements:
- Consolidated ArticleLayout/SecretArticleLayout into ComponentLayout/SecretLayout
- Moved article.css styles into global-styles.css
