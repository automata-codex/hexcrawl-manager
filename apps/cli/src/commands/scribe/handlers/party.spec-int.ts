import { REPO_PATHS } from '@skyreach/data';
import { runScribe, withTempRepo, saveCharacter } from '@skyreach/test-helpers';
import fs from 'fs';
import { describe, it, expect } from 'vitest';

describe('Guest PC Support', () => {
  it('adds guest PC via flags (non-interactive mode)', async () => {
    await withTempRepo(
      'party-guest-flags',
      { initGit: false },
      async (repo) => {
        // Run commands including guest PC with flags
        const { stdout, exitCode } = await runScribe([
          'start H7',
          'day start 20 umb 1511',
          'party guest --player-name John --character-name Korgath',
        ], { repo });

        expect(exitCode).toBe(0);

        // Verify the guest PC was added successfully
        const sessionPath = fs.readdirSync(REPO_PATHS.SESSIONS()).find((f) => f.endsWith('.jsonl'));
        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const content = fs.readFileSync(fullPath, 'utf8');
        const events = content.split('\n').filter(Boolean).map((line) => JSON.parse(line));

        // Find party_set event with guest PC
        const partyEvent = events.find((e) => e.kind === 'party_set');

        expect(partyEvent).toBeDefined();
        expect(partyEvent.payload.ids).toContainEqual({
          playerName: 'John',
          characterName: 'Korgath',
        });
      },
    );
  });

  it('validates party_set events with mixed regular and guest PCs', async () => {
    await withTempRepo(
      'party-guest-schema-validation',
      { initGit: false },
      async (repo) => {
        // Create character fixtures
        saveCharacter('alistar');
        saveCharacter('daemaris');

        const { stdout, exitCode } = await runScribe([
          'start H7',
          'day start 20 umb 1511',
          'party add alistar',
          'party guest --player-name John --character-name Korgath',
          'party add daemaris',
          'party guest --player-name Jane --character-name Saurana',
        ], { repo });

        expect(exitCode).toBe(0);

        // Verify the final party_set event has all members (regular and guest)
        const sessionPath = fs.readdirSync(REPO_PATHS.SESSIONS()).find((f) => f.endsWith('.jsonl'));
        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const content = fs.readFileSync(fullPath, 'utf8');
        const events = content.split('\n').filter(Boolean).map((line) => JSON.parse(line));

        // Find all party_set events
        const partyEvents = events.filter((e) => e.kind === 'party_set');
        const finalPartyEvent = partyEvents[partyEvents.length - 1];

        expect(finalPartyEvent).toBeDefined();
        expect(finalPartyEvent.payload.ids).toEqual([
          'alistar',
          { playerName: 'John', characterName: 'Korgath' },
          'daemaris',
          { playerName: 'Jane', characterName: 'Saurana' },
        ]);
      },
    );
  });

  it('serializes guest PCs to string format in AP events', async () => {
    await withTempRepo(
      'party-guest-ap-serialization',
      { initGit: false },
      async (repo) => {
        // Create character fixture
        saveCharacter('alistar');

        const { stdout, exitCode } = await runScribe([
          'start H7',
          'day start 20 umb 1511',
          'party add alistar',
          'party guest --player-name John --character-name Korgath',
          'ap combat 1 "Defeated goblins"',
        ], { repo });

        expect(exitCode).toBe(0);

        // Verify both party_set and AP events
        const sessionPath = fs.readdirSync(REPO_PATHS.SESSIONS()).find((f) => f.endsWith('.jsonl'));
        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const content = fs.readFileSync(fullPath, 'utf8');
        const events = content.split('\n').filter(Boolean).map((line) => JSON.parse(line));

        // Find the party_set event with mixed regular and guest PCs
        const partyEvents = events.filter((e) => e.kind === 'party_set');
        const finalPartyEvent = partyEvents[partyEvents.length - 1];

        expect(finalPartyEvent).toBeDefined();
        expect(finalPartyEvent.payload.ids).toEqual([
          'alistar',
          { playerName: 'John', characterName: 'Korgath' },
        ]);

        // Find the AP event and verify guest PC is serialized to string format
        const apEvent = events.find((e) => e.kind === 'advancement_point');

        expect(apEvent).toBeDefined();
        expect(apEvent.payload.at.party).toEqual(['alistar', 'John:Korgath']);
      },
    );
  });
});
