/**
 * Per-session ceiling on a character's total session AP used by the milestone
 * top-up mechanic (`docs/specs/milestone-ap-reconciliation.md`).
 *
 * The AP a character earns from a milestone is the per-(character, session)
 * top-up `max(0, MILESTONE_AP_CAP - sessionTotal)`, where `sessionTotal` is the
 * character's pillar AP from their `session_ap` ledger entry for the session.
 *
 * Canonical home for the constant: `allocate-ap-milestone.ts` re-exports this so
 * a `lib/core` module never has to import from a command file (wrong dependency
 * direction — see `npm run arch:check`).
 */
export const MILESTONE_AP_CAP = 3;
