import { canAccess } from './auth.ts';
import { SCOPES } from './constants.ts';
import type { SidebarSection } from '../types.ts';

export function getSidebarSections(role: string|null): SidebarSection[] {
  const shared: SidebarSection[] = [
    {
      id: 'players-guide',
      label: 'Player’s Guide',
      items: [
        { id: 'heritage', label: 'Heritage', href: '/characters/ancestries-and-cultures' },
        { id: 'class', label: 'Class', href: '/characters/classes' },
        { id: 'goals', label: 'Goals', href: '/characters/character-goals' },
        { id: 'advancement', label: 'Advancement', href: '/characters/advancement' },
      ],
    },
    {
      id: 'players-reference',
      label: 'Player’s Reference',
      items: [
        { id: 'progress', label: 'Progress Tracker', href: '/characters/progress' },
        {
          id: 'player-setting',
          label: 'Setting',
          expandable: true,
          items: [
            { label: 'The Known World', href: '/setting/known-world' },
            { label: 'Nobility of Vaulridge', href: '/setting/vaulridge-nobility' },
            { label: 'Baruun Khil, the Western Frontier', href: '/setting/western-frontier' },
            { label: 'Explored Hexes', href: '/setting/baruun-khil-map' },
            { label: 'NPCs', href: '/npcs' },
            { label: 'Bounty Board', href: '/player-notes/bounty-board' },
          ],
        },
        {
          id: 'player-maps',
          label: 'Maps',
          expandable: true,
          items: [
            { label: 'The Known World', href: '/setting/known-world' },
            { label: 'Baruun Khil, the Western Frontier', href: '/setting/baruun-khil-map' },
          ],
        },
        {
          id: 'player-rules',
          label: 'Rules',
          expandable: true,
          items: [
            { label: 'House Rules', href: '/rules/house-rules' },
            { label: 'Character Advancement', href: '/characters/advancement' },
            { label: 'Havens', href: '/rules/havens' },
            { label: 'Third-party Supplements', href: '/rules/supplements' },
          ],
        },
        { id: 'session-notes', label: 'Session Notes', href: '/player-notes/sessions' },
      ],
    },
  ];

  const gmOnly: SidebarSection[] = [
    {
      id: 'session-toolkit',
      label: 'Session Toolkit',
      items: [
        { id: 'map-regions', label: 'Map Regions', href: '/regions' },
        { id: 'hex-catalog', label: 'Hex Catalog', href: '/hexes' },
        { id: 'scaling-encounters', label: 'Scaling Encounters', href: '/gm-notes/scaling-encounters' },
        {
          id: 'clues',
          label: 'Clues',
          expandable: true,
          items: [
            { label: 'Fixed Clues', href: '/gm-notes/fixed-clues' },
            { label: 'Floating Clues', href: '/gm-notes/floating-clues' },
          ],
        },
        {
          id: 'gm-maps',
          label: 'Maps',
          expandable: true,
          items: [
            { label: 'Map with Locations', href: '/images/maps/gm-map-with-locations.png' },
            { label: 'Map with Terrain', href: '/images/maps/gm-map-with-terrain.png' },
          ],
        },
        { id: 'rumors', label: 'Rumors', href: '/gm-notes/rumors' },
        { id: 'treasure', label: 'Treasure', href: '/gm-notes/treasure' },
        { id: 'timeline', label: 'Timeline', href: '/gm-notes/timeline' },
        {
          id: 'minigames',
          label: 'Minigames',
          expandable: true,
          items: [
            { label: 'Griffon Hunt', href: '/minigames/griffon-hunt' },
          ],
        },
      ],
    },
    {
      id: 'gmTools',
      label: 'GM Tools',
      items: [
        { id: 'session-notes', label: 'Session Notes', href: '/session-notes' },
        { id: 'bounty-board', label: 'Bounty Board', href: '/bounty-board' },
        { id: 'characters', label: 'Characters', href: '/characters' }
      ],
    }
  ];

  if (canAccess(role, [SCOPES.GM])) return [...shared, ...gmOnly];
  if (canAccess(role, [SCOPES.PUBLIC, SCOPES.PLAYER])) return shared;
  return shared;
}
