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
  LAYER_VISIBILITY: 'layer-visibility-state',
  MAP_VIEW: 'map-view-state',
  SELECTED_HEX: 'selected-hex-state',
} as const;

export const UNKNOWN_CONTENT = 'Unknown';
