import type { Event } from '../../scribe/types.ts';

type Pillar = "combat" | "exploration" | "social";
type LedgerReason = "normal" | "grandfathered" | "cap";

type LedgerPerPillar = { delta: 0 | 1; reason: LedgerReason };
type LedgerResults = Record<string, Record<Pillar, LedgerPerPillar>>;

type ReportAdvancementPoints = {
  combat: { number: 0 | 1; maxTier: 1 | 2 | 3 | 4 };
  exploration: { number: 0 | 1; maxTier: 1 | 2 | 3 | 4 };
  social: { number: 0 | 1; maxTier: 1 | 2 | 3 | 4 };
};

function tierFromLevel(level: number): 1 | 2 | 3 | 4 {
  if (level >= 17) return 4;
  if (level >= 11) return 3;
  if (level >= 5) return 2;
  return 1;
}

export function computeApForSession(
  events: Event[],
  characterLevels: Record<string, number>, // attendees only
  sessionNum: number
): {
  reportAdvancementPoints: ReportAdvancementPoints;
  ledgerResults: LedgerResults;
} {
  const attendees = Object.keys(characterLevels);

  // Pillar-wise aggregates across *all* events (for the session report)
  const hadAnyByPillar: Record<Pillar, boolean> = {
    combat: false,
    exploration: false,
    social: false,
  };
  const maxSeenTierByPillar: Record<Pillar, 1 | 2 | 3 | 4> = {
    combat: 1,
    exploration: 1,
    social: 1,
  };

  // Per-character, per-pillar state for eligibility/reasons (for the ledger)
  type Work = { hadEligible: boolean; hadAny: boolean; hadOverTier: boolean };
  const initWork = (): Work => ({ hadEligible: false, hadAny: false, hadOverTier: false });

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
    const pillar = e.payload.pillar as Pillar;
    const maxTier = (e.payload.tier ?? 1) as 1 | 2 | 3 | 4;

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
  const ledgerResults: LedgerResults = {};
  for (const cid of attendees) {
    ledgerResults[cid] = { combat: { delta: 0, reason: "normal" }, exploration: { delta: 0, reason: "normal" }, social: { delta: 0, reason: "normal" } };

    (["combat", "exploration", "social"] as Pillar[]).forEach((pillar) => {
      const w = work[cid][pillar];
      if (sessionNum <= 19) {
        const delta: 0 | 1 = w.hadAny ? 1 : 0;
        ledgerResults[cid][pillar] = {
          delta,
          reason: w.hadAny && !w.hadEligible ? "grandfathered" : "normal",
        };
      } else {
        const delta: 0 | 1 = w.hadEligible ? 1 : 0;
        ledgerResults[cid][pillar] = {
          delta,
          reason: !w.hadEligible && w.hadAny ? "cap" : "normal",
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

  if (sessionNum <= 19) {
    reportAdvancementPoints.combat.number = hadAnyByPillar.combat ? 1 : 0;
    reportAdvancementPoints.exploration.number = hadAnyByPillar.exploration ? 1 : 0;
    reportAdvancementPoints.social.number = hadAnyByPillar.social ? 1 : 0;
  } else {
    // number = 1 iff *any* attendee earned AP in that pillar
    (["combat", "exploration", "social"] as Pillar[]).forEach((pillar) => {
      const anyAwarded = attendees.some((cid) => ledgerResults[cid][pillar].delta === 1);
      (reportAdvancementPoints as any)[pillar].number = anyAwarded ? 1 : 0;
    });
  }

  return { reportAdvancementPoints, ledgerResults };
}
