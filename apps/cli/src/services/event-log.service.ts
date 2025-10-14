import {
  appendJsonl,
  atomicWrite,
  readJsonlWithHeader,
  writeJsonl,
} from '@skyreach/data';
import {
  ScribeEventSchema,
  ScribeHeader,
  ScribeHeaderSchema,
  type ScribeEvent,
  type ScribeEventKind,
  type ScribeEventOfKind,
} from '@skyreach/schemas';

const nextSeq = (evs: ScribeEvent[]) =>
  evs.length ? Math.max(...evs.map((e) => e.seq)) + 1 : 1;

function makeEvent<K extends ScribeEventKind>(
  kind: K,
  payload: ScribeEventOfKind<K>['payload'],
  base: { seq: number; ts: string },
): ScribeEventOfKind<K> {
  return { ...base, kind, payload } as ScribeEventOfKind<K>;
}

export const appendEvent = <K extends ScribeEventKind>(
  filePath: string,
  kind: K,
  payload: ScribeEventOfKind<K>['payload'],
) => {
  const evs = readEvents(filePath);
  const base = { seq: nextSeq(evs), ts: timeNowISO() };
  const rec = makeEvent(kind, payload, base);

  appendJsonl<ScribeEvent>(filePath, rec as ScribeEvent);
  return rec;
};

export function eventsOf(events: ScribeEvent[], kind: string): ScribeEvent[] {
  return events.filter((e) => e.kind === kind);
}

export const readEvents = (filePath: string): ScribeEvent[] =>
  readJsonlWithHeader<ScribeHeader, ScribeEvent>(filePath, {
    headerSchema: ScribeHeaderSchema,
    eventSchema: ScribeEventSchema,
    requireHeader: false,
  }).events;

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
