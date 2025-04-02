import { canAccess } from './auth.ts';
import { SCOPES } from './constants.ts';
import type { SidebarSection } from '../types.ts';

export function getSidebarSections(role: string|null): SidebarSection[] {
  const shared: SidebarSection[] = [
    {
      id: 'playersGuide',
      label: 'Player’s Guide',
      items: [
        { id: 'heritage', label: 'Heritage', href: '/heritage' },
        { id: 'class', label: 'Class', href: '/class' },
        { id: 'goals', label: 'Goals', href: '/goals' },
        { id: 'level-up', label: 'Level Up', href: '/level-up' }
      ],
    }
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
