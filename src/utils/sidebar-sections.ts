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
      id: 'reference',
      label: 'GM Reference',
      items: [
        {
          label: 'Regions',
          expandable: true,
          id: 'regions',
          items: [
            { label: 'Region 01', href: '/regions/01' },
            { label: 'Region 02', href: '/regions/02' },
            { label: 'Region 03', href: '/regions/03' }
          ]
        },
        { id: 'rumors', label: 'Rumors', href: '/rumors' },
        { id: 'clues', label: 'Clues', href: '/clues' },
        { id: 'timeline', label: 'Timeline', href: '/timeline' }
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
