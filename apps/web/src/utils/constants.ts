export const SCOPES = {
  GM: 'gm:view',
  PLAYER: 'player:view',
  PUBLIC: 'public:view',
} as const;

// The values here have to match what's in the session tokens
export const SECURITY_ROLE = {
  GM: 'gm',
  PLAYER: 'player',
  PUBLIC: 'public',
} as const;

export type SecurityRole = (typeof SECURITY_ROLE)[keyof typeof SECURITY_ROLE];

export const STORAGE_KEYS = {
  ENCOUNTER_BUILDER: 'encounter-builder-state',
  KNOWLEDGE_TREE_DETAILS: 'knowledge-tree-details',
  KNOWLEDGE_TREE_EXPANDED: 'knowledge-tree-expanded',
  LAYER_VISIBILITY: 'layer-visibility-state',
  MAP_VIEW: 'map-view-state',
  SELECTED_HEX: 'selected-hex-state',
  THEME_PREFERENCE: 'theme-preference',
} as const;

export const UNKNOWN_CONTENT = 'Unknown';

/**
 * Hex tag marking a hex as an impassable barrier to the Lost Valley. Drives a
 * warning banner in the map detail pane and the hex detail page: GMs see the
 * full routing hint, non-GM viewers see a spoiler-free version.
 */
export const LOST_VALLEY_BARRIER_TAG = 'lost-valley-barrier';
export const LOST_VALLEY_BARRIER_MESSAGE =
  '⚠️ Hex is impassable. Access to the Lost Valley is only through L3 or P3. ⚠️';
export const LOST_VALLEY_BARRIER_PLAYER_MESSAGE = '⚠️ Hex is impassable. ⚠️';
