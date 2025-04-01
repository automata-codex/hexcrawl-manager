export const sidebarSections = [
  {
    id: 'playersGuide',
    label: 'Player’s Guide',
    items: [
      { label: 'Heritage', href: '/heritage' },
      { label: 'Class', href: '/class' },
      { label: 'Goals', href: '/goals' },
      { label: 'Level Up', href: '/level-up' }
    ]
  },
  {
    id: 'gmTools',
    label: 'GM Tools',
    items: [
      { label: 'Session Notes', href: '/session-notes' },
      { label: 'Bounty Board', href: '/bounty-board' },
      { label: 'Characters', href: '/characters' }
    ]
  },
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
      { label: 'Rumors', href: '/rumors' },
      { label: 'Clues', href: '/clues' },
      { label: 'Timeline', href: '/timeline' }
    ]
  }
];
