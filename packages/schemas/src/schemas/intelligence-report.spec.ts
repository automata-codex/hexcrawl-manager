import { describe, it, expect } from 'vitest';

import { IntelligenceReportRowSchema, LinkTypeEnum } from './roleplay-book';

describe('LinkTypeEnum', () => {
  it('accepts valid link types', () => {
    const validTypes = [
      'clue',
      'dungeon',
      'encounter',
      'faction',
      'hex',
      'knowledge-node',
      'region',
    ];

    for (const type of validTypes) {
      expect(LinkTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it('rejects invalid link types', () => {
    expect(LinkTypeEnum.safeParse('invalid').success).toBe(false);
    expect(LinkTypeEnum.safeParse('article').success).toBe(false);
    expect(LinkTypeEnum.safeParse('').success).toBe(false);
  });
});

describe('IntelligenceReportRowSchema', () => {
  describe('basic validation', () => {
    it('validates a report without any link fields', () => {
      const report = {
        roll: 5,
        report: 'Sabotaged Supply Cache',
        sampleDialogue: 'Found one of our emergency supply caches ransacked.',
        relevantConditions: 'Three Dukes agents sabotaging supply lines',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(true);
    });

    it('validates a report with link fields', () => {
      const report = {
        roll: 1,
        report: 'Patrol Three Days Overdue',
        linkType: 'encounter',
        linkId: 'missing-patrol',
        sampleDialogue: 'Patrol Seven hasn\'t reported back.',
        relevantConditions: 'Fort Dagaric patrol missing',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(true);
    });

    it('validates a report linking to a dungeon', () => {
      const report = {
        roll: 4,
        report: 'Kobold Excavation Observed',
        linkType: 'dungeon',
        linkId: 'v22-wyrmspire-ruin',
        sampleDialogue: 'Scouts report heavy kobold activity.',
        relevantConditions: 'Kobolds excavating at ruins',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(true);
    });

    it('validates a report linking to a clue', () => {
      const report = {
        roll: 12,
        report: 'Wagon Driver Report',
        linkType: 'clue',
        linkId: 'veil-shepherds-herald',
        sampleDialogue: 'One of the wagon drivers came in spooked.',
        relevantConditions: 'Veil Shepherd herald encountered',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(true);
    });
  });

  describe('validation constraints', () => {
    it('rejects when linkType present but linkId absent', () => {
      const report = {
        roll: 1,
        report: 'Test Report',
        linkType: 'encounter',
        sampleDialogue: 'Test dialogue',
        relevantConditions: 'Test conditions',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(false);
    });

    it('rejects when linkId present but linkType absent', () => {
      const report = {
        roll: 1,
        report: 'Test Report',
        linkId: 'some-encounter',
        sampleDialogue: 'Test dialogue',
        relevantConditions: 'Test conditions',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(false);
    });

    it('rejects invalid linkType', () => {
      const report = {
        roll: 1,
        report: 'Test Report',
        linkType: 'invalid-type',
        linkId: 'some-id',
        sampleDialogue: 'Test dialogue',
        relevantConditions: 'Test conditions',
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const report = {
        roll: 1,
        report: 'Test Report',
        // missing sampleDialogue and relevantConditions
      };
      expect(IntelligenceReportRowSchema.safeParse(report).success).toBe(false);
    });
  });

});
