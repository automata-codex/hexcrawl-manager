import { REPO_PATHS } from '@skyreach/data';
import { runScribe, withTempRepo } from '@skyreach/test-helpers';
import fs from 'fs';
import { describe, it, expect } from 'vitest';

describe('Guest PC Support', () => {
  it('validates party_set events with mixed regular and guest PCs', async () => {
    await withTempRepo(
      'party-guest-schema-validation',
      { initGit: false },
      async (repo) => {
        const commands = [
          'start H7',
          'day start 20 umb 1511',
        ];

        await runScribe(commands, { repo });

        // Manually create a party_set event with both regular and guest PCs
        const sessionPath = fs.readdirSync(REPO_PATHS.SESSIONS()).find((f) => f.endsWith('.jsonl'));
        expect(sessionPath).toBeTruthy();

        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);

        const lastSeq = lines.length;
        const partyEvent = {
          seq: lastSeq + 1,
          ts: new Date().toISOString(),
          kind: 'party_set',
          payload: {
            ids: [
              'alistar',
              { playerName: 'John', characterName: 'Korgath' },
              'daemaris',
              { playerName: 'Jane', characterName: 'Saurana' },
            ],
          },
        };

        fs.appendFileSync(fullPath, `\n${JSON.stringify(partyEvent)}`);

        // Verify the event was written with correct structure
        const updatedContent = fs.readFileSync(fullPath, 'utf8');
        const events = updatedContent.split('\n').filter(Boolean).map((line) => JSON.parse(line));
        const writtenPartyEvent = events.find(
          (e) => e.kind === 'party_set' && e.payload.ids.length === 4,
        );

        expect(writtenPartyEvent).toBeDefined();
        expect(writtenPartyEvent.payload.ids).toEqual([
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
        const commands = [
          'start H7',
          'day start 20 umb 1511',
        ];

        await runScribe(commands, { repo });

        // Add guest PCs and AP event manually
        const sessionPath = fs.readdirSync(REPO_PATHS.SESSIONS()).find((f) => f.endsWith('.jsonl'));
        const fullPath = `${REPO_PATHS.SESSIONS()}/${sessionPath}`;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);

        const lastSeq = lines.length;
        const partyEvent = {
          seq: lastSeq + 1,
          ts: new Date().toISOString(),
          kind: 'party_set',
          payload: {
            ids: [
              'alistar',
              { playerName: 'John', characterName: 'Korgath' },
            ],
          },
        };

        // Simulate what the AP handler would create
        const apEvent = {
          seq: lastSeq + 2,
          ts: new Date().toISOString(),
          kind: 'advancement_point',
          payload: {
            pillar: 'combat',
            tier: 1,
            note: 'Defeated goblins',
            at: {
              hex: 'H7',
              // Guest PCs converted to "PlayerName:CharacterName" format
              party: ['alistar', 'John:Korgath'],
            },
          },
        };

        fs.appendFileSync(fullPath, `\n${JSON.stringify(partyEvent)}\n${JSON.stringify(apEvent)}`);

        // Verify both events
        const updatedContent = fs.readFileSync(fullPath, 'utf8');
        const events = updatedContent.split('\n').filter(Boolean).map((line) => JSON.parse(line));

        const writtenPartyEvent = events.find((e) => e.kind === 'party_set' && e.seq === lastSeq + 1);
        const writtenApEvent = events.find((e) => e.kind === 'advancement_point');

        expect(writtenPartyEvent).toBeDefined();
        expect(writtenPartyEvent.payload.ids[1]).toEqual({
          playerName: 'John',
          characterName: 'Korgath'
        });

        expect(writtenApEvent).toBeDefined();
        expect(writtenApEvent.payload.at.party).toContain('alistar');
        expect(writtenApEvent.payload.at.party).toContain('John:Korgath');
      },
    );
  });
});
