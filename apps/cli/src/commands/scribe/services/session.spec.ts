import { parseSessionFilename,  } from '@skyreach/data';
import { makeSessionId } from '@skyreach/schemas';
import {
  compileLog,
  dayEnd,
  dayStart,
  move, sessionEnd,
  sessionStart,
} from '@skyreach/test-helpers';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

import { readEvents } from '../../../services/event-log.service';

import {
  buildSeasonBlocks,
  checkSessionDateConsistency,
  checkSessionSequenceGaps,
  inProgressPathFor,
  normalizeTrailEdges,
  sortAndValidateEvents,
  synthesizeLifecycleEvents,
  updateMetaAndCleanup,
  validateEventLog,
  validateLockFile,
  validateSessionContext,
  validateSessionDates,
} from './session';


vi.mock('node:fs');
vi.mock('node:path');

// Helper mocks for dependencies
// const mockREPO_PATHS = {
//   SESSIONS: vi.fn(() => '/mock/sessions'),
//   IN_PROGRESS: vi.fn(() => '/mock/in-progress'),
//   DEV_IN_PROGRESS: vi.fn(() => '/mock/dev-in-progress'),
//   META: vi.fn(() => '/mock/meta.yaml'),
// };
// const mockParseSessionFilename = vi.fn();
// const mockReadEvents = vi.fn();
// const mockLockExists = vi.fn();
// const mockCreateLockFile = vi.fn();
// const mockLoadMeta = vi.fn();
// const mockMakeSessionId = vi.fn();
// const mockAssertSessionId = vi.fn();
// const mockGetLockFilePath = vi.fn();
// const mockBuildSessionFilename = vi.fn();

vi.mock('@skyreach/data', () => ({
  REPO_PATHS: {
    SESSIONS: vi.fn(() => '/mock/sessions'),
    IN_PROGRESS: vi.fn(() => '/mock/in-progress'),
    DEV_IN_PROGRESS: vi.fn(() => '/mock/dev-in-progress'),
    META: vi.fn(() => '/mock/meta.yaml'),
  },
  parseSessionFilename: vi.fn(),
  lockExists: vi.fn(),
  createLockFile: vi.fn(),
  loadMeta: vi.fn(),
  makeSessionId: vi.fn(),
  assertSessionId: vi.fn(),
  getLockFilePath: vi.fn(),
  buildSessionFilename: vi.fn(),
}));

vi.mock('../../../services/event-log.service', () => ({
  readEvents: vi.fn(),
}));

