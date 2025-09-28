// Pick next session id (Option R)
import { pad } from './pad';

export function pickNextSessionId(
  completed: number[],
  availableWithLogs: number[],
): string {
  const maxCompleted = completed.length ? Math.max(...completed) : 0;
  const candidates = availableWithLogs.filter((n) => n > maxCompleted);

  if (!candidates.length) {
    throw new Error('No available session with logs after last completed.');
  }

  const next = Math.min(...candidates);
  return `session-${pad(next)}`;
}
