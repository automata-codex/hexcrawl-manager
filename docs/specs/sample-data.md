# Sample Data Specification: Thornwick Village

## Overview

This spec defines the sample/starter data for the hexcrawl-manager open source release. The goal is a coherent mini demo campaign that shows off core features and provides a reasonable starting point for someone to build out their own campaign.

**Important:** This spec describes the content in prose form. When implementing, CC should reference the actual schemas in `packages/schemas/src/schemas/` to ensure all files are correctly structured.

## The Setting

**Hook:** The village of Thornwick is threatened by goblins who've been riled up by a new warlord named Skargash. The warlord's base is in the nearby Broken Tower ruins. A faction of goblin dissenters who opposed Skargash have fled to a hidden camp and may be willing to help — if the party can earn their trust.

**Themes:** Faction conflict, exploration, moral ambiguity (not all goblins are evil), dungeon delving.

**System:** D&D 5e flavored. Stat blocks should use 5e conventions.

## File Structure Overview

All files go in `data/` in the code repo. This becomes the default data when `ACHM_DATA_PATH` is not set.

```
data/
├── characters/          # 1 sample character
├── clues/               # 1 clue
├── dungeons/            # 1 dungeon (single MDX file)
├── encounters/          # 6 encounters (YAML only, description in YAML)
├── factions/            # 3 factions
├── hexes/               # 7 hexes
├── npcs/                # 4 NPCs
├── regions/             # 1 region
├── roleplay-books/      # 1 roleplay book
├── rumors/              # 3 rumors
├── stat-blocks/         # 5 stat blocks
├── public/
│   ├── css/
│   │   └── global-styles.css   # Starter CSS template
│   └── images/
│       └── maps/        # Dungeon map image
├── meta.yaml
├── routes.yml
└── sidebar.yml
```

**Note on hex coordinates:** Use CCRR format (column-column-row-row, zero-padded). Example: hex in column 2, row 3 = "0203".

---

## Region: Thornwick Region

**ID:** `thornwick-region`

A frontier region at the edge of civilization. Rolling farmlands give way to dense forests and rocky hills. Recently, goblin raids have increased, threatening the peace the villagers have enjoyed for generations.

- **Type:** starting
- **Haven:** 0101 (Thornwick Village)
- **Encounter Chance:** 3
- **Content Density:** 3
- **Treasure Rating:** 2

**Topography:** Low hills in the east rise toward rocky outcroppings. Dense deciduous forest covers the northern and western areas. The village sits in a cleared valley with farmland spreading south.

**Random Encounter Tables:** The region should have wilderness encounter tables that include goblin-patrol, goblin-ambush, wolf-pack, and giant-spider-nest encounters with appropriate weights totaling 20.

---

## Hexes

Use CCRR coordinate format for IDs and slugs.

### 0101 - Thornwick Village (Haven)

The starting haven. A small but prosperous village of about 200 souls. Timber-framed buildings cluster around a central well. The Sleeping Boar inn serves as the social hub.

- **Tags:** haven, settlement
- **Visited:** yes

### 0102 - Thornwick Farmlands

Patchwork fields of wheat and barley stretch across gentle hills. Several farmsteads dot the landscape, their inhabitants nervous about recent raids.

- **Random Encounter Chance:** 4
- **GM Notes:** Recent goblin raids have burned two outlying barns

### 0201 - Whispering Woods (Edge)

The forest begins here, ancient oaks giving way to dense undergrowth. A worn trail leads deeper into the woods.

- **Random Encounter Chance:** 3
- **Hidden Site:** A goblin watch post hidden in the trees (discovered through exploration)

### 0202 - Whispering Woods (Deep)

Thick canopy blocks most sunlight. Strange webs glisten between the trees.

- **Random Encounter Chance:** 4
- **Keyed Encounter:** giant-spider-nest, triggered when party explores off the main trail

### 0301 - Thornback Hills

Barren rocky hills with scrub vegetation. Good vantage points but little cover.

- **Random Encounter Chance:** 4
- **GM Notes:** Goblin patrols are more frequent here, watching approaches to the tower

