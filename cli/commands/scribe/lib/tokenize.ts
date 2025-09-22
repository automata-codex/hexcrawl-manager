// Allow quoted args: note "party rests here"
export function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = '',
    q: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      q = c as any;
    } else if (/\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}
