export type Context = {
  sessionId: string | null;
  file: string | null;      // in-progress file path
  lastHex: string | null;
  party: string[];
};