### 0302 - The Broken Tower

A ruined watchtower from a fallen empire, now occupied by Skargash's goblin warband. The upper floors have collapsed, but the dungeons below remain intact.

- **Tags:** dungeon, goblin-ruins
- **Keyed Encounter:** goblin-ambush, triggered on entry (goblin sentries attack anyone approaching openly)

### 0303 - Hidden Hollow

A well-concealed camp in a rocky ravine. Only those who know where to look — or who are led here — can find it.

- **Hidden Site:** The Goblin Dissenter camp, led by Grix the Exile (discovered via faction lead from goblin-dissenters)
- **Keyed Encounter:** dissenter-scouts, triggered on entry

---

## Factions

### Skargash's Warband

**ID:** `skargash-goblins`

A goblin warband united under the brutal leadership of Skargash. They've grown bolder in recent weeks, raiding farmsteads and demanding tribute.

- **Type:** hostile
- **Leader:** Skargash
- **Goals:**
  - Establish dominance over the region
  - Raid Thornwick for supplies and slaves
  - Eliminate the dissenter faction

### The Exiled Ones (Goblin Dissenters)

**ID:** `goblin-dissenters`

Goblins who refused to follow Skargash's brutal leadership. Led by Grix, they hide in the wilderness and may be willing to help outsiders who share their enemy.

- **Type:** neutral
- **Leader:** Grix the Exile
- **Goals:**
  - Survive Skargash's hunters
  - Eventually overthrow or escape Skargash
  - Find a place where they can live in peace

### Thornwick Militia

**ID:** `thornwick-militia`

A small volunteer militia organized by Captain Sera. Farmers and tradespeople who've taken up arms to defend their homes.

- **Type:** friendly
- **Leader:** Captain Sera
- **Goals:**
  - Protect Thornwick from goblin raids
  - Find and eliminate the goblin threat
  - Keep the trade roads safe

---

## NPCs

### Mayor Aldric Thornwood

**ID:** `mayor-aldric`

A portly, worried man in his fifties. Aldric has been mayor for twenty years and has never faced a crisis like this. He's desperate for help.

- **Pronouns:** he/him
- **Faction:** thornwick-militia
- **Location:** 0101
- **Role:** Quest giver, exposition
- **GM Notes:** Aldric will offer 50gp per goblin ear as bounty, plus 200gp for proof of Skargash's death. He knows rumors about goblin infighting but dismisses them.

### Captain Sera Ironhand

**ID:** `militia-captain-sera`

A stern woman with a soldier's bearing. Former mercenary who settled in Thornwick five years ago. The only person in town with real combat experience.

- **Pronouns:** she/her
- **Faction:** thornwick-militia
- **Location:** 0101
- **Role:** Combat advisor, potential ally
- **GM Notes:** Sera is practical and will consider any plan that works, including allying with the dissenter goblins. She's skeptical but open-minded.

### Grix the Exile

**ID:** `grix-the-exile`

A scarred goblin with intelligent eyes. Grix was Skargash's second-in-command until they refused to burn a farmstead with children inside. Now they lead the exiles.

- **Pronouns:** they/them
- **Faction:** goblin-dissenters
- **Location:** 0303
- **Role:** Potential ally, information source
- **GM Notes:** Grix knows Skargash's weakness: his obsession with a magic amulet he found in the tower ruins. Without it, he loses the loyalty of his shamans.

### Warlord Skargash the Red

**ID:** `skargash`

A massive goblin covered in ritual scars, wearing a glowing amulet around his neck. Cruel, cunning, and utterly convinced of his own destiny.

- **Pronouns:** he/him
- **Faction:** skargash-goblins
- **Location:** 0302
- **Role:** Main antagonist
- **GM Notes:** Skargash's power comes from the Amulet of the Broken King, found in the tower ruins. It grants him limited charm over other goblins. Destroying or stealing it would shatter his warband.

---

## Encounters

Each encounter should have its content in the YAML description field (no separate markdown files needed).

### Goblin Patrol

