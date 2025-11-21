import { describe, it, expect } from 'vitest';

import {
  ClueHiddenSiteSchema,
  FactionLeadHiddenSiteSchema,
  HiddenSiteSchema,
  HiddenSitesSchema,
  PreplacedHiddenSiteSchema,
} from './hex';

describe('HiddenSiteSchema', () => {
  describe('PreplacedHiddenSiteSchema', () => {
    it('validates a basic preplaced site', () => {
      const site = {
        description: 'An ancient shrine hidden in the forest',
      };
      expect(PreplacedHiddenSiteSchema.safeParse(site).success).toBe(true);
    });

    it('validates a preplaced site with treasure and unlocks', () => {
      const site = {
        description: 'A hidden cache of supplies',
        treasure: [{ name: '50 gold pieces', type: 'currency', value: 50 }],
        unlocks: ['knowledge-node-1', 'knowledge-node-2'],
      };
      expect(PreplacedHiddenSiteSchema.safeParse(site).success).toBe(true);
    });

    it('rejects a preplaced site without description', () => {
      const site = {
        treasure: [{ description: 'Some gold' }],
      };
      expect(PreplacedHiddenSiteSchema.safeParse(site).success).toBe(false);
    });
  });

  describe('FactionLeadHiddenSiteSchema', () => {
    it('validates a complete faction-lead site', () => {
      const site = {
        source: 'faction-lead',
        description: 'Kobold excavation site reported by fort scouts',
        sessionAdded: 'session-20',
        faction: 'Fort Dagaric',
        leadName: 'Kobold Excavation Observed',
        linkType: 'dungeon',
        linkId: 'v22-wyrmspire-ruin',
      };
      expect(FactionLeadHiddenSiteSchema.safeParse(site).success).toBe(true);
    });

    it('validates a faction-lead site without link fields', () => {
      const site = {
        source: 'faction-lead',
        description: 'Missing patrol last known location',
        sessionAdded: 'session-15',
        faction: 'Fort Dagaric',
        leadName: 'Patrol Three Days Overdue',
      };
      expect(FactionLeadHiddenSiteSchema.safeParse(site).success).toBe(true);
    });

    it('rejects when linkType present but linkId absent', () => {
      const site = {
        source: 'faction-lead',
        description: 'Test site',
        sessionAdded: 'session-1',
        faction: 'Test Faction',
        leadName: 'Test Lead',
        linkType: 'encounter',
      };
      expect(FactionLeadHiddenSiteSchema.safeParse(site).success).toBe(false);
    });

    it('rejects when linkId present but linkType absent', () => {
      const site = {
        source: 'faction-lead',
        description: 'Test site',
        sessionAdded: 'session-1',
        faction: 'Test Faction',
        leadName: 'Test Lead',
        linkId: 'some-encounter',
      };
      expect(FactionLeadHiddenSiteSchema.safeParse(site).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const site = {
        source: 'faction-lead',
        description: 'Test site',
        // missing sessionAdded, faction, leadName
      };
      expect(FactionLeadHiddenSiteSchema.safeParse(site).success).toBe(false);
    });
  });

  describe('ClueHiddenSiteSchema', () => {
    it('validates a complete clue-based site', () => {
      const site = {
        source: 'clue',
        description: 'Location revealed by ancient map fragment',
        sessionAdded: 'session-22',
        clueId: 'dragon-empire-ruins',
        discoveredBy: 'Alistar',
        linkType: 'dungeon',
        linkId: 'forgotten-temple',
      };
      expect(ClueHiddenSiteSchema.safeParse(site).success).toBe(true);
    });

    it('validates a clue site without optional fields', () => {
      const site = {
        source: 'clue',
        description: 'Hidden entrance discovered',
        sessionAdded: 'session-18',
        clueId: 'blackthorns-network',
      };
      expect(ClueHiddenSiteSchema.safeParse(site).success).toBe(true);
    });

    it('rejects when linkType present but linkId absent', () => {
      const site = {
        source: 'clue',
        description: 'Test site',
        sessionAdded: 'session-1',
        clueId: 'test-clue',
        linkType: 'encounter',
      };
      expect(ClueHiddenSiteSchema.safeParse(site).success).toBe(false);
    });

    it('rejects missing clueId', () => {
      const site = {
        source: 'clue',
        description: 'Test site',
        sessionAdded: 'session-1',
      };
      expect(ClueHiddenSiteSchema.safeParse(site).success).toBe(false);
    });
  });

  describe('HiddenSiteSchema (union)', () => {
    it('correctly parses faction-lead sites', () => {
      const site = {
        source: 'faction-lead',
        description: 'Test',
        sessionAdded: 'session-1',
        faction: 'Test',
        leadName: 'Test',
      };
      const result = HiddenSiteSchema.safeParse(site);
      expect(result.success).toBe(true);
    });

    it('correctly parses clue sites', () => {
      const site = {
        source: 'clue',
        description: 'Test',
        sessionAdded: 'session-1',
        clueId: 'test-clue',
      };
      const result = HiddenSiteSchema.safeParse(site);
      expect(result.success).toBe(true);
    });

    it('correctly parses preplaced sites (no source)', () => {
      const site = {
        description: 'An old ruin',
      };
      const result = HiddenSiteSchema.safeParse(site);
      expect(result.success).toBe(true);
    });
  });

  describe('HiddenSitesSchema (array formats)', () => {
    it('validates legacy string array format', () => {
      const sites = ['Ancient shrine', 'Hidden cave entrance', 'Abandoned camp'];
      expect(HiddenSitesSchema.safeParse(sites).success).toBe(true);
    });

    it('validates new object array format with mixed types', () => {
      const sites = [
        { description: 'Preplaced site' },
        {
          source: 'faction-lead',
          description: 'Faction reported site',
          sessionAdded: 'session-10',
          faction: 'Fort Dagaric',
          leadName: 'Scout Report',
        },
        {
          source: 'clue',
          description: 'Clue-discovered site',
          sessionAdded: 'session-12',
          clueId: 'old-map',
        },
      ];
      expect(HiddenSitesSchema.safeParse(sites).success).toBe(true);
    });

    it('validates empty array', () => {
      expect(HiddenSitesSchema.safeParse([]).success).toBe(true);
    });

    it('rejects mixed string and object array', () => {
      const sites = ['A string site', { description: 'An object site' }];
      // This should fail because it's neither all strings nor all objects
      expect(HiddenSitesSchema.safeParse(sites).success).toBe(false);
    });
  });
});
