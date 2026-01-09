import type { DetailTables } from '@achm/core';

// Detail Tables for Inclement+ weather
export const DETAIL_TABLES: DetailTables = {
  spring: {
    die: '1d6',
    entries: [
      'Crackling thunderstorm nearby (close strikes)',
      'Pelting hail shreds foliage and dents gear',
      'Flash flood through gullies and creeks',
      'Tornado funnel seen on the horizon',
      'Cold snap with freezing rain on surfaces',
      'Violent squall line; eerie calm afterward',
    ],
  },
  summer: {
    die: '1d8',
    entries: [
      'Blistering heat wave; exhaustion risk',
      'Humidity wall; insects everywhere',
      'Thunderhead towers dominate the sky',
      'Microburst snaps trees, flattens tents',
      'Flash flood from sudden cloudburst',
      'Day turns to night under storm core',
      'Wildfire ignition in the region',
      'Windstorm derecho races across the land',
    ],
  },
  autumn: {
    die: '1d6',
    entries: [
      'Gale-force winds; flying debris',
      'Cold deluge; fire-making is difficult',
      'Coastal storm surge floods lowlands',
      'Hurricane remnant brings wind and rain',
      'First snow at higher elevations',
      'Leaf storm swirls, briefly disorienting',
    ],
  },
  winter: {
    die: '1d8',
    entries: [
      'Whiteout blizzard; near-zero visibility',
      'Ice storm coats everything in glaze',
      'Polar-vortex cold; exposed skin freezes fast',
      'Avalanche threat on loaded slopes',
      'River ice cracks or collapses',
      'Deep snowdrifts block routes',
      'Endless day-gloom; spirits flag',
      'Howling gale; speech and ranged shots hindered',
    ],
  },
};
