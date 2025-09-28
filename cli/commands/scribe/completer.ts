import { PILLARS } from '@skyreach/core';

import { TIERS } from './constants';
import { getAllCharacterIds } from './services/character';

export function scribeCompleter(line: string): [string[], string] {
  const m = /([^\s]*)$/.exec(line) || ['', ''];
  const word = m[1];
  const before = line.slice(0, line.length - word.length).trimStart();
  const parts = before.split(/\s+/).filter(Boolean);

  let matches: string[] = [];

  if (parts[0] === 'party') {
    const sub = parts[1] ?? '';
    const subs = ['add', 'clear', 'list', 'remove'];
    if (parts.length <= 2 && (sub === '' || !subs.includes(sub))) {
      const q = (word || '').toLowerCase();
      matches = subs.filter((s) => s.startsWith(q));
      return [matches, word];
    }
    if (sub === 'add' || sub === 'remove') {
      const all = getAllCharacterIds();
      const q = (word || '').toLowerCase();
      const starts = all.filter((id) => id.toLowerCase().startsWith(q));
      matches = starts.length
        ? starts
        : all.filter((id) => id.toLowerCase().includes(q));
      return [matches, word];
    }
  }

  if (parts[0] === 'ap') {
    if (parts.length <= 1) {
      const q = (word || '').toLowerCase();
      const all = PILLARS as readonly string[];
      const starts = all.filter((p) => p.toLowerCase().startsWith(q));
      matches = starts.length
        ? starts
        : all.filter((p) => p.toLowerCase().includes(q));
      return [matches as string[], word];
    }
    if (parts.length === 2) {
      const q = (word || '').toLowerCase();
      const all = (TIERS as readonly number[]).map(String);
      const starts = all.filter((t) => t.startsWith(q));
      matches = starts.length ? starts : all.filter((t) => t.includes(q));
      return [matches, word];
    }
    return [[], word];
  }

  return [matches, word];
}
