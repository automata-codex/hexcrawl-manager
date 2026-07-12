import { describe, it, expect } from 'vitest';

import {
  IntelligenceReportRowSchema,
  IntelligenceReportsSchema,
  LinkTypeEnum,
  SituationalReportRowSchema,
} from './roleplay-book.js';

describe('LinkTypeEnum', () => {
  it('accepts valid link types', () => {
    const validTypes = [
      'clue',
      'dungeon',
      'encounter',
      'faction',
      'hex',
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

describe('SituationalReportRowSchema', () => {
  describe('basic validation', () => {
    it('validates a situational report with all fields populated', () => {
      const report = {
        report: 'The Ghostfoot Question',
        linkType: 'region',
        linkId: 'r41',
        sampleDialogue: 'Tell me — have you seen any of the Ghostfoot?',
        relevantConditions: 'Regions 41 and 43, when party encounters elders',
      };
      expect(SituationalReportRowSchema.safeParse(report).success).toBe(true);
    });

    it('validates a situational report without link fields', () => {
      const report = {
        report: 'Heirloom of the Vanishing',
        sampleDialogue: 'My grandmother carried this for fifty years.',
        relevantConditions: 'Region 18, when elder trust earned',
      };
      expect(SituationalReportRowSchema.safeParse(report).success).toBe(true);
    });
  });

  describe('validation constraints', () => {
    it('rejects when linkType present but linkId absent', () => {
      const report = {
        report: 'Test Report',
        linkType: 'encounter',
        sampleDialogue: 'Test dialogue',
        relevantConditions: 'Test conditions',
      };
      expect(SituationalReportRowSchema.safeParse(report).success).toBe(false);
    });

    it('rejects when linkId present but linkType absent', () => {
      const report = {
        report: 'Test Report',
        linkId: 'some-encounter',
        sampleDialogue: 'Test dialogue',
        relevantConditions: 'Test conditions',
      };
      expect(SituationalReportRowSchema.safeParse(report).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const report = {
        report: 'Test Report',
        // missing sampleDialogue and relevantConditions
      };
      expect(SituationalReportRowSchema.safeParse(report).success).toBe(false);
    });

    it('strips unknown keys (e.g. roll) per Zod default', () => {
      const report = {
        roll: 5,
        report: 'Test Report',
        sampleDialogue: 'Test dialogue',
        relevantConditions: 'Test conditions',
      };
      const result = SituationalReportRowSchema.safeParse(report);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('roll');
      }
    });
  });
});

describe('IntelligenceReportsSchema', () => {
  const validRow = {
    roll: 1,
    report: 'Patrol Three Days Overdue',
    sampleDialogue: "Patrol Seven hasn't reported back.",
    relevantConditions: 'Fort Dagaric patrol missing',
  };
  const validSituational = {
    report: 'The Ghostfoot Question',
    sampleDialogue: 'Tell me — have you seen any of the Ghostfoot?',
    relevantConditions: 'Regions 41 and 43',
  };

  it('validates with rows only (situational omitted)', () => {
    const reports = { rows: [validRow] };
    expect(IntelligenceReportsSchema.safeParse(reports).success).toBe(true);
  });

  it('validates with both rows and situational', () => {
    const reports = {
      rows: [validRow],
      situational: [validSituational],
    };
    expect(IntelligenceReportsSchema.safeParse(reports).success).toBe(true);
  });

  it('validates with an empty situational array', () => {
    const reports = { rows: [validRow], situational: [] };
    expect(IntelligenceReportsSchema.safeParse(reports).success).toBe(true);
  });

  it('validates with instructions, rows, and situational', () => {
    const reports = {
      instructions: 'Roll d12 or pick by condition',
      rows: [validRow],
      situational: [validSituational],
    };
    expect(IntelligenceReportsSchema.safeParse(reports).success).toBe(true);
  });

  it('rejects when rows is missing', () => {
    const reports = { situational: [validSituational] };
    expect(IntelligenceReportsSchema.safeParse(reports).success).toBe(false);
  });

  it('rejects a situational row that violates the link refinement', () => {
    const reports = {
      rows: [validRow],
      situational: [{ ...validSituational, linkType: 'region' }],
    };
    expect(IntelligenceReportsSchema.safeParse(reports).success).toBe(false);
  });
});
