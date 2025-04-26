import { canAccess } from './auth.ts';
import { SCOPES } from './constants.ts';
import type { SidebarSection } from '../types.ts';
import { ROUTES } from './routes.ts';

export function getSidebarSections(role: string|null): SidebarSection[] {
  const shared: SidebarSection[] = [
    {
      id: 'players-guide',
      label: 'Player’s Guide',
      items: [
        { id: 'heritage', label: 'Heritage', href: '/players-guide/ancestries-and-cultures' },
        { id: 'class', label: 'Class', href: '/players-guide/classes' },
        { id: 'goals', label: 'Goals', href: '/players-guide/character-goals' },
        { id: 'advancement', label: 'Advancement', href: '/players-guide/advancement' },
      ],
    },
    {
      id: 'players-reference',
      label: 'Player’s Reference',
      items: [
        { id: 'progress', label: 'Progress Tracker', href: '/players-reference/progress' },
        {
          id: 'player-setting',
          label: 'Setting',
          expandable: true,
          items: [
            { label: 'The Known World', href: ROUTES.playersReference.setting.knownWorld },
            { label: 'Nobility of Vaulridge', href: ROUTES.playersReference.setting.vaulridgeNobility },
            { label: 'Baruun Khil, the Western Frontier', href: ROUTES.playersReference.setting.westernFrontier },
            { label: 'Explored Hexes', href: ROUTES.playersReference.setting.baruunKhilMap },
            { label: 'NPCs', href: ROUTES.playersReference.setting.npcs },
            { label: 'Bounty Board', href: ROUTES.playersReference.setting.bountyBoard.index },
            { label: 'Cosmology', href: ROUTES.playersReference.setting.cosmology },
          ],
        },
        {
          id: 'player-maps',
          label: 'Maps',
          expandable: true,
          items: [
            { label: 'The Known World', href: '/players-reference/setting/known-world' },
            { label: 'Baruun Khil, the Western Frontier', href: '/players-reference/setting/baruun-khil-map' },
            { label: 'Glinting Steps', href: ROUTES.playersReference.setting.glintingStepsMap },
          ],
        },
        { id: 'retcons', label: 'Retcons', href: ROUTES.playersReference.retcons },
        {
          id: 'player-rules',
          label: 'Rules',
          expandable: true,
          items: [
            { label: 'House Rules', href: ROUTES.playersReference.rules.houseRules },
            { label: 'Character Advancement', href: ROUTES.playersGuide.advancement },
            { label: 'Hexcrawl Rules', href: ROUTES.playersReference.rules.hexcrawlRules },
            { label: 'Havens', href: ROUTES.playersReference.rules.havens },
            { label: 'Third-party Supplements', href: ROUTES.playersReference.rules.supplements },
          ],
        },
        { id: 'session-notes', label: 'Session Notes', href: '/players-reference/sessions' },
      ],
    },
  ];

  const gmOnly: SidebarSection[] = [
    {
      id: 'session-toolkit',
      label: 'Session Toolkit',
      items: [
        { id: 'map-regions', label: 'Map Regions', href: ROUTES.sessionToolkit.regions.index },
        { id: 'hex-catalog', label: 'Hex Catalog', href: ROUTES.sessionToolkit.hexes.index },
        { id: 'encounter-builder', label: 'Encounter Builder', href: ROUTES.sessionToolkit.encounterBuilder },
        { id: 'scaling-encounters', label: 'Scaling Encounters', href: ROUTES.sessionToolkit.scalingEncounters },
        {
          id: 'clues',
          label: 'Clues',
          expandable: true,
          items: [
            { label: 'Floating Clues', href: ROUTES.sessionToolkit.clues.floatingClues.index },
            { label: 'Clues for Alistar', href: ROUTES.sessionToolkit.clues.cluesForAlistar },
            { label: 'Clues for Daemaris', href: ROUTES.sessionToolkit.clues.cluesForDaemaris },
            { label: 'Clues for Thorn', href: ROUTES.sessionToolkit.clues.cluesForThorn },
            { label: 'Drunken Soldier', href: ROUTES.sessionToolkit.clues.drunkenSoldier },
            { label: 'Twin Sigils', href: ROUTES.sessionToolkit.clues.twinSigils },
          ],
        },
        { id: 'loot-packs', label: 'Loot Packs', href: ROUTES.sessionToolkit.lootPacks.index },
        {
          id: 'gm-maps',
          label: 'Maps',
          expandable: true,
          items: [
            { label: 'Baruun Khil (Locations)', href: '/images/maps/gm-map-with-locations.png' },
            { label: 'Baruun Khil (Terrain)', href: '/images/maps/gm-map-with-terrain.png' },
            { label: 'Kobold Caves', href: '/session-toolkit/maps/kobold-caves' },
          ],
        },
        {
          id: 'roleplay-books',
          label: 'Roleplay Books',
          expandable: true,
          items: [
            { label: 'Alseid', href: ROUTES.sessionToolkit.roleplayBooks.alseid },
            { label: 'Bearfolk', href: ROUTES.sessionToolkit.roleplayBooks.bearfolk },
            { label: 'Gearforged', href: ROUTES.sessionToolkit.roleplayBooks.gearforged },
            { label: 'Kobolds', href: ROUTES.sessionToolkit.roleplayBooks.kobolds },
          ],
        },
        { id: 'rumors', label: 'Rumors', href: ROUTES.sessionToolkit.rumors.index },
        { id: 'scar-sites', label: 'Scar Sites', href: ROUTES.sessionToolkit.scarSites },
        { id: 'timeline', label: 'Timeline', href: ROUTES.sessionToolkit.timeline },
        {
          id: 'minigames',
          label: 'Minigames',
          expandable: true,
          items: [
            { label: 'Griffon Hunt', href: '/session-toolkit/minigames/griffon-hunt' },
          ],
        },
      ],
    },
    {
      id: 'gm-reference',
      label: 'GM Reference',
      items: [
        { id: 'characters', label: 'Characters', href: ROUTES.gmReference.characters.index },
        { id: 'cosmology', label: 'Cosmology', href: ROUTES.playersReference.setting.cosmology },
        { id: 'dungeons', label: 'Dungeons', href: ROUTES.gmReference.dungeons.index },
        { id: 'encounters', label: 'Encounters', href: '/gm-reference/encounters' },
        { id: 'factions', label: 'Factions', href: '/gm-reference/factions' },
        {
          id: 'first-civilization',
          label: 'First Civilization',
          expandable: true,
          items: [
            { label: 'The Velari', href: ROUTES.gmReference.firstCivilization.velari },
            { label: 'Demographics', href: ROUTES.gmReference.firstCivilization.demographics },
            { label: 'The Catastrophe and Aftermath', href: ROUTES.gmReference.firstCivilization.catastropheAndAftermath },
            { label: 'Scar Sites', href: ROUTES.sessionToolkit.scarSites },
            { label: 'The Skyspire', href: ROUTES.gmReference.firstCivilization.skyspire },
            { label: 'Crystals', href: ROUTES.gmReference.firstCivilization.crystals },
            { label: 'Crystal Reference', href: ROUTES.gmReference.firstCivilization.crystalReference },
            { label: 'Airships', href: ROUTES.gmReference.firstCivilization.airships },
          ],
        },
        { id: 'gm-notes-western-frontier', label: 'GM\'s Notes on Baruun Khil', href: '/gm-reference/western-frontier-gms-notes' },
        { id: 'gm-nobility', label: 'Nobility of Vaulridge', href: '/players-reference/setting/vaulridge-nobility' },
        { id: 'region-budget', label: 'Region Budget Guidelines', href: ROUTES.gmReference.regionBudgetGuidelines },
        { id: 'stat-blocks', label: 'Stat Blocks', href: ROUTES.gmReference.statBlocks.index },
      ],
    }
  ];

  if (canAccess(role, [SCOPES.GM])) return [...shared, ...gmOnly];
  if (canAccess(role, [SCOPES.PUBLIC, SCOPES.PLAYER])) return shared;
  return shared;
}
