import { describe, it } from 'vitest';

// AP Status Command Test Suite (specs: ap-workflow-overview.md, ap-status.md)
describe('weave ap status', () => {
  // Core aggregation and output
  it.todo('aggregates pillar totals per character from the AP ledger');
  it.todo('derives absence credits at runtime for Tier 1 characters not in downtime');
  it.todo('shows earned, spent, and available absence credits');
  it.todo('outputs a human-readable table by default');
  it.todo('outputs structured JSON when --json is passed');
  it.todo('suppresses headers/summary with --quiet (table only)');

  // Filtering and windowing
  it.todo('filters output to specified character(s) with --character');
  it.todo('constrains session window with --since and --until');
  it.todo('defaults to full campaign range if no window is specified');

  // Absence credit rules
  it.todo('does not award credits to Tier 2+ characters');
  it.todo('does not award credits if character is in downtime for a session');
  it.todo('does not award credits to guests');
  it.todo('does not award credits to characters who have never attended and have no intro marker');
  it.todo('begins credit accrual at introducedAt/firstSessionId if present, else first attendance');
  it.todo('handles credits correctly when a character’s level is missing (treat as Tier 1)');

  // Pillar reason handling
  it.todo('includes all reasons in pillar sums (normal, cap, absence_spend, downtime, correction, grandfathered)');
  it.todo('does not reinterpret reasons or re-apply event gates; trusts ledger');

  // Output details
  it.todo('includes notes for missing level or no intro marker');
  it.todo('shows summary line with character count and session window');

  // Error handling
  it.todo('exits non-zero and reports missing or unreadable files');
  it.todo('exits non-zero and reports schema validation errors');
  it.todo('exits non-zero and reports unknown characterId in --character');
  it.todo('exits zero on success');

  // Edge cases
  it.todo('handles sessions with multiple log parts and correct ordering');
  it.todo('handles sessions with duplicate sessionDate');
  it.todo('handles ledger with only absence_spend entries');
  it.todo('handles empty ledger and reports zeroes');
  it.todo('handles sessions with no attendance');
  it.todo('handles sessions with only guests');
  it.todo('handles windowing that excludes all sessions');
});

