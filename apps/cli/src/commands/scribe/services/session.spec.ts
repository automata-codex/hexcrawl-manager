import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  checkSessionDateConsistency,
  checkSessionSequenceGaps,
  inProgressPathFor,
} from './session';

vi.mock('node:fs');
vi.mock('node:path');

// Helper mocks for dependencies
const mockREPO_PATHS = {
  SESSIONS: vi.fn(() => '/mock/sessions'),
  IN_PROGRESS: vi.fn(() => '/mock/in-progress'),
  DEV_IN_PROGRESS: vi.fn(() => '/mock/dev-in-progress'),
  META: vi.fn(() => '/mock/meta.yaml'),
};
const mockParseSessionFilename = vi.fn();
const mockReadEvents = vi.fn();
const mockLockExists = vi.fn();
const mockCreateLockFile = vi.fn();
const mockLoadMeta = vi.fn();
const mockMakeSessionId = vi.fn();
const mockAssertSessionId = vi.fn();
const mockGetLockFilePath = vi.fn();
const mockBuildSessionFilename = vi.fn();

vi.mock('@skyreach/data', () => ({
  REPO_PATHS: mockREPO_PATHS,
  parseSessionFilename: mockParseSessionFilename,
  readEvents: mockReadEvents,
  lockExists: mockLockExists,
  createLockFile: mockCreateLockFile,
  loadMeta: mockLoadMeta,
  makeSessionId: mockMakeSessionId,
  assertSessionId: mockAssertSessionId,
  getLockFilePath: mockGetLockFilePath,
  buildSessionFilename: mockBuildSessionFilename,
}));

// --- Tests for checkSessionDateConsistency ---
describe('checkSessionDateConsistency', () => {
  it('returns mismatch if session_start date does not match filename', () => {
    mockParseSessionFilename.mockReturnValue({ date: '2025-10-15' });
    mockReadEvents.mockReturnValue([
      { kind: 'session_start', sessionDate: '2025-10-14' },
    ]);
    const result = checkSessionDateConsistency({
      files: ['session_001_2025-10-15.jsonl'],
      dirName: 'SESSIONS',
      collect: true,
    });
    expect(result?.mismatches.length).toBe(1);
    expect(result?.warnings[0]).toMatch(/Session date mismatch/);
  });

  it('returns warning if session_start event is missing', () => {
    mockParseSessionFilename.mockReturnValue({ date: '2025-10-15' });
    mockReadEvents.mockReturnValue([{ kind: 'other_event' }]);
    const result = checkSessionDateConsistency({
      files: ['session_001_2025-10-15.jsonl'],
      dirName: 'SESSIONS',
      collect: true,
    });
    expect(result?.warnings[0]).toMatch(/No session_start event found/);
  });

  it('returns warning if date cannot be parsed from filename', () => {
    mockParseSessionFilename.mockReturnValue(null);
    const result = checkSessionDateConsistency({
      files: ['badfile.jsonl'],
      dirName: 'SESSIONS',
      collect: true,
    });
    expect(result?.warnings[0]).toMatch(/Could not parse date from filename/);
  });
});

// --- Tests for checkSessionSequenceGaps ---
describe('checkSessionSequenceGaps', () => {
  beforeEach(() => {
    mockParseSessionFilename.mockReset();
    mockReadEvents.mockReset();
  });

  it('detects missing sequence numbers', () => {
    mockParseSessionFilename
      .mockReturnValueOnce({ sessionNumber: 1 })
      .mockReturnValueOnce({ sessionNumber: 3 });
    const result = checkSessionSequenceGaps({
      sessionFiles: ['session_001.jsonl', 'session_003.jsonl'],
      inProgressFiles: [],
      lockFiles: [],
      collect: true,
    });
    expect(result?.gaps).toContain(2);
    expect(result?.warnings.some(w => w.includes('Missing session sequence'))).toBe(true);
  });

  it('marks intentional gaps for interactive sessions', () => {
    mockParseSessionFilename.mockReturnValue({ sessionNumber: 2 });
    mockReadEvents.mockReturnValue([
      { kind: 'session_start', mode: 'interactive' },
    ]);
    const result = checkSessionSequenceGaps({
      sessionFiles: ['session_002.jsonl'],
      inProgressFiles: [],
      lockFiles: [],
      collect: true,
    });
    expect(result?.intentionalGaps).toContain(2);
    expect(result?.infos[0]).toMatch(/Intentional sequence gaps/);
  });
});

// --- Tests for inProgressPathFor ---
describe('inProgressPathFor', () => {
  it('returns dev path if devMode is true', () => {
    const result = inProgressPathFor('session_001', true);
    expect(result).toContain('/mock/dev-in-progress/session_001.jsonl');
  });
  it('returns prod path if devMode is false', () => {
    const result = inProgressPathFor('session_001', false);
    expect(result).toContain('/mock/in-progress/session_001.jsonl');
  });
});