**ID:** `goblin-patrol`

A small group of goblin scouts watching for intruders and potential raid targets.

- **Scope:** region
- **Location Types:** wilderness
- **Factions:** skargash-goblins
- **Creatures:** 3 goblins
- **Stat Blocks to Display:** goblin

**Content:**
- **Setup:** Three goblins moving through the area, checking game trails and watching for travelers. They're not looking for a fight but will attack if they spot easy prey.
- **Tactics:** One goblin hangs back to flee and warn the warband if things go badly. They prefer ambush and will disengage if outmatched. Can be bribed with food or shiny objects.
- **Treasure:** 2d6 silver pieces per goblin. One carries a crude map showing patrol routes (leads to Broken Tower).
- **Developments:** If captured, goblins will reveal the tower's location to save themselves. They're terrified of Skargash.

### Goblin Ambush

**ID:** `goblin-ambush`

A prepared ambush by goblin raiders, led by a boss.

- **Scope:** region
- **Location Types:** wilderness
- **Factions:** skargash-goblins
- **Creatures:** 4 goblins, 1 goblin boss
- **Stat Blocks to Display:** goblin, goblin-boss

**Content:**
- **Setup:** Five goblins led by a boss have set up an ambush along a trail. Two hide in trees with shortbows, two crouch behind rocks, and the boss waits to charge.
- **Tactics:** Archers target spellcasters first. Boss charges the biggest threat. They fight to the death if the boss is watching; flee if he falls.
- **Treasure:** Boss carries 15gp and a silver ring (5gp). Total of 3d6 sp among the others. Crude orders from Skargash (in Goblin) demanding more prisoners.
- **Developments:** The orders mention a "great ritual" Skargash is planning. Capturing the boss alive could yield more information.

### Wolf Pack

**ID:** `wolf-pack`

A hungry pack of wolves hunting in the forest.

- **Scope:** general
- **Location Types:** wilderness
- **Creatures:** 3 wolves
- **Stat Blocks to Display:** wolf

**Content:**
- **Setup:** Three wolves, desperate with hunger, have been driven from their normal territory by the increased goblin activity.
- **Tactics:** Circle prey, looking for the weakest target. Flee if two wolves are killed. Can be driven off with fire or loud noises.
- **Treasure:** Wolf pelts (5gp each if properly skinned).
- **Developments:** A ranger or druid might calm the wolves or learn they've been displaced. Following their trail leads toward the Broken Tower.

### Dissenter Scouts

**ID:** `dissenter-scouts`

Goblin scouts from the dissenter faction, wary but not immediately hostile.

- **Scope:** hex
- **Location Types:** wilderness
- **Factions:** goblin-dissenters
- **Creatures:** 2 goblins
- **Stat Blocks to Display:** goblin

**Content:**
- **Setup:** Two goblins step out of hiding, weapons raised but not attacking. One calls out in broken Common: "You not Skargash-friends? We talk, maybe."
- **Roleplaying the Scouts:** Nervous but hopeful. Will offer to lead friendly parties to Grix. Attack only if attacked first.
- **Developments:** If the party proves peaceful, the scouts lead them to the Hidden Hollow (0303) to meet Grix. This is the primary way to discover the dissenter camp.

### Giant Spider Nest

**ID:** `giant-spider-nest`

A nest of giant spiders in web-choked trees.

- **Scope:** hex
- **Location Types:** wilderness
- **Creatures:** 2 giant spiders
- **Stat Blocks to Display:** giant-spider

**Content:**
- **Setup:** Thick webs fill the canopy. Two giant spiders lurk above, waiting for prey to stumble into their domain.
- **Tactics:** Drop from above for surprise. Use webs to restrain prey. Retreat to treetops if badly wounded.
- **Treasure:** Webbed corpse of a goblin scout (2d6 sp, crude map). Webbed bundle containing a potion of healing.
- **Developments:** The dead goblin was from Skargash's warband. The map shows patrol routes and marks the Broken Tower as "home."

### Skargash's Throne Room

**ID:** `skargash-throne-room`

