export const ROUTES = {
  gmReference: {
    biomes: '/gm-reference/biomes',
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
      catastropheAndAftermath:
        '/gm-reference/first-civilization/catastrophe-and-aftermath',
      crystals: '/gm-reference/first-civilization/crystals',
      crystalReference: '/gm-reference/first-civilization/crystal-reference',
      demographics: '/gm-reference/first-civilization/demographics',
      skyspire: '/gm-reference/first-civilization/the-skyspire',
      skyspireMaterialsAndZones:
        '/gm-reference/first-civilization/skyspire-materials-and-zones',
      skyspireOccupations:
        '/gm-reference/first-civilization/skyspire-occupations',
      skyspireOriginalZones:
        '/gm-reference/first-civilization/skyspire-original-zones',
      skyspireTerrain: '/gm-reference/first-civilization/skyspire-terrain',
      velari: '/gm-reference/first-civilization/the-velari',
    },
    glossary: '/gm-reference/glossary',
    knowledgeTrees: {
      id: '/gm-reference/knowledge-trees/[id]',
    },
    puzzles: {
      gearforgedHermit: '/gm-reference/puzzles/gearforged-hermit',
      pillarsOfWitness: '/gm-reference/puzzles/pillars-of-witness',
    },
    regionBudgetGuidelines: '/gm-reference/region-budget-guidelines',
    schemas: '/gm-reference/schemas',
    setting: {
      earlyFrontier: '/gm-reference/setting/early-frontier',
      westernFrontierGmsNotes: '/gm-reference/western-frontier-gms-notes',
    },
    statBlocks: {
      id: '/gm-reference/stat-blocks/[id]',
      index: '/gm-reference/stat-blocks',
    },
  },
  index: '/',
  playersGuide: {
    advancement: '/players-guide/advancement',
    ancestriesAndCultures: '/players-guide/ancestries-and-cultures',
    characterGoals: '/players-guide/character-goals',
    classes: '/players-guide/classes',
  },
  playersReference: {
    interactiveMap: '/players-reference/interactive-map',
    progress: '/players-reference/progress',
    rules: {
      havens: '/players-reference/rules/havens',
      hexcrawlRules: '/players-reference/rules/hexcrawl-rules',
      houseRules: '/players-reference/rules/house-rules',
      supplements: '/players-reference/rules/supplements',
    },
    retcons: '/players-reference/retcons',
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
      floatingClues: {
        id: '/session-toolkit/clues/floating-clues/[id]',
        all: '/session-toolkit/clues/floating-clues/all',
        index: '/session-toolkit/clues/floating-clues',
      },
      cluesForAlistar: '/session-toolkit/clues/clues-for-alistar',
      cluesForDaemaris: '/session-toolkit/clues/clues-for-daemaris',
      cluesForThorn: '/session-toolkit/clues/clues-for-thorn',
      drunkenSoldier: '/session-toolkit/clues/drunken-soldier',
      twinSigils: '/session-toolkit/clues/twin-sigils',
    },
    encounterBuilder: '/session-toolkit/encounter-builder',
    hexcrawlQuickReference: '/session-toolkit/hexcrawl-quick-reference',
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
    npcs: {
      magisterUlrichVerrian: '/session-toolkit/npcs/magister-ulrich-verrian',
    },
    regions: {
      id: '/session-toolkit/regions/[id]',
      all: '/session-toolkit/regions/all',
      index: '/session-toolkit/regions',
    },
    roleplayBooks: {
      id: '/session-toolkit/roleplay-books/[id]',
      index: '/session-toolkit/roleplay-books',
      alseid: '/session-toolkit/roleplay-books/alseid',
      bearfolk: '/session-toolkit/roleplay-books/bearfolk',
      gearforged: '/session-toolkit/roleplay-books/gearforged',
      kobolds: '/session-toolkit/roleplay-books/kobolds',
    },
    rumors: {
      id: '/session-toolkit/rumors/[id]',
      all: '/session-toolkit/rumors/all',
      index: '/session-toolkit/rumors',
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
    slug: 'ancestries-and-cultures',
    path: ROUTES.playersGuide.ancestriesAndCultures,
  },
  {
    slug: 'biomes',
    path: ROUTES.gmReference.biomes,
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
    slug: 'clues/clues-for-alistar',
    path: ROUTES.sessionToolkit.clues.cluesForAlistar,
  },
  {
    slug: 'clues/clues-for-daemaris',
    path: ROUTES.sessionToolkit.clues.cluesForDaemaris,
  },
  {
    slug: 'clues/clues-for-thorn',
    path: ROUTES.sessionToolkit.clues.cluesForThorn,
  },
  {
    slug: 'clues/drunken-soldier',
    path: ROUTES.sessionToolkit.clues.drunkenSoldier,
  },
  {
    slug: 'clues/twin-sigils',
    path: ROUTES.sessionToolkit.clues.twinSigils,
  },
  {
    slug: 'crystal-reference',
    path: ROUTES.gmReference.firstCivilization.crystalReference,
  },
  {
    slug: 'crystals',
    path: ROUTES.gmReference.firstCivilization.crystals,
  },
  {
    slug: 'early-frontier',
    path: ROUTES.gmReference.setting.earlyFrontier,
  },
  {
    slug: 'first-civ/airships',
    path: ROUTES.gmReference.firstCivilization.airships,
  },
  {
    slug: 'first-civ/catastrophe-and-aftermath',
    path: ROUTES.gmReference.firstCivilization.catastropheAndAftermath,
  },
  {
    slug: 'first-civ/first-civilization-demographics',
    path: ROUTES.gmReference.firstCivilization.demographics,
  },
  {
    slug: 'first-civ/skyspire/materials-and-zones',
    path: ROUTES.gmReference.firstCivilization.skyspireMaterialsAndZones,
  },
  {
    slug: 'first-civ/skyspire/original-zones',
    path: ROUTES.gmReference.firstCivilization.skyspireOriginalZones,
  },
  {
    slug: 'first-civ/skyspire/skyspire',
    path: ROUTES.gmReference.firstCivilization.skyspire,
  },
  {
    slug: 'first-civ/skyspire/skyspire-occupations',
    path: ROUTES.gmReference.firstCivilization.skyspireOccupations,
  },
  {
    slug: 'first-civ/skyspire/terrain',
    path: ROUTES.gmReference.firstCivilization.skyspireTerrain,
  },
  {
    slug: 'first-civ/velari',
    path: ROUTES.gmReference.firstCivilization.velari,
  },
  {
    slug: 'glinting-steps-map',
    path: ROUTES.playersReference.setting.glintingStepsMap,
  },
  {
    slug: 'glossary',
    path: ROUTES.gmReference.glossary,
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
    slug: 'hexcrawl-quick-reference',
    path: ROUTES.sessionToolkit.hexcrawlQuickReference,
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
    slug: 'npcs/magister-ulrich-verrian',
    path: ROUTES.sessionToolkit.npcs.magisterUlrichVerrian,
  },
  {
    slug: 'puzzles/gearforged-hermit',
    path: ROUTES.gmReference.puzzles.gearforgedHermit,
  },
  {
    slug: 'puzzles/pillars-of-witness',
    path: ROUTES.gmReference.puzzles.pillarsOfWitness,
  },
  {
    slug: 'region-budget-guidelines',
    path: ROUTES.gmReference.regionBudgetGuidelines,
  },
  {
    slug: 'retcons',
    path: ROUTES.playersReference.retcons,
  },
  {
    slug: 'roleplay-book-alseid',
    path: ROUTES.sessionToolkit.roleplayBooks.alseid,
  },
  {
    slug: 'roleplay-book-bearfolk',
    path: ROUTES.sessionToolkit.roleplayBooks.bearfolk,
  },
  {
    slug: 'roleplay-book-gearforged',
    path: ROUTES.sessionToolkit.roleplayBooks.gearforged,
  },
  {
    slug: 'roleplay-book-kobolds',
    path: ROUTES.sessionToolkit.roleplayBooks.kobolds,
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
    slug: 'timeline',
    path: ROUTES.sessionToolkit.timeline,
  },
  {
    slug: 'western-frontier',
    path: ROUTES.playersReference.setting.westernFrontier,
  },
  {
    slug: 'western-frontier-gms-notes',
    path: ROUTES.gmReference.setting.westernFrontierGmsNotes,
  },
];

export function getDungeonPath(dungeonId: string): string {
  return interpolateRoute(ROUTES.gmReference.dungeons.id, { id: dungeonId });
}

export function getEncounterPath(encounterId: string): string {
  return interpolateRoute(ROUTES.gmReference.encounters.id, {
    id: encounterId,
  });
}

export function getFloatingCluePath(floatingClueId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.clues.floatingClues.id, {
    id: floatingClueId,
  });
}

export function getHexPath(hexId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.hexes.id, {
    id: hexId,
  }).toLowerCase();
}

export function getLootPackPath(lootPackId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.lootPacks.id, {
    id: lootPackId,
  });
}

export function getRegionPath(regionId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.regions.id, { id: regionId });
}

export function getRoleplayBookPath(roleplayBookId: string): string {
  return interpolateRoute(ROUTES.sessionToolkit.roleplayBooks.id, {
    id: roleplayBookId,
  });
}

export function getStatBlockPath(statBlockId: string): string {
  return interpolateRoute(ROUTES.gmReference.statBlocks.id, {
    id: statBlockId,
  });
}

export function interpolateRoute(
  route: string,
  params: Record<string, string>,
): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`[${key}]`, value),
    route,
  );
}
