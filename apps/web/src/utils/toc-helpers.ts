/**
 * Helper functions for Table of Contents page resolution.
 * Used by the catch-all route handler to detect and render ToC pages.
 *
 * IMPORTANT: These functions expect RESOLVED sidebar sections where all
 * typed hrefs have been converted to URL strings. Call resolveSidebarSections()
 * before passing sections to these functions.
 */

export interface ToCPageData {
  title: string;
  items: { label: string; href: string }[];
  parent?: { label: string; href: string };
}

/**
 * Resolved sidebar types - after href resolution, all hrefs are strings
 */
export interface ResolvedItem {
  id?: string;
  label: string;
  href?: string;
  hasToC?: boolean;
  tocHref?: string;
  items?: ResolvedItem[];
}

export interface ResolvedSection {
  id: string;
  label: string;
  href?: string;
  items: ResolvedItem[];
}

/**
 * Find a ToC page configuration for a given path.
 * Checks section hrefs, item tocHrefs, and sub-item tocHrefs recursively.
 *
 * @param path - The URL path to check (e.g., '/gm-reference/first-civilization')
 * @param sections - The sidebar sections configuration (must be resolved)
 * @returns ToC page data if path matches a ToC page, null otherwise
 */
export function findToCPage(
  path: string,
  sections: ResolvedSection[],
): ToCPageData | null {
  for (const section of sections) {
    // Check if this is a top-level section ToC page
    if (section.href === path) {
      // Collect all items from this section
      const items = collectToCItems(section.items);
      return {
        title: section.label,
        items,
      };
    }

    // Check items recursively for ToC pages
    const itemResult = findToCInItems(
      path,
      section.items,
      section.href ? { label: section.label, href: section.href } : undefined,
    );
    if (itemResult) {
      return itemResult;
    }
  }

  return null;
}

/**
 * Recursively search items for a ToC page match
 */
function findToCInItems(
  path: string,
  items: ResolvedItem[],
  parent?: { label: string; href: string },
): ToCPageData | null {
  for (const item of items) {
    if (item.hasToC && item.tocHref === path && item.items) {
      return {
        title: item.label,
        items: collectToCItems(item.items),
        parent,
      };
    }

    // Recurse into nested items
    if (item.items) {
      const result = findToCInItems(
        path,
        item.items,
        item.hasToC && item.tocHref
          ? { label: item.label, href: item.tocHref }
          : parent,
      );
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Collect ToC items from an items array
 */
function collectToCItems(
  items: ResolvedItem[],
): { label: string; href: string }[] {
  const result: { label: string; href: string }[] = [];

  for (const item of items) {
    if (item.hasToC && item.tocHref) {
      // Item with ToC page - link to the ToC page
      result.push({ label: item.label, href: item.tocHref });
    } else if (item.href) {
      // Direct link item
      result.push({ label: item.label, href: item.href });
    }
  }

  return result;
}