The final confrontation with Warlord Skargash.

- **Scope:** dungeon
- **Location Types:** dungeon
- **Factions:** skargash-goblins
- **Creatures:** Skargash, 4 goblins
- **Stat Blocks to Display:** skargash, goblin

**Content:**
- **Setup:** Skargash sits on a throne of bones in the tower's underground great hall. Four goblin guards attend him. The Amulet of the Broken King glows at his throat.
- **Tactics:** Skargash fights to the death, convinced of his invincibility. Guards protect their leader but flee if he falls. The amulet grants Skargash advantage on Charisma checks vs. goblins.
- **The Amulet:** If the amulet is removed or destroyed during combat, all goblin guards immediately flee, Skargash loses his bonus action attacks, and his confidence shatters — he may try to bargain.
- **Treasure:** Amulet of the Broken King (requires attunement, grants advantage on Charisma checks vs. goblinoids). 150gp in mixed coins. A ledger listing raided farms and planned targets.
- **Developments:** With Skargash dead and the amulet taken, his warband scatters. The goblin threat to Thornwick ends — at least for now.

---

## Dungeon: The Broken Tower

**ID:** `broken-tower`

A ruined imperial watchtower, now the lair of Skargash's warband. The upper floors collapsed long ago, but the dungeons remain intact. This should be a single MDX file following the dungeon schema.

- **Hex:** 0302
- **Levels:** 1

### Rooms

1. **Tower Entrance** — Rubble-strewn entry with makeshift goblin fortifications. The goblin-ambush encounter triggers here if the party approaches openly.

2. **Goblin Barracks** — A foul-smelling room full of crude bedding and stolen goods. Contains stolen goods worth approximately 50gp.

3. **Prison Cells** — Three cells holding captured farmers awaiting Skargash's "ritual." Three prisoners can be rescued here.

4. **Defiled Shrine** — An old imperial shrine, now covered in goblin fetishes. A silver holy symbol worth 25gp is hidden under debris.

5. **Skargash's Throne Room** — The underground great hall where Skargash holds court. The skargash-throne-room encounter takes place here.

---

## Roleplay Book: Goblin Dissenters

**Keyword:** `goblin`

### Cultural Overview

The dissenters are refugees from Skargash's brutal rule. They cling to older goblin traditions that valued cunning and survival over cruelty. Under Grix's leadership, they dream of a life without constant warfare.

### Prithara Variants

- **"The Old Ways"** — Traditions from before Skargash, emphasizing trickery over violence

### RP Voice Notes

- Speak quickly, nervously, always watching for threats
- Mix Common and Goblin, especially when emotional
- Self-deprecating humor as a defense mechanism
- Surprisingly philosophical about fate and survival

### Lore Hooks

- The dissenters know secret ways into the Broken Tower
- Grix once saved Skargash's life — a debt Skargash resents
- Some dissenters want revenge; others just want to flee far away

### Sample Dialogue

- "Skargash is strong, yes, but strong is not same as smart. We are smart."
- "You kill Skargash, we help. We know secret way in. But you must promise — no kill all goblins. Just bad ones."
- "The amulet makes him think he is god. Take amulet, he is just goblin with big mouth."

### Intelligence Reports (d4 table)

1. **Tower Defenses** — "There's a secret entrance through the old sewers. Skargash doesn't know about it." (Links to hex 0302)
2. **Skargash's Weakness** — "The amulet is everything. Without it, the shamans won't follow him." (Links to clue skargash-weakness)
3. **Patrol Schedules** — "Patrols change at dawn and dusk. That's when the tower is most vulnerable." (Links to encounter goblin-patrol)
4. **The Prisoners** — "He keeps prisoners in the old cells. Planning something bad. A ritual, maybe." (Links to dungeon broken-tower)

---

## Clue

### Skargash's Weakness

**ID:** `skargash-weakness`

The Amulet of the Broken King is the source of Skargash's power over his warband. The goblin shamans believe it makes him chosen by their god. Without it, his authority would crumble.

- **Status:** unknown
- **Factions:** skargash-goblins, goblin-dissenters

