/**
 * Server-side path resolution helpers for articles and composite articles.
 * These use astro:content and can only be used in .astro files or server-side code.
 */
import { getCollection } from 'astro:content';

/**
 * Route configuration types for the new article system.
 * Used by resolvePath() to dynamically resolve article/composite IDs to paths.
 */
export type RouteConfig =
  | string
  | { type: 'article'; id: string }
  | { type: 'composite'; id: string };

/**
 * Get the URL path for an article by its ID.
 * @throws Error if article not found or has no slug
 */
export async function getArticlePath(articleId: string): Promise<string> {
  const articles = await getCollection('articles');
  const article = articles.find((a) => a.data.id === articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }
  if (!article.data.slug) {
    throw new Error(`Article has no slug: ${articleId}`);
  }
  return article.data.slug;
}

/**
 * Get the URL path for a composite article by its ID.
 * @throws Error if composite not found
 */
export async function getCompositePath(compositeId: string): Promise<string> {
  const composites = await getCollection('composite-articles');
  const composite = composites.find((c) => c.data.id === compositeId);
  if (!composite) {
    throw new Error(`Composite article not found: ${compositeId}`);
  }
  return composite.data.slug;
}

/**
 * Resolve a RouteConfig to a URL path string.
 * Handles direct strings, article references, and composite references.
 */
export async function resolvePath(route: RouteConfig): Promise<string> {
  if (typeof route === 'string') {
    return route;
  }
  if (route.type === 'article') {
    return getArticlePath(route.id);
  }
  if (route.type === 'composite') {
    return getCompositePath(route.id);
  }
  throw new Error(`Unknown route type: ${JSON.stringify(route)}`);
}
