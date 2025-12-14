function stripArticles(s: string): string {
  return s.replace(/^(a|an|the)\s+/i, '');
}

export function sortIgnoringArticles(a: string, b: string): number {
  return stripArticles(a).localeCompare(stripArticles(b));
}

// Usage
// items.sort((a, b) => sortIgnoringArticles(a.name, b.name));
