import { SECURITY_ROLE } from './constants.ts';
import type { SecurityRole } from './constants.ts';

/**
 * Asks the question, "Is someone with <clearance> allowed to access content restricted to <role>?"
 * @param role
 * @param clearance
 * @returns {boolean}
 */
export function isAccessAllowed(role: SecurityRole, clearance: string | null): boolean {
  // "GM" can access everything
  if (clearance === SECURITY_ROLE.GM) {
    return true;
  }

  // You have to have "HIDDEN" clearance to view hidden content (remember "GM" can view everything)
  if (role === SECURITY_ROLE.HIDDEN && clearance === SECURITY_ROLE.HIDDEN) {
    return true;
  }

  // Everyone can access public content
  // noinspection RedundantIfStatementJS
  if (role === SECURITY_ROLE.PUBLIC) {
    return true;
  }

  return false;
}
