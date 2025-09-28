import { SCOPES, SECURITY_ROLE } from './constants.ts';


import type { Scope } from '@skyreach/schemas';

const DEFAULT_SCOPE = SCOPES.PUBLIC;

const ROLE_SCOPE_MAP = {
  [SECURITY_ROLE.PUBLIC]: [SCOPES.PUBLIC],
  [SECURITY_ROLE.PLAYER]: [SCOPES.PLAYER],
  [SECURITY_ROLE.GM]: [SCOPES.GM],
} as const;

export function canAccess(role: string | null, scopes: Scope[]): boolean {
  const userScopes = getScopesForRole(role);
  return scopes
    .map((scope) => userScopes.includes(scope))
    .reduce((output, current) => output || current, false);
}

export function getCurrentUserRole(locals: App.Locals): string | null {
  const { role = null } = (locals.auth().sessionClaims ?? { role: null }) as {
    role: string | null;
  };
  return role;
}

function getScopesForRole(role: string | null): Readonly<Scope[]> {
  // If role is a key of ROLE_SCOPE_MAP, return the value of that key
  if (role && role in ROLE_SCOPE_MAP) {
    return ROLE_SCOPE_MAP[role as keyof typeof ROLE_SCOPE_MAP];
  }
  // Otherwise, return [DEFAULT_SCOPE]
  return [DEFAULT_SCOPE];
}
