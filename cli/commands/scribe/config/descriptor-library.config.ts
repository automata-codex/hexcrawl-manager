import type { DescriptorLibrary } from '../types';

// Descriptor Library: 3 per season×category
export const DESCRIPTOR_LIBRARY: DescriptorLibrary = {
  spring: {
    Ideal:       ['crisp sun', 'birdsong', 'clear streams'],
    Nice:        ['mild breeze', 'scattered clouds', 'warming ground'],
    Agreeable:   ['cool drizzle', 'valley mist', 'damp soil'],
    Unpleasant:  ['steady rain', 'sodden trails', 'swollen creeks'],
    Inclement:   ['booming thunder', 'pelting hail', 'strobing lightning'],
    Extreme:     ['torrential sheets', 'hillside mudslides', 'flooded fords'],
    Catastrophic:['river out of banks', 'roads washed out', 'tornado signatures'],
  },
  summer: {
    Ideal:       ['warm sunshine', 'steady breeze', 'golden fields'],
    Nice:        ['bright skies', 'easy heat', 'lazy insects'],
    Agreeable:   ['humid haze', 'sticky afternoons', 'distant rumbles'],
    Unpleasant:  ['stifling heat', 'heat shimmer', 'sudden downpour'],
    Inclement:   ['violent thunderheads', 'crackling bolts', 'blinding rain'],
    Extreme:     ['choking smoke', 'parched ground', 'flash-flood torrents'],
    Catastrophic:['fireline on the ridge', 'falling ash', 'forest flattened'],
  },
  autumn: {
    Ideal:       ['crisp air', 'bright skies', 'leaves aflame'],
    Nice:        ['cool sun', 'long shadows', 'woodsmoke scent'],
    Agreeable:   ['steel-grey skies', 'gusty lanes', 'soaking rain'],
    Unpleasant:  ['cold squalls', 'leaf-slick roads', 'rattling shutters'],
    Inclement:   ['gale roar', 'sleet at elevation', 'driving rain'],
    Extreme:     ['coastal surge', 'uprooted trees', 'roaring windwall'],
    Catastrophic:['landfall bands', 'hillside slumps', 'valleys inundated'],
  },
  winter: {
    Ideal:       ['rare thaw', 'glittering sun', 'crisp footing'],
    Nice:        ['calm frost', 'powder sheen', 'breath plumes'],
    Agreeable:   ['light flurries', 'steady cold', 'iced branches'],
    Unpleasant:  ['heavy snow', 'blowing drifts', 'biting wind'],
    Inclement:   ['whiteout gusts', 'stinging sleet', 'roads vanish'],
    Extreme:     ['lethal chill', 'ice-lacquered trees', 'roofs groan'],
    Catastrophic:['superstorm wall', 'endless drift', 'world gone grey'],
  },
};
