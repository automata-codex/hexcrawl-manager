export const ROLLOVER_DEV_FILE_RE =
  /^dev_rollover_(\d{4})-(spring|summer|autumn|winter)_[^/]+\.jsonl$/i;

export const ROLLOVER_FILE_RE = /^rollover_(\d{4})-(spring|summer|autumn|winter)\.jsonl$/i;

// Accept BOTH underscore & hyphen in filenames (migration-safe).
// Examples we support:
//   session_0001_2025-10-01.jsonl
//   session_0001a_2025-10-01.jsonl
//   session-0001_2025-10-01.jsonl
//   session-0001a_2025-10-01.jsonl
export const SESSION_FILE_RE = /^session[-_](\d{4})([a-z])?_(\d{4}-\d{2}-\d{2})\.jsonl$/i; // TODO eventually we'll only have the hyphen between "session" and the number

export const REPORT_FILE_RE = /^session-(\d{4})\.ya?ml$/i;