---

## Rumors

### Goblin Raids

**ID:** `goblin-attacks`

"The goblins have gotten bolder. Three farms burned this month alone. Something's riled them up."

- **Source:** Mayor Aldric
- **Truthful:** yes
- **Leads to:** hex 0102

### The Old Tower

**ID:** `old-tower`

"My grandfather used to tell stories about the Broken Tower. Said it was haunted. Now I hear goblins have moved in. Maybe they woke something up."

- **Source:** Innkeeper at the Sleeping Boar
- **Truthful:** partial
- **Leads to:** hex 0302

### Goblin Infighting

**ID:** `goblin-infighting`

"A trapper who came through said he saw goblins fighting each other in the woods. Two groups, going at it with knives. Strange times."

- **Source:** Captain Sera
- **Truthful:** yes
- **Leads to:** hex 0303

---

## Stat Blocks

Create D&D 5e stat blocks for the following creatures. Reference the stat block schema for correct structure.

### Goblin

Standard 5e goblin (CR 1/4). Small humanoid, AC 15, HP 7. Has Nimble Escape trait.

### Goblin Boss

Standard 5e goblin boss (CR 1). Small humanoid, AC 17, HP 21. Has Nimble Escape and Redirect Attack reaction.

### Wolf

Standard 5e wolf (CR 1/4). Medium beast, AC 13, HP 11. Has Keen Hearing and Smell, Pack Tactics.

### Giant Spider

Standard 5e giant spider (CR 1). Large beast, AC 14, HP 26. Has Spider Climb, Web Sense, Web Walker.

### Skargash the Red

Custom goblin boss variant (CR 3). Small humanoid, AC 17, HP 45. Has Nimble Escape, Redirect Attack, and the Amulet of the Broken King trait (advantage on Charisma checks against goblinoids). Multiattack: two scimitar attacks and one dagger attack.

---

## Sample Character

**ID:** `sample-fighter`

A sample character to demonstrate the character sheet functionality.

- **Name:** Marcus the Bold
- **Class:** Fighter
- **Level:** 3
- **Species:** Human
- **Background:** Soldier
- **Pronouns:** he/him
- **Active:** yes

---

## Config Files

### meta.yaml

- **Campaign Name:** Thornwick Village
- **Next Session Seq:** 1
- **Current Season:** spring-1
- **Seasons:** One active season called "Spring, Year 1"

### routes.yml

Create minimal routes configuration for the sample content. Reference existing routes.yml structure.

### sidebar.yml

Create minimal sidebar configuration for navigating the sample content. Reference existing sidebar.yml structure.

### public/css/global-styles.css

A starter CSS file with comments explaining how users can customize the appearance. Include CSS custom property overrides as examples. We need to figure out what to do with the `article.css` file and the corresponding layout component.

### public/images/maps/

Include a simple map image for the dungeon.

---

## Implementation Notes

1. **Schema Compliance:** Reference actual schemas in `packages/schemas/src/schemas/` to ensure all files are correctly structured.

2. **Cross-References:** Ensure all IDs referenced (encounters in hexes, NPCs in factions, etc.) actually exist.

3. **Conditional Collections:** Some collections may be optional if the conditional registration feature is working. Check which collections can be omitted.

4. **Map Configuration:** The region needs appropriate map configuration for the interactive map component.

5. **Content Tone:** Keep the writing practical and useful as a template. Avoid overly purple prose.

---

## Testing Checklist

After creating all files:

- [ ] All YAML files validate against schemas
- [ ] `npm run dev` starts without errors
- [ ] Homepage renders
- [ ] Region page shows hexes
- [ ] Hex pages show encounters and keyed encounters correctly
- [ ] Dungeon page renders with rooms
- [ ] NPC pages show faction affiliations
- [ ] Faction pages list members
- [ ] Encounter pages show stat blocks and linked roleplay books
- [ ] Roleplay book intelligence reports render correctly
- [ ] Rumors page lists all rumors
- [ ] Interactive map displays the region
- [ ] Character sheet renders for sample character
