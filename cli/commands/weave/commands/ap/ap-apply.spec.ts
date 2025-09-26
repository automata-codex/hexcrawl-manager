import { describe, it, expect } from 'vitest';

import { withTempRepo, runWeave } from '../../../shared-lib';

describe('Command `weave ap apply`', () => {
  describe('CLI invocation', () => {
    it('applies AP for a specific session in explicit mode', async () => {
      await withTempRepo(
        'ap-apply-explicit',
        { initGit: false },
        async (repo) => {
          // Simulate finalized scribe logs for session-0001
          // (You would create the necessary files here, e.g. session_0001_2025-09-25.jsonl)
          // For now, this is a placeholder for setup logic

          // Run weave ap apply explicitly for session-0001
          const { exitCode, stderr } = await runWeave(
            ['ap', 'apply', 'session-0001'],
            { repo },
          );

          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();

          // TODO: Assert that the session report and ledger entries were created as expected
        },
      );
    });

    it.todo('auto-selects the next pending session in Option R mode');
    it.todo(
      'fails with a clear message if no pending sessions are found in "Option R" mode',
    );
  });

  describe('Session resolution', () => {
    it.todo('finds completed session reports and finalized logs');
    it.todo('validates that explicit session has finalized logs, else fails');
  });

  describe('Scribe part discovery', () => {
    it.todo('globs and sorts all scribe log parts for the chosen session');
    it.todo('computes fingerprint from sorted scribe log basenames');
  });

  describe('Preflight guards', () => {
    it.todo('no-ops if a completed report exists with matching fingerprint');
    it.todo('fails if a completed report exists with mismatched fingerprint');
    it.todo('fails if planned report exists and git status is dirty');
    it.todo(
      'fails if character IDs in logs do not resolve to known character files',
    );
  });

  describe('Parsing logs and deriving session data', () => {
    it.todo('parses all JSONL log parts in sorted order');
    it.todo('derives attendance.characterIds from participation events');
    it.todo('collects guests from non-character participants');
    it.todo('collects AP events per character and pillar');
    it.todo('extracts in-world gameStartDate and gameEndDate if present');
  });

  describe('Idempotency', () => {
    it.todo('is idempotent: repeat runs with same fingerprint make no changes');
  });

  describe('Error handling', () => {
    it.todo(
      'fails with clear message if no finalized logs are found for explicit session',
    );
    it.todo('fails with specific IDs/paths for unknown character IDs');
    it.todo('prints guidance for immutable mismatch errors');
  });
});
