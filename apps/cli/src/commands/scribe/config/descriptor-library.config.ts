import type { DescriptorLibrary } from '@achm/core';

// Descriptor Library: 3 per season×category
export const DESCRIPTOR_LIBRARY: DescriptorLibrary = {
  spring: {
    ideal: ['crisp sun', 'birdsong', 'clear streams'],
    nice: ['mild breeze', 'scattered clouds', 'warming ground'],
    agreeable: ['cool drizzle', 'valley mist', 'damp soil'],
    unpleasant: ['steady rain', 'sodden trails', 'swollen creeks'],
    inclement: ['booming thunder', 'pelting hail', 'strobing lightning'],
    extreme: ['torrential sheets', 'hillside mudslides', 'flooded fords'],
    catastrophic: [
      'river out of banks',
      'roads washed out',
      'tornado signatures',
    ],
  },
  summer: {
    ideal: ['warm sunshine', 'steady breeze', 'golden fields'],
    nice: ['bright skies', 'easy heat', 'lazy insects'],
    agreeable: ['humid haze', 'sticky afternoons', 'distant rumbles'],
    unpleasant: ['stifling heat', 'heat shimmer', 'sudden downpour'],
    inclement: ['violent thunderheads', 'crackling bolts', 'blinding rain'],
    extreme: ['choking smoke', 'parched ground', 'flash-flood torrents'],
    catastrophic: ['fireline on the ridge', 'falling ash', 'forest flattened'],
  },
  autumn: {
    ideal: ['crisp air', 'bright skies', 'leaves aflame'],
    nice: ['cool sun', 'long shadows', 'woodsmoke scent'],
    agreeable: ['steel-grey skies', 'gusty lanes', 'soaking rain'],
    unpleasant: ['cold squalls', 'leaf-slick roads', 'rattling shutters'],
    inclement: ['gale roar', 'sleet at elevation', 'driving rain'],
    extreme: ['coastal surge', 'uprooted trees', 'roaring windwall'],
    catastrophic: ['landfall bands', 'hillside slumps', 'valleys inundated'],
  },
  winter: {
    ideal: ['rare thaw', 'glittering sun', 'crisp footing'],
    nice: ['calm frost', 'powder sheen', 'breath plumes'],
    agreeable: ['light flurries', 'steady cold', 'iced branches'],
    unpleasant: ['heavy snow', 'blowing drifts', 'biting wind'],
    inclement: ['whiteout gusts', 'stinging sleet', 'roads vanish'],
    extreme: ['lethal chill', 'ice-lacquered trees', 'roofs groan'],
    catastrophic: ['superstorm wall', 'endless drift', 'world gone grey'],
  },
};
