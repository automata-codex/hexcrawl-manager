// The values here have to match what's in the session tokens
export const SECURITY_ROLE = {
  GM: 'gm',
  HIDDEN: 'hidden',
  PUBLIC: 'public',
} as const;

export type SecurityRole = typeof SECURITY_ROLE[keyof typeof SECURITY_ROLE];

export const SCOPES = {
  PUBLIC: 'public:view',
  GM: 'gm:view',
  HIDDEN: 'hidden:view',
} as const;
