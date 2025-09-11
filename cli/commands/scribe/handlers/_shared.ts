import { type Event, readJsonl } from '../lib/jsonl';

export function getEvents(filePath: string): Event[] {
  return readJsonl(filePath);
}
