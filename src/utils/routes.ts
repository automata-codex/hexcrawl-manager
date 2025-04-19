export const ROUTES = {
  gmReference: {
    characters: {
      id: '/gm-reference/characters/[id]',
      all: '/gm-reference/characters/all',
      index: '/gm-reference/characters',
    },
    dungeons: {
      id: '/gm-reference/dungeons/[id]',
      index: '/gm-reference/dungeons',
    },
    encounters: {
      id: '/gm-reference/encounters/[id]',
      index: '/gm-reference/encounters',
    },
    factions: {
      index: '/gm-reference/factions',
    },
    firstCivilization: {
      airships: '/gm-reference/first-civilization/airships',
      catastropheAndAftermath: '/gm-reference/first-civilization/catastrophe-and-aftermath',
      demographics: '/gm-reference/first-civilization/demographics',
      skyspire: '/gm-reference/first-civilization/the-skyspire',
      velari: '/gm-reference/first-civilization/the-velari',
    },
    regionBudgetGuidelines: '/gm-reference/region-budget-guidelines',
    statBlocks: {
      id: '/gm-reference/stat-blocks/[id]',
      index: '/gm-reference/stat-blocks',
    },
    westernFrontierGmsNotes: '/gm-reference/western-frontier-gms-notes',
  },
  index: '/',
  playersGuide: {
    advancement: '/players-guide/advancement',
    ancestriesAndCultures: '/players-guide/ancestries-and-cultures',
    characterGoals: '/players-guide/character-goals',
    classes: '/players-guide/classes',
  },
  playersReference: {
    progress: '/players-reference/progress',
    rules: {
      havens: '/players-reference/rules/havens',
      hexcrawlRules: '/players-reference/rules/hexcrawl-rules',
      houseRules: '/players-reference/rules/house-rules',
      supplements: '/players-reference/rules/supplements',
    },
    sessions: '/players-reference/sessions',
    setting: {
      baruunKhilMap: '/players-reference/setting/baruun-khil-map',
      baruunKhilMapPrint: '/players-reference/setting/baruun-khil-map-print',
      bountyBoard: {
        id: '/players-reference/setting/bounty-board/[id]',
        index: '/players-reference/setting/bounty-board',
      },
      cosmology: '/players-reference/setting/cosmology',
      glintingStepsMap: '/players-reference/setting/glinting-steps-map',
      knownWorld: '/players-reference/setting/known-world',
      npcs: '/players-reference/setting/npcs',
      vaulridgeNobility: '/players-reference/setting/vaulridge-nobility',
      westernFrontier: '/players-reference/setting/western-frontier',
    },
  },
  sessionToolkit: {
    clues: {
      fixedClues: {
        id: '/session-toolkit/clues/fixed-clues/[id]',
        all: '/session-toolkit/clues/fixed-clues/all',
        index: '/session-toolkit/clues/fixed-clues/index',
      },
      floatingClues: {
        id: '/session-toolkit/clues/floating-clues/[id]',
        all: '/session-toolkit/clues/floating-clues/all',
        index: '/session-toolkit/clues/floating-clues/index',
      },
    },
    hexes: {
      id: '/session-toolkit/hexes/[id]',
      index: '/session-toolkit/hexes',
    },
    lootPacks: {
      id: '/session-toolkit/loot-packs/[id]',
      all: '/session-toolkit/loot-packs/all',
      index: '/session-toolkit/loot-packs',
    },
    maps: {
      koboldCaves: '/session-toolkit/maps/kobold-caves',
    },
    minigames: {
      griffonHunt: '/session-toolkit/minigames/griffon-hunt',
    },
    regions: {
      id: '/session-toolkit/regions/[id]',
      all: '/session-toolkit/regions/all',
      index: '/session-toolkit/regions/index',
    },
    rumors: {
      id: '/session-toolkit/rumors/[id]',
      all: '/session-toolkit/rumors/all',
      index: '/session-toolkit/rumors/index',
    },
    scalingEncounters: '/session-toolkit/scaling-encounters',
    scarSites: '/session-toolkit/scar-sites',
    timeline: '/session-toolkit/timeline',
  },
} as const;

interface RouteData {
  slug: string;
  path: string;
}

export const ARTICLE_ROUTES: RouteData[] = [
  {
    slug: 'airships',
    path: ROUTES.gmReference.firstCivilization.airships,
  },
  {
    slug: 'ancestries-and-cultures',
    path: ROUTES.playersGuide.ancestriesAndCultures,
  },
  {
    slug: 'catastrophe-and-aftermath',
    path: ROUTES.gmReference.firstCivilization.catastropheAndAftermath,
  },
  {
    slug: 'character-advancement',
    path: ROUTES.playersGuide.advancement,
  },
  {
    slug: 'character-goals',
    path: ROUTES.playersGuide.characterGoals,
  },
  {
    slug: 'first-civilization-demographics',
    path: ROUTES.gmReference.firstCivilization.demographics,
  },
  {
    slug: 'glinting-steps-map',
    path: ROUTES.playersReference.setting.glintingStepsMap,
  },
  {
    slug: 'griffon-hunt',
    path: ROUTES.sessionToolkit.minigames.griffonHunt,
  },
  {
    slug: 'hexcrawl-rules',
    path: ROUTES.playersReference.rules.hexcrawlRules,
  },
  {
    slug: 'house-rules',
    path: ROUTES.playersReference.rules.houseRules,
  },
  {
    slug: 'kobold-caves',
    path: ROUTES.sessionToolkit.maps.koboldCaves,
  },
  {
    slug: 'region-budget-guidelines',
    path: ROUTES.gmReference.regionBudgetGuidelines,
  },
  {
    slug: 'scaling-encounters',
    path: ROUTES.sessionToolkit.scalingEncounters,
  },
  {
    slug: 'scar-sites',
    path: ROUTES.sessionToolkit.scarSites,
  },
  {
    slug: 'skyspire',
    path: ROUTES.gmReference.firstCivilization.skyspire,
  },
  {
    slug: 'timeline',
    path: ROUTES.sessionToolkit.timeline,
  },
  {
    slug: 'velari',
    path: ROUTES.gmReference.firstCivilization.velari,
  },
  {
    slug: 'western-frontier',
    path: ROUTES.playersReference.setting.westernFrontier,
  },
  {
    slug: 'western-frontier-gms-notes',
    path: ROUTES.gmReference.westernFrontierGmsNotes,
  },
];

export function getDungeonPath(dungeonId: string): string {
  return interpolateRoute(ROUTES.gmReference.dungeons.id, { id: dungeonId });
}

export function getEncounterPath(encounterId: string): string {
  return interpolateRoute(ROUTES.gmReference.encounters.id, { id: encounterId });
}

export function getFloatingCluePath(floatingClueId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.clues.floatingClues.id, { id: floatingClueId });
}

export function getHexPath(hexId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.hexes.id, { id: hexId }).toLowerCase();
}

export function getLootPackPath(lootPackId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.lootPacks.id, { id: lootPackId });
}

export function getRegionPath(regionId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.regions.id, { id: regionId });
}

export function getStatBlockPath(statBlockId: string): string {
  return interpolateRoute(ROUTES.gmReference.statBlocks.id, { id: statBlockId });
}

export function interpolateRoute(route: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`[${key}]`, value),
    route
  );
}
