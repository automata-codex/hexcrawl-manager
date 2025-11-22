import { z } from 'zod';

/**
 * Route configuration schemas for data/routes.yml
 *
 * Routes can be:
 * - Direct string paths (e.g., '/gm-reference/biomes')
 * - Nested objects containing more routes
 * - Objects with special keys like _defaultSecure
 *
 * The _defaultSecure key sets security defaults for all routes in that branch.
 */

/**
 * A route node can contain:
 * - _defaultSecure: boolean (optional) - security default for this branch
 * - Any string key mapping to a string path or nested object
 *
 * We use a permissive schema here because the routes config has arbitrary nesting.
 * Type safety is enforced at the loader level.
 */
export const RouteNodeSchema = z
  .record(z.string(), z.union([z.string(), z.boolean(), z.record(z.unknown())]))
  .describe('RouteNodeSchema');

/**
 * Root routes configuration
 * Top-level keys are route namespaces (gmReference, playersGuide, etc.)
 */
export const RoutesConfigSchema = z
  .object({
    index: z.string().optional(),
    gmReference: RouteNodeSchema.optional(),
    playersGuide: RouteNodeSchema.optional(),
    playersReference: RouteNodeSchema.optional(),
    sessionToolkit: RouteNodeSchema.optional(),
  })
  .catchall(RouteNodeSchema)
  .describe('RoutesConfigSchema');

export type RouteNodeData = z.infer<typeof RouteNodeSchema>;
export type RoutesConfigData = z.infer<typeof RoutesConfigSchema>;
