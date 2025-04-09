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
            { label: 'The Known World', href: '/players-reference/setting/known-world' },
            { label: 'Nobility of Vaulridge', href: '/players-reference/setting/vaulridge-nobility' },
            { label: 'Baruun Khil, the Western Frontier', href: '/players-reference/setting/western-frontier' },
            { label: 'Explored Hexes', href: '/players-reference/setting/baruun-khil-map' },
            { label: 'NPCs', href: '/players-reference/setting/npcs' },
            { label: 'Bounty Board', href: '/players-reference/setting/bounty-board' },
          ],
        },
        {
          id: 'player-maps',
          label: 'Maps',
          expandable: true,
          items: [
            { label: 'The Known World', href: '/players-reference/setting/known-world' },
            { label: 'Baruun Khil, the Western Frontier', href: '/players-reference/setting/baruun-khil-map' },
          ],
        },
        {
          id: 'player-rules',
          label: 'Rules',
          expandable: true,
          items: [
            { label: 'House Rules', href: '/players-reference/rules/house-rules' },
            { label: 'Character Advancement', href: '/players-guide/advancement' },
            { label: 'Havens', href: '/players-reference/rules/havens' },
            { label: 'Third-party Supplements', href: '/players-reference/rules/supplements' },
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
        { id: 'map-regions', label: 'Map Regions', href: '/session-toolkit/regions' },
        { id: 'hex-catalog', label: 'Hex Catalog', href: '/session-toolkit/hexes' },
        { id: 'scaling-encounters', label: 'Scaling Encounters', href: '/session-toolkit/scaling-encounters' },
        {
          id: 'clues',
          label: 'Clues',
          expandable: true,
          items: [
            { label: 'Fixed Clues', href: '/session-toolkit/clues/fixed-clues' },
            { label: 'Floating Clues', href: '/session-toolkit/clues/floating-clues' },
          ],
        },
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
        { id: 'rumors', label: 'Rumors', href: '/session-toolkit/rumors' },
        { id: 'scar-sites', label: 'Scar Sites', href: ROUTES.sessionToolkit.scarSites },
        { id: 'treasure', label: 'Treasure', href: '/session-toolkit/treasure' },
        { id: 'timeline', label: 'Timeline', href: '/session-toolkit/timeline' },
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
        { id: 'characters', label: 'Characters', href: '/gm-reference/characters' },
        { id: 'cosmology', label: 'Cosmology', href: '/gm-reference/cosmology' },
        { id: 'dungeons', label: 'Dungeons', href: '/gm-reference/dungeons' },
        { id: 'encounters', label: 'Encounters', href: '/gm-reference/encounters' },
        { id: 'factions', label: 'Factions', href: '/gm-reference/factions' },
        {
          id: 'first-civilization',
          label: 'First Civilization',
          expandable: true,
          items: [
            { label: 'The Velari', href: ROUTES.gmReference.firstCivilization.velari },
            { label: 'The Catastrophe and Aftermath', href: ROUTES.gmReference.firstCivilization.catastropheAndAftermath },
            { label: 'Scar Sites', href: ROUTES.sessionToolkit.scarSites },
            { label: 'The Skyspire', href: ROUTES.gmReference.firstCivilization.skyspire },
            { label: 'Airships', href: ROUTES.gmReference.firstCivilization.airships },
          ],
        },
        { id: 'gm-notes-western-frontier', label: 'GM\'s Notes on Baruun Khil', href: '/gm-reference/western-frontier-gms-notes' },
        { id: 'gm-nobility', label: 'Nobility of Vaulridge', href: '/players-reference/setting/vaulridge-nobility' },
        { id: 'stat-blocks', label: 'Stat Blocks', href: ROUTES.gmReference.statBlocks },
      ],
    }
  ];

  if (canAccess(role, [SCOPES.GM])) return [...shared, ...gmOnly];
  if (canAccess(role, [SCOPES.PUBLIC, SCOPES.PLAYER])) return shared;
  return shared;
}
