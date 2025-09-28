export type Event = {
  seq: number; // 1..N within the file
  ts: string; // ISO timestamp
  kind: string; // "move" | "scout" | ...
  payload: Record<string, unknown>;
};
