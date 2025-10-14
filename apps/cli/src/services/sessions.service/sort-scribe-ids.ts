// Sort scribe log basenames by date/suffix
// Accepts: session_0021_2025-09-17.jsonl, session_0021a_2025-09-17.jsonl
export function sortScribeIds(ids: string[]): string[] {
  function parse(id: string) {
    const match = id.match(/^session_(\d{4})([a-z]?)_([\d-]+)\.jsonl$/);
    if (!match) {
      return { num: 0, suffix: '', date: '', orig: id };
    }

    return {
      num: parseInt(match[1], 10),
      suffix: match[2] || '',
      date: match[3],
      orig: id,
    };
  }

  return [...ids].sort((a, b) => {
    const pa = parse(a),
      pb = parse(b);

    // 1. Asc by session number
    if (pa.num !== pb.num) {
      return pa.num - pb.num;
    }

    // 2. Tie-break by suffix: (no suffix) < 'a' < 'b' < ...
    if (pa.suffix !== pb.suffix) {
      if (pa.suffix === '') {
        return -1;
      }
      if (pb.suffix === '') {
        return 1;
      }
      return pa.suffix < pb.suffix ? -1 : 1;
    }

    // 3. Tie-break by date (YYYY-MM-DD)
    if (pa.date !== pb.date) {
      return pa.date < pb.date ? -1 : 1;
    }

    return 0;
  });
}
