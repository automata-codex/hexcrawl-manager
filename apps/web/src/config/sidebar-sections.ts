import { canAccess } from '../utils/auth.ts';
import { SCOPES } from '../utils/constants.ts';

import { ROUTES } from './routes.ts';

import type { SidebarSection } from '../types.ts';

export function getSidebarSections(role: string | null): SidebarSection[] {
  const shared: SidebarSection[] = [
    {
      id: 'players-guide',
      label: "Player's Guide",
      href: '/players-guide',
      items: [
        {
          id: 'heritage',
          label: 'Heritage',
          href: '/players-guide/ancestries-and-cultures',
        },
        { id: 'class', label: 'Class', href: '/players-guide/classes' },
        { id: 'goals', label: 'Goals', href: '/players-guide/character-goals' },
        {
          id: 'advancement',
          label: 'Advancement',
          href: '/players-guide/advancement',
        },
      ],
    },
    {
      id: 'players-reference',
      label: "Player's Reference",
      href: '/players-reference',
      items: [
        {
          id: 'progress',
          label: 'Progress Tracker',
          href: '/players-reference/progress',
        },
        {
          id: 'player-setting',
          label: 'Setting',
          expandable: true,
          hasToC: true,
          tocHref: '/players-reference/setting',
          items: [
            {
              label: 'The Known World',
              href: ROUTES.playersReference.setting.knownWorld,
            },
            {
              label: 'Nobility of Vaulridge',
              href: ROUTES.playersReference.setting.vaulridgeNobility,
            },
            {
              label: 'Baruun Khil, the Western Frontier',
              href: ROUTES.playersReference.setting.westernFrontier,
            },
            {
              label: 'Explored Hexes',
              href: ROUTES.playersReference.setting.baruunKhilMap,
            },
            { label: 'NPCs', href: ROUTES.playersReference.setting.npcs },
            {
              label: 'Bounty Board',
              href: ROUTES.playersReference.setting.bountyBoard.index,
            },
            {
              label: 'Cosmology',
              href: ROUTES.playersReference.setting.cosmology,
            },
          ],
        },
        {
          id: 'player-maps',
          label: 'Maps',
          expandable: true,
          hasToC: true,
          tocHref: '/players-reference/maps',
          items: [
            {
              label: 'The Known World',
              href: ROUTES.playersReference.setting.knownWorld,
            },
            {
              label: 'Interactive Hex Map',
              href: ROUTES.playersReference.interactiveMap,
            },
            {
              label: 'Baruun Khil, the Western Frontier',
              href: ROUTES.playersReference.setting.baruunKhilMap,
            },
            {
              label: 'Glinting Steps',
              href: ROUTES.playersReference.setting.glintingStepsMap,
            },
          ],
        },
        {
          id: 'retcons',
          label: 'Retcons',
          href: ROUTES.playersReference.retcons,
        },
        {
          id: 'player-rules',
          label: 'Rules',
          expandable: true,
          hasToC: true,
          tocHref: '/players-reference/rules',
          items: [
            {
              label: 'House Rules',
              href: ROUTES.playersReference.rules.houseRules,
            },
            {
              label: 'Character Advancement',
              href: ROUTES.playersGuide.advancement,
            },
            {
              label: 'Hexcrawl Rules',
              href: ROUTES.playersReference.rules.hexcrawlRules,
            },
            { label: 'Havens', href: ROUTES.playersReference.rules.havens },
            {
              label: 'Third-party Supplements',
              href: ROUTES.playersReference.rules.supplements,
            },
            {
              label: 'Winter 1512',
              href: ROUTES.gmReference.winter1512.playersGuide,
            },
          ],
        },
        {
          id: 'session-notes',
          label: 'Session Notes',
          href: '/players-reference/sessions',
        },
      ],
    },
  ];

  const gmOnly: SidebarSection[] = [
    {
      id: 'session-toolkit',
      label: 'Session Toolkit',
      href: '/session-toolkit',
      items: [
        {
          id: 'map-regions',
          label: 'Map Regions',
          href: ROUTES.sessionToolkit.regions.index,
        },
        {
          id: 'hex-catalog',
          label: 'Hex Catalog',
          href: ROUTES.sessionToolkit.hexes.index,
        },
        {
          id: 'encounter-builder',
          label: 'Encounter Builder',
          href: ROUTES.sessionToolkit.encounterBuilder,
        },
        {
          id: 'scaling-encounters',
          label: 'Scaling Encounters',
          href: ROUTES.sessionToolkit.scalingEncounters,
        },
        {
          id: 'clues',
          label: 'Clues',
          expandable: true,
          hasToC: true,
          tocHref: '/session-toolkit/clues',
          items: [
            {
              label: 'Floating Clues',
              href: ROUTES.sessionToolkit.clues.floatingClues.index,
            },
            {
              label: 'Clues for Alistar',
              href: ROUTES.sessionToolkit.clues.cluesForAlistar,
            },
            {
              label: 'Clues for Daemaris',
              href: ROUTES.sessionToolkit.clues.cluesForDaemaris,
            },
            {
              label: 'Clues for Thorn',
              href: ROUTES.sessionToolkit.clues.cluesForThorn,
            },
            {
              label: 'Drunken Soldier',
              href: ROUTES.sessionToolkit.clues.drunkenSoldier,
            },
            {
              label: 'Twin Sigils',
              href: ROUTES.sessionToolkit.clues.twinSigils,
            },
          ],
        },
        {
          id: 'loot-packs',
          label: 'Loot Packs',
          href: ROUTES.sessionToolkit.lootPacks.index,
        },
        {
          id: 'gm-maps',
          label: 'Maps',
          expandable: true,
          hasToC: true,
          tocHref: '/session-toolkit/maps',
          items: [
            {
              label: 'Baruun Khil (Locations)',
              href: '/images/maps/gm-map-with-locations.png',
            },
            {
              label: 'Baruun Khil (Terrain)',
              href: '/images/maps/gm-map-with-terrain.png',
            },
            {
              label: 'Kobold Caves',
              href: '/session-toolkit/maps/kobold-caves',
            },
          ],
        },
        {
          id: 'hexcrawl-quick-reference',
          label: 'Hexcrawl Quick Reference',
          href: ROUTES.sessionToolkit.hexcrawlQuickReference,
        },
        {
          id: 'roleplay-books',
          label: 'Roleplay Books',
          expandable: true,
          hasToC: true,
          tocHref: '/session-toolkit/roleplay-books',
          items: [
            {
              label: 'Alseid',
              href: ROUTES.sessionToolkit.roleplayBooks.alseid,
            },
            {
              label: 'Bearfolk',
              href: ROUTES.sessionToolkit.roleplayBooks.bearfolk,
            },
            {
              label: 'Fort Dagaric',
              href: ROUTES.sessionToolkit.roleplayBooks.fortDagaric,
            },
            {
              label: 'Gearforged',
              href: ROUTES.sessionToolkit.roleplayBooks.gearforged,
            },
            {
              label: 'Kobolds',
              href: ROUTES.sessionToolkit.roleplayBooks.kobolds,
            },
          ],
        },
        {
          id: 'rumors',
          label: 'Rumors',
          href: ROUTES.sessionToolkit.rumors.index,
        },
        {
          id: 'scar-sites',
          label: 'Scar Sites',
          href: ROUTES.sessionToolkit.scarSites,
        },
        {
          id: 'timeline',
          label: 'Timeline',
          href: ROUTES.sessionToolkit.timeline,
        },
        {
          id: 'minigames',
          label: 'Minigames',
          expandable: true,
          hasToC: true,
          tocHref: '/session-toolkit/minigames',
          items: [
            {
              label: 'Griffon Hunt',
              href: '/session-toolkit/minigames/griffon-hunt',
            },
          ],
        },
      ],
    },
    {
      id: 'gm-reference',
      label: 'GM Reference',
      href: '/gm-reference',
      items: [
        { id: 'biomes', label: 'Biomes', href: ROUTES.gmReference.biomes },
        {
          id: 'characters',
          label: 'Characters',
          href: ROUTES.gmReference.characters.index,
        },
        {
          id: 'cosmology',
          label: 'Cosmology',
          href: ROUTES.playersReference.setting.cosmology,
        },
        {
          id: 'dungeons',
          label: 'Dungeons',
          href: ROUTES.gmReference.dungeons.index,
        },
        {
          id: 'encounters',
          label: 'Encounters',
          href: ROUTES.gmReference.encounters.index,
        },
        {
          id: 'factions',
          label: 'Factions',
          href: ROUTES.gmReference.factions.index,
        },
        {
          id: 'first-civilization',
          label: 'First Civilization',
          expandable: true,
          hasToC: true,
          tocHref: '/gm-reference/first-civilization',
          items: [
            {
              label: 'The Velari',
              href: ROUTES.gmReference.firstCivilization.velari,
            },
            {
              label: 'Demographics',
              href: ROUTES.gmReference.firstCivilization.demographics,
            },
            {
              label: 'The Catastrophe and Aftermath',
              href: ROUTES.gmReference.firstCivilization
                .catastropheAndAftermath,
            },
            { label: 'Scar Sites', href: ROUTES.sessionToolkit.scarSites },
            {
              label: 'The Skyspire',
              href: ROUTES.gmReference.firstCivilization.skyspire,
            },
            {
              label: 'Occupations at the Skyspire',
              href: ROUTES.gmReference.firstCivilization.skyspireOccupations,
            },
            {
              label: 'Skyspire Materials and Zones',
              href: ROUTES.gmReference.firstCivilization
                .skyspireMaterialsAndZones,
            },
            {
              label: 'Skyspire Original Zones',
              href: ROUTES.gmReference.firstCivilization.skyspireOriginalZones,
            },
            {
              label: 'Skyspire Terrain',
              href: ROUTES.gmReference.firstCivilization.skyspireTerrain,
            },
            {
              label: 'Crystals',
              href: ROUTES.gmReference.firstCivilization.crystals,
            },
            {
              label: 'Crystal Reference',
              href: ROUTES.gmReference.firstCivilization.crystalReference,
            },
            {
              label: 'Airships',
              href: ROUTES.gmReference.firstCivilization.airships,
            },
          ],
        },
        {
          id: 'glossary',
          label: 'Glossary',
          href: ROUTES.gmReference.glossary,
        },
        {
          id: 'gm-nobility',
          label: 'Nobility of Vaulridge',
          href: ROUTES.playersReference.setting.vaulridgeNobility,
        },
        {
          id: 'puzzles',
          label: 'Puzzles',
          expandable: true,
          hasToC: true,
          tocHref: '/gm-reference/puzzles',
          items: [
            {
              label: 'Gearforged Hermit',
              href: ROUTES.gmReference.puzzles.gearforgedHermit,
            },
            {
              label: 'The Pillars of Witness',
              href: ROUTES.gmReference.puzzles.pillarsOfWitness,
            },
          ],
        },
        {
          id: 'region-budget',
          label: 'Region Budget Guidelines',
          href: ROUTES.gmReference.regionBudgetGuidelines,
        },
        { id: 'schemas', label: 'Schemas', href: ROUTES.gmReference.schemas },
        {
          id: 'gm-setting',
          label: 'Setting',
          expandable: true,
          hasToC: true,
          tocHref: '/gm-reference/setting',
          items: [
            {
              label: 'Early Frontier',
              href: ROUTES.gmReference.setting.earlyFrontier,
            },
            {
              label: "GM's Notes on Baruun Khil",
              href: ROUTES.gmReference.setting.westernFrontierGmsNotes,
            },
          ],
        },
        {
          id: 'stat-blocks',
          label: 'Stat Blocks',
          href: ROUTES.gmReference.statBlocks.index,
        },
        {
          id: 'winter-1512',
          label: 'Winter 1512',
          href: ROUTES.gmReference.winter1512.index,
        },
      ],
    },
  ];

  if (canAccess(role, [SCOPES.GM])) return [...shared, ...gmOnly];
  if (canAccess(role, [SCOPES.PUBLIC, SCOPES.PLAYER])) return shared;
  return shared;
}