// --- Tests for checkSessionDateConsistency ---
describe('checkSessionDateConsistency', () => {
  it('returns mismatch if session_start date does not match filename', () => {
    (parseSessionFilename as Mock).mockReturnValue({ date: '2025-10-15' });
    (readEvents as Mock).mockReturnValue([
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
    (parseSessionFilename as Mock).mockReturnValue({ date: '2025-10-15' });
    (readEvents as Mock).mockReturnValue([{ kind: 'other_event' }]);
    const result = checkSessionDateConsistency({
      files: ['session_001_2025-10-15.jsonl'],
      dirName: 'SESSIONS',
      collect: true,
    });
    expect(result?.warnings[0]).toMatch(/No session_start event found/);
  });

  it('returns warning if date cannot be parsed from filename', () => {
    (parseSessionFilename as Mock).mockReturnValue(null);
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
    (parseSessionFilename as Mock).mockReset();
    (readEvents as Mock).mockReset();
  });

  it('detects missing sequence numbers', () => {
    (parseSessionFilename as Mock)
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
});

// --- Tests for buildSeasonBlocks ---
describe('buildSeasonBlocks', () => {
  it('splits events into blocks by seasonId from day_start events', () => {
    const sessionId = makeSessionId(27);
    const events = compileLog([
      sessionStart(sessionId, 'R14', '2025-10-15'),
      dayStart({ year: 1511, month: 'Lucidus', day: 31}),
      move('R14', 'R15'),
      dayEnd(0, 0),
      dayStart({ year: 1511, month: 'Fructara', day: 1}),
      move('R15', 'R16'),
      dayEnd(0, 0),
      sessionEnd(sessionId),
    ]);
    const expandedEvents = events.map((e, i) => ({ ...e, _origIdx: i }));
    const result = buildSeasonBlocks(expandedEvents);
    expect(result.blocks.length).toBe(2);
    expect(result.blocks[0].seasonId).toBe('1511-summer');
    expect(result.blocks[1].seasonId).toBe('1511-autumn');
  });

  it('returns error if no day_start events', () => {
    const sessionId = makeSessionId(27);
    const events = compileLog([
      sessionStart(sessionId, 'R14', '2025-10-15'),
      sessionEnd(sessionId),
    ]);
    const expandedEvents = events.map((e, i) => ({ ...e, _origIdx: i }));
    const result = buildSeasonBlocks(expandedEvents);
    expect(result.error).toMatch(/day_start/);
  });
});

// --- Tests for normalizeTrailEdges ---
describe.skip('normalizeTrailEdges', () => {
  it('swaps from/to if from > to by hexSort', () => {
    // vi.mocked(global.hexSort).mockImplementation((a, b) => (a > b ? 1 : -1));
    // vi.mocked(global.normalizeHexId).mockImplementation((id) => id.toLowerCase());
    const events = [
      { kind: 'trail', payload: { from: 'B2', to: 'A1' } },
    ];
    const result = normalizeTrailEdges(events);
    expect(result[0].payload.from).toBe('a1');
    expect(result[0].payload.to).toBe('b2');
  });
  it('does not swap if from < to', () => {
    // vi.mocked(global.hexSort).mockImplementation((a, b) => (a < b ? -1 : 1));
    // vi.mocked(global.normalizeHexId).mockImplementation((id) => id.toLowerCase());
    const events = [
      { kind: 'trail', payload: { from: 'A1', to: 'B2' } },
    ];
    const result = normalizeTrailEdges(events);
    expect(result[0].payload.from).toBe('a1');
    expect(result[0].payload.to).toBe('b2');
  });
});

// --- Tests for sortAndValidateEvents ---
// describe('sortAndValidateEvents', () => {
//   it('sorts events by timestamp and sequence', () => {
//     const events = [
//       { kind: 'move', ts: '2025-10-15T10:00:00Z', seq: 2 },
//       { kind: 'move', ts: '2025-10-15T09:00:00Z', seq: 1 },
//     ];
//     const result = sortAndValidateEvents(events);
//     expect(result.sortedEvents[0].seq).toBe(1);
//     expect(result.sortedEvents[1].seq).toBe(2);
//   });
//   it('returns error for non-monotonic timestamps', () => {
//     const events = [
//       { kind: 'move', ts: '2025-10-15T10:00:00Z', seq: 2 },
//       { kind: 'move', ts: '2025-10-15T09:00:00Z', seq: 3 },
//     ];
//     const result = sortAndValidateEvents(events);
//     // Spec: should error on impossible ordering
//     expect(result.error).toBeDefined();
//   });
// });

// --- Tests for synthesizeLifecycleEvents ---
// describe('synthesizeLifecycleEvents', () => {
//   it('inserts session_end if missing at block end', () => {
//     const blocks = [
//       { seasonId: '2025-spring', events: [{ kind: 'day_start', _origIdx: 0 }] },
//     ];
//     const sortedEvents = [{ kind: 'day_start', _origIdx: 0 }];
//     const sessionId = 'session_001';
//     const sessionDate = '2025-10-15';
//     const result = synthesizeLifecycleEvents(blocks, sortedEvents, sessionId, sessionDate);
//     expect(result.finalizedBlocks[0].events.some(e => e.kind === 'session_end')).toBe(true);
//   });
// });

// --- Tests for updateMetaAndCleanup ---
// describe('updateMetaAndCleanup', () => {
//   it('removes lock and in-progress files and updates meta if outputs written', () => {
//     const sessionId = 'session_001';
//     const inProgressFile = '/mock/in-progress/session_001.jsonl';
//     const outputs = ['output1.jsonl'];
//     const devMode = false;
//     vi.spyOn(global, 'removeLockFile').mockImplementation(() => {});
//     vi.spyOn(fs, 'existsSync').mockReturnValue(true);
//     vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
//     vi.spyOn(global, 'loadMeta').mockReturnValue({ nextSessionSeq: 2 });
//     vi.spyOn(global, 'parseSessionId').mockReturnValue({ number: 1 });
//     vi.spyOn(global, 'getLatestSessionNumber').mockReturnValue(1);
//     vi.spyOn(global, 'saveMeta').mockImplementation(() => {});
//     vi.spyOn(global, 'warn').mockImplementation(() => {});
//     updateMetaAndCleanup(sessionId, inProgressFile, outputs, devMode);
//     expect(fs.unlinkSync).toHaveBeenCalledWith(inProgressFile);
//   });
//   it('removes only in-progress file in dev mode', () => {
//     const sessionId = 'session_001';
//     const inProgressFile = '/mock/in-progress/session_001.jsonl';
//     const outputs = [];
//     const devMode = true;
//     vi.spyOn(fs, 'existsSync').mockReturnValue(true);
//     vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
//     updateMetaAndCleanup(sessionId, inProgressFile, outputs, devMode);
//     expect(fs.unlinkSync).toHaveBeenCalledWith(inProgressFile);
//   });
// });

// --- Tests for validateEventLog ---
// describe('validateEventLog', () => {
//   it('returns error if no events', () => {
//     const ctx = {};
//     const events = [];
//     const result = validateEventLog(ctx, events);
//     expect(result.error).toMatch(/at least one event/);
//   });
//   it('returns error if no day_start event', () => {
//     const ctx = {};
//     const events = [{ kind: 'move' }];
//     const result = validateEventLog(ctx, events);
//     expect(result.error).toMatch(/at least one day_start/);
//   });
//   it('returns error if session_pause is not at end', () => {
//     const ctx = {};
//     const events = [{ kind: 'session_pause' }, { kind: 'move' }];
//     const result = validateEventLog(ctx, events);
//     expect(result.error).toMatch(/session_pause may only appear at end/);
//   });
// });

// --- Tests for validateLockFile ---
// describe('validateLockFile', () => {
//   it('returns error if no lock file in prod mode', () => {
//     const ctx = { sessionId: 'session_001' };
//     const devMode = false;
//     vi.spyOn(global, 'assertSessionId').mockReturnValue('session_001');
//     vi.spyOn(global, 'getLockFilePath').mockReturnValue('/mock/lock/session_001.lock');
//     vi.spyOn(global, 'lockExists').mockReturnValue(false);
//     const result = validateLockFile(ctx, devMode);
//     expect(result.error).toMatch(/No lock file/);
//   });
//   it('returns error if lock file seq does not match sessionId', () => {
//     const ctx = { sessionId: 'session_001' };
//     const devMode = false;
//     vi.spyOn(global, 'assertSessionId').mockReturnValue('session_001');
//     vi.spyOn(global, 'getLockFilePath').mockReturnValue('/mock/lock/session_001.lock');
//     vi.spyOn(global, 'lockExists').mockReturnValue(true);
//     vi.spyOn(global, 'readLockFile').mockReturnValue({ seq: 2 });
//     vi.spyOn(global, 'parseSessionId').mockReturnValue({ number: 1 });
//     const result = validateLockFile(ctx, devMode);
//     expect(result.error).toMatch(/does not match lock file seq/);
//   });
// });

// --- Tests for validateSessionContext ---
// describe('validateSessionContext', () => {
//   it('returns error if sessionId or file missing', () => {
//     vi.spyOn(global, 'requireSession').mockReturnValue(false);
//     vi.spyOn(global, 'requireFile').mockReturnValue(false);
//     const ctx = {};
//     const result = validateSessionContext(ctx);
//     expect(result.error).toMatch(/Missing sessionId or file/);
//   });
//   it('returns no error if sessionId and file present', () => {
//     vi.spyOn(global, 'requireSession').mockReturnValue(true);
//     vi.spyOn(global, 'requireFile').mockReturnValue(true);
//     const ctx = { sessionId: 'session_001', file: 'file.jsonl' };
//     const result = validateSessionContext(ctx);
//     expect(result.error).toBeUndefined();
//   });
// });

// --- Tests for validateSessionDates ---
// describe('validateSessionDates', () => {
//   it('returns error if date cannot be parsed from filename', () => {
//     vi.spyOn(global, 'parseSessionFilename').mockReturnValue(null);
//     const filePath = 'badfile.jsonl';
//     const events = [];
//     const result = validateSessionDates(filePath, events);
//     expect(result.error).toMatch(/Could not parse session date from filename/);
//   });
//   it('returns error if session_start date does not match filename', () => {
//     vi.spyOn(global, 'parseSessionFilename').mockReturnValue({ date: '2025-10-15' });
//     const filePath = 'session_001_2025-10-14.jsonl';
//     const events = [{ kind: 'session_start', sessionDate: '2025-10-14' }];
//     const result = validateSessionDates(filePath, events);
//     expect(result.error).toMatch(/Session date mismatch/);
//   });
//   it('returns no error if session_start date matches filename', () => {
//     vi.spyOn(global, 'parseSessionFilename').mockReturnValue({ date: '2025-10-15' });
//     const filePath = 'session_001_2025-10-15.jsonl';
//     const events = [{ kind: 'session_start', sessionDate: '2025-10-15' }];
//     const result = validateSessionDates(filePath, events);
//     expect(result.error).toBeUndefined();
//   });
// });
