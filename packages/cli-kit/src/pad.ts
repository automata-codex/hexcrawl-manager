export function pad(n: number, len = 4) {
  return n.toString().padStart(len, '0');
}
