import {
  readJsonl,
  writeJsonl,
  appendJsonl,
  atomicWrite,
} from '@skyreach/data';
import { type ScribeEvent, ScribeEventSchema } from '@skyreach/schemas';

const nextSeq = (evs: ScribeEvent[]) =>
  evs.length ? Math.max(...evs.map((e) => e.seq)) + 1 : 1;

export const appendEvent = (
  filePath: string,
  kind: string,
  payload: Record<string, unknown>,
) => {
  const evs = readEvents(filePath);
  const rec: ScribeEvent = { seq: nextSeq(evs), ts: timeNowISO(), kind, payload };
  appendJsonl<ScribeEvent>(filePath, rec);
  return rec;
};

export function eventsOf(events: ScribeEvent[], kind: string): ScribeEvent[] {
  return events.filter((e) => e.kind === kind);
}

export const readEvents = (filePath: string): ScribeEvent[] =>
  readJsonl<ScribeEvent>(filePath, { schema: ScribeEventSchema });

export const timeNowISO = () => new Date().toISOString();

export const writeEvents = (filePath: string, events: ScribeEvent[]) =>
  writeJsonl<ScribeEvent>(filePath, events);

export const writeEventsWithHeader = (
  filePath: string,
  header: Record<string, unknown>,
  events: ScribeEvent[] = [],
) => {
  // Write atomically
  const content =
    [header, ...events].map((e) => JSON.stringify(e)).join('\n') + '\n';
  atomicWrite(filePath, content);
};
