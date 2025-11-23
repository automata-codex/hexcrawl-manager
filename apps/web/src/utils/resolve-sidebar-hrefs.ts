/**
 * Resolve typed hrefs in sidebar configuration to actual URLs.
 *
 * This utility transforms sidebar sections containing typed href objects
 * (article, composite, collection) into resolved URL strings that can be
 * used in navigation links.
 */

import { getCollection } from 'astro:content';

import type {
  SidebarHref,
  SidebarItem,
  SidebarSection,
  SidebarSubItem,
  TypedHref,
} from '../types';
import type {
  ResolvedItem,
  ResolvedSection,
  ResolvedSubItem,
} from './toc-helpers';

// Cache for article/composite slug lookups
let articleSlugMap: Map<string, string> | null = null;
let compositeSlugMap: Map<string, string> | null = null;

/**
 * Build article ID to slug mapping from content collection
 */
async function getArticleSlugMap(): Promise<Map<string, string>> {
  if (articleSlugMap) return articleSlugMap;

  const articles = await getCollection('articles');
  articleSlugMap = new Map();

  for (const article of articles) {
    const { id, slug } = article.data;
    if (id && slug) {
      articleSlugMap.set(id, slug);
    }
  }

  return articleSlugMap;
}

/**
 * Build composite ID to slug mapping from content collection
 */
async function getCompositeSlugMap(): Promise<Map<string, string>> {
  if (compositeSlugMap) return compositeSlugMap;

  const composites = await getCollection('composite-articles');
  compositeSlugMap = new Map();

  for (const composite of composites) {
    const { id, slug } = composite.data;
    if (id && slug) {
      compositeSlugMap.set(id, slug);
    }
  }

  return compositeSlugMap;
}

/**
 * Type guard to check if href is a typed href object
 */
function isTypedHref(href: SidebarHref | undefined): href is TypedHref {
  return (
    typeof href === 'object' &&
    href !== null &&
    'type' in href &&
    (href.type === 'article' ||
      href.type === 'composite' ||
      href.type === 'collection')
  );
}

/**
 * Resolve a single href to a URL string
 */
async function resolveHref(
  href: SidebarHref | undefined,
): Promise<string | undefined> {
  if (href === undefined) return undefined;

  // Already a string, return as-is
  if (typeof href === 'string') return href;

  // Typed href - resolve based on type
  if (isTypedHref(href)) {
    switch (href.type) {
      case 'article': {
        const slugMap = await getArticleSlugMap();
        const slug = slugMap.get(href.id);
        if (!slug) {
          console.warn(`Article not found for sidebar href: ${href.id}`);
          return '#';
        }
        return slug;
      }

      case 'composite': {
        const slugMap = await getCompositeSlugMap();
        const slug = slugMap.get(href.id);
        if (!slug) {
          console.warn(`Composite article not found for sidebar href: ${href.id}`);
          return '#';
        }
        return slug;
      }

      case 'collection': {
        // Collection paths are now full paths in sidebar.yml
        return href.path;
      }
    }
  }

  return undefined;
}

/**
 * Resolve all hrefs in a subitem
 */
async function resolveSubItem(item: SidebarSubItem): Promise<ResolvedSubItem> {
  const resolved = await resolveHref(item.href);
  return {
    label: item.label,
    href: resolved ?? '#',
  };
}

/**
 * Resolve all hrefs in a sidebar item
 */
async function resolveItem(item: SidebarItem): Promise<ResolvedItem> {
  const resolvedHref = await resolveHref(item.href);
  const resolvedItems = item.items
    ? await Promise.all(item.items.map(resolveSubItem))
    : undefined;

  return {
    id: item.id,
    label: item.label,
    href: resolvedHref,
    expandable: item.expandable,
    hasToC: item.hasToC,
    tocHref: item.tocHref,
    items: resolvedItems,
  };
}

/**
 * Resolve all hrefs in a sidebar section
 */
async function resolveSection(section: SidebarSection): Promise<ResolvedSection> {
  const resolvedHref = await resolveHref(section.href);
  const resolvedItems = await Promise.all(section.items.map(resolveItem));

  return {
    id: section.id,
    label: section.label,
    href: resolvedHref,
    items: resolvedItems,
  };
}

/**
 * Resolve all typed hrefs in sidebar sections to URL strings.
 *
 * This should be called server-side (in Astro components) before
 * passing sections to client-side components like SideNav.
 */
export async function resolveSidebarSections(
  sections: SidebarSection[],
): Promise<ResolvedSection[]> {
  return Promise.all(sections.map(resolveSection));
}
