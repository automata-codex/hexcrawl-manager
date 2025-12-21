/** @deprecated Use function from `@achm/schemas` instead. */
export function padSessionNum(n: number | string) {
  const str = n.toString().trim();
  if (/^\d{4}$/.test(str)) {
    return str; // already correct
  }

  if (/^\d+$/.test(str)) {
    const digits = str.replace(/^0+/, ''); // strip leading zeros
    return digits.padStart(4, '0').slice(-4); // normalize to 4 digits
  }

  throw new Error(`Invalid session number: ${n}`);
}
