import { SCOPES, SECURITY_ROLE } from './constants.ts';
import type { Scope } from '../types.ts';

const DEFAULT_SCOPE = SCOPES.PUBLIC;

const ROLE_HIERARCHY = {
  [SECURITY_ROLE.PUBLIC]: [SCOPES.PUBLIC],
  [SECURITY_ROLE.HIDDEN]: [SCOPES.PUBLIC, SCOPES.HIDDEN],
  [SECURITY_ROLE.GM]: [SCOPES.PUBLIC, SCOPES.HIDDEN, SCOPES.GM],
} as const;

export function canAccess(role: string|null, scope: Scope): boolean {
  return getScopesForRole(role).includes(scope);
}

function getScopesForRole(role: string|null): Readonly<Scope[]> {
  // If role is a key of ROLE_HIERARCHY, return the value of that key
  if (role && role in ROLE_HIERARCHY) {
    return ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY];
  }
  // Otherwise, return [DEFAULT_SCOPE]
  return [DEFAULT_SCOPE];
}
