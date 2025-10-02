import { readJsonl, writeJsonl, appendJsonl, atomicWrite } from '@skyreach/data';
import { type ScribeEvent, ScribeEventSchema } from '@skyreach/schemas';

const nowISO = () => new Date().toISOString();

const nextSeq = (evs: ScribeEvent[]) => (evs.length ? Math.max(...evs.map(e => e.seq)) + 1 : 1);

export const readEvents = (filePath: string) =>
  readJsonl<ScribeEvent>(filePath, { schema: ScribeEventSchema });

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

export const appendEvent = (
  filePath: string,
  kind: string,
  payload: Record<string, unknown>,
) => {
  const evs = readEvents(filePath);
  const rec: ScribeEvent = { seq: nextSeq(evs), ts: nowISO(), kind, payload };
  appendJsonl<ScribeEvent>(filePath, rec);
  return rec;
};

export const timeNowISO = nowISO;
