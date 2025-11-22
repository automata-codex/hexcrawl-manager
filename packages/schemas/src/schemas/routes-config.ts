import { z } from 'zod';

/**
 * Route configuration schemas for data/routes.yml
 *
 * Routes can be:
 * - Typed route objects (article, composite, collection)
 * - Direct string paths (for legacy/special cases)
 * - Nested objects containing more routes
 * - Objects with special keys like _defaultSecure
 *
 * The _defaultSecure key sets security defaults for all routes in that branch.
 */

/**
 * Article route - references an article by its frontmatter id
 */
export const ArticleRouteSchema = z
  .object({
    type: z.literal('article'),
    id: z.string(),
  })
  .describe('ArticleRouteSchema');

/**
 * Composite route - references a composite article by its id
 */
export const CompositeRouteSchema = z
  .object({
    type: z.literal('composite'),
    id: z.string(),
  })
  .describe('CompositeRouteSchema');

/**
 * Collection route - defines paths for a collection index and detail pages
 */
export const CollectionRouteSchema = z
  .object({
    type: z.literal('collection'),
    path: z.string(),
    idPath: z.string(),
    allPath: z.string().optional(),
  })
  .describe('CollectionRouteSchema');

/**
 * A typed route can be an article, composite, or collection reference
 */
export const TypedRouteSchema = z.union([
  ArticleRouteSchema,
  CompositeRouteSchema,
  CollectionRouteSchema,
]);

/**
 * A route value can be:
 * - A typed route object (article, composite, collection)
 * - A direct string path (for legacy/special cases like image URLs)
 * - A nested object containing more routes
 */
export const RouteValueSchema: z.ZodType<RouteValue> = z.lazy(() =>
  z.union([
    TypedRouteSchema,
    z.string(),
    z.boolean(), // for _defaultSecure
    z.record(z.string(), RouteValueSchema),
  ])
);

/**
 * Type for route values (recursive)
 */
export type RouteValue =
  | z.infer<typeof TypedRouteSchema>
  | string
  | boolean
  | { [key: string]: RouteValue };

/**
 * A route node can contain:
 * - _defaultSecure: boolean (optional) - security default for this branch
 * - Any string key mapping to a typed route, string path, or nested object
 */
export const RouteNodeSchema = z
  .record(z.string(), RouteValueSchema)
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

export type ArticleRouteData = z.infer<typeof ArticleRouteSchema>;
export type CompositeRouteData = z.infer<typeof CompositeRouteSchema>;
export type CollectionRouteData = z.infer<typeof CollectionRouteSchema>;
export type TypedRouteData = z.infer<typeof TypedRouteSchema>;
export type RouteNodeData = z.infer<typeof RouteNodeSchema>;
export type RoutesConfigData = z.infer<typeof RoutesConfigSchema>;
