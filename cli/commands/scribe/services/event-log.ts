import { atomicWrite } from '@skyreach/data';

import { readJsonl, appendJsonl, writeJsonl } from '@skyreach/data';

import type { Event } from '@skyreach/cli-kit';

const nowISO = () => new Date().toISOString();
const nextSeq = (evs: Event[]) =>
  evs.length ? Math.max(...evs.map((e) => e.seq)) + 1 : 1;

export const readEvents = (filePath: string) => readJsonl(filePath);
export const writeEvents = (filePath: string, events: Event[]) =>
  writeJsonl(filePath, events);

export const writeEventsWithHeader = (
  filePath: string,
  header: Record<string, any>,
  events: Event[] = [],
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
  const rec: Event = { seq: nextSeq(evs), ts: nowISO(), kind, payload };
  appendJsonl(filePath, rec);
  return rec;
};

export const timeNowISO = nowISO;
