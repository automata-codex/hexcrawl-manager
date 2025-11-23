/**
 * Security resolution utilities for route-level access control.
 *
 * Routes can inherit security defaults from parent paths via _defaultSecure
 * in data/routes.yml. Article-level secure: true/false overrides route defaults.
 */

import { camelCase } from 'lodash-es';

import { ROUTES } from '../config/routes';

/**
 * Find the inherited _defaultSecure value for a given path.
 *
 * Traverses from the root of the routes config down toward the leaf,
 * collecting _defaultSecure values along the way. The closest ancestor
 * to the target path wins (child _defaultSecure overrides parent).
 *
 * Example for path '/gm-reference/first-civilization/the-velari':
 *   1. Check ROUTES (root) for _defaultSecure → none
 *   2. Check gmReference for _defaultSecure → true (save it)
 *   3. Check firstCivilization for _defaultSecure → false (overwrite)
 *   4. Return false (closest ancestor wins)
 *
 * @param path - URL path (e.g., '/gm-reference/biomes')
 * @returns The inherited _defaultSecure value, or undefined if none found
 */
function findDefaultSecureForPath(path: string): boolean | undefined {
  const segments = path.split('/').filter(Boolean);
  let current: Record<string, unknown> = ROUTES as Record<string, unknown>;
  let defaultSecure: boolean | undefined = undefined;

  // Walk down from root to leaf, tracking the most recent _defaultSecure
  for (const segment of segments) {
    // Check current node for _defaultSecure before descending
    if (
      current &&
      typeof current === 'object' &&
      '_defaultSecure' in current
    ) {
      defaultSecure = current._defaultSecure as boolean;
    }

    // Descend to next level (convert kebab-case URL to camelCase config key)
    const key = camelCase(segment);
    const next = current?.[key];

    if (next && typeof next === 'object') {
      current = next as Record<string, unknown>;
    } else {
      // Reached a leaf (string path) or missing key, stop descending
      break;
    }
  }

  // Check final node for _defaultSecure (in case we stopped at an object)
  if (current && typeof current === 'object' && '_defaultSecure' in current) {
    defaultSecure = current._defaultSecure as boolean;
  }

  return defaultSecure;
}

/**
 * Determines if a route should be secure based on:
 * 1. Article frontmatter `secure` field (highest priority)
 * 2. Route config `_defaultSecure` (inherited from closest ancestor)
 * 3. Global default of false (lowest priority)
 *
 * @param path - URL path (e.g., '/gm-reference/biomes')
 * @param articleSecure - Explicit secure value from article frontmatter (optional)
 * @returns Whether the route should be treated as secure
 */
export function isSecureRoute(
  path: string,
  articleSecure?: boolean,
): boolean {
  // Article explicit setting takes precedence
  if (articleSecure !== undefined) {
    return articleSecure;
  }

  // Check route config for inherited _defaultSecure
  const defaultSecure = findDefaultSecureForPath(path);
  if (defaultSecure !== undefined) {
    return defaultSecure;
  }

  // Default to public
  return false;
}
