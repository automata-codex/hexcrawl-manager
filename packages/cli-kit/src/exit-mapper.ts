// eslint-disable-next-line no-unused-vars
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Creates a mapping function that returns an exit code for a given error.
 *
 * @param pairs - Tuples of [ErrorClass, exitCode]
 * @param defaultCode - Code to return if no mapping matches
 */
export function makeExitMapper(
  pairs: [Constructor, number][],
  defaultCode = 1,
) {
  return (err: unknown): number => {
    for (const [Ctor, code] of pairs) {
      if (err instanceof Ctor) return code;
    }
    return defaultCode;
  };
}
