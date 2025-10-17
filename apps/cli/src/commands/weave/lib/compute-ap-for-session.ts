import { tierFromLevel } from '@skyreach/core';
import { padSessionNum } from '@skyreach/schemas';

import type { LedgerResultsByCharacter } from '../../../services/ap-ledger.service';
import type { ScribeEvent } from '@skyreach/schemas';
import type { Pillar, Tier } from '@skyreach/schemas';

type ReportAdvancementPoints = {
  combat: { number: 0 | 1; maxTier: Tier };
  exploration: { number: 0 | 1; maxTier: Tier };
  social: { number: 0 | 1; maxTier: Tier };
};

type Work = { hadEligible: boolean; hadAny: boolean; hadOverTier: boolean };

export function computeApForSession(
  events: ScribeEvent[],
  characterLevels: Record<string, number>, // attendees only
  sessionNum: number | string,
): {
  reportAdvancementPoints: ReportAdvancementPoints;
  ledgerResults: LedgerResultsByCharacter;
} {
  const attendees = Object.keys(characterLevels);
  const sessionNumber = parseInt(padSessionNum(sessionNum), 10);

  // Pillar-wise aggregates across *all* events (for the session report)
  const hadAnyByPillar: Record<Pillar, boolean> = {
    combat: false,
    exploration: false,
    social: false,
  };
  const maxSeenTierByPillar: Record<Pillar, Tier> = {
    combat: 1,
    exploration: 1,
    social: 1,
  };

  // Per-character, per-pillar state for eligibility/reasons (for the ledger)
  const initWork = (): Work => ({
    hadEligible: false,
    hadAny: false,
    hadOverTier: false,
  });

  const work: Record<string, Record<Pillar, Work>> = {};
  for (const cid of attendees) {
    work[cid] = {
      combat: initWork(),
      exploration: initWork(),
      social: initWork(),
    };
  }

  // Accumulate
  for (const e of events) {
    // @ts-expect-error -- Eventually it will recognize advancement_point events
    const pillar = e.payload.pillar as Pillar;
    // @ts-expect-error -- Eventually it will recognize advancement_point events
    const maxTier = (e.payload.tier ?? 1) as Tier;

    hadAnyByPillar[pillar] = true;
    if (maxTier > maxSeenTierByPillar[pillar]) {
      maxSeenTierByPillar[pillar] = maxTier;
    }

    for (const cid of attendees) {
      const charTier = tierFromLevel(characterLevels[cid] ?? 1);
      const slot = work[cid][pillar];
      slot.hadAny = true; // this pillar had events (same for all attendees)
      if (charTier <= maxTier) {
        slot.hadEligible = true;
      }
      if (charTier > maxTier) {
        slot.hadOverTier = true;
      }
    }
  }

  // Build ledger outputs
  const ledgerResults: LedgerResultsByCharacter = {};
  for (const cid of attendees) {
    ledgerResults[cid] = {
      combat: { delta: 0, reason: 'normal' },
      exploration: { delta: 0, reason: 'normal' },
      social: { delta: 0, reason: 'normal' },
    };

    (['combat', 'exploration', 'social'] as Pillar[]).forEach((pillar) => {
      const w = work[cid][pillar];
      if (sessionNumber <= 19) {
        const delta: 0 | 1 = w.hadAny ? 1 : 0;
        ledgerResults[cid][pillar] = {
          delta,
          reason: w.hadAny && !w.hadEligible ? 'grandfathered' : 'normal',
        };
      } else {
        const delta: 0 | 1 = w.hadEligible ? 1 : 0;
        ledgerResults[cid][pillar] = {
          delta,
          reason: !w.hadEligible && w.hadAny ? 'cap' : 'normal',
        };
      }
    });
  }

  // Build session report advancementPoints (not per character)
  const reportAdvancementPoints: ReportAdvancementPoints = {
    combat: { number: 0, maxTier: maxSeenTierByPillar.combat },
    exploration: { number: 0, maxTier: maxSeenTierByPillar.exploration },
    social: { number: 0, maxTier: maxSeenTierByPillar.social },
  };

  if (sessionNumber <= 19) {
    reportAdvancementPoints.combat.number = hadAnyByPillar.combat ? 1 : 0;
    reportAdvancementPoints.exploration.number = hadAnyByPillar.exploration
      ? 1
      : 0;
    reportAdvancementPoints.social.number = hadAnyByPillar.social ? 1 : 0;
  } else {
    // number = 1 iff *any* attendee earned AP in that pillar
    (['combat', 'exploration', 'social'] as Pillar[]).forEach((pillar) => {
      const anyAwarded = attendees.some(
        (cid) => ledgerResults[cid][pillar].delta === 1,
      );
      (reportAdvancementPoints as any)[pillar].number = anyAwarded ? 1 : 0;
    });
  }

  return { reportAdvancementPoints, ledgerResults };
}
