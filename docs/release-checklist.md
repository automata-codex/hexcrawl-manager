# Weekly Release Checklist

Use this when preparing a release during active development. Adjust frequency based on development pace—weekly is good when actively building, less frequent is fine during maintenance mode.

The beauty of this checklist is that you can pick and choose. If a week is light, skip sections. If you're doing a major release, go through everything.

## Pre-Release

### Code Quality
- [ ] Run full test suite: `npm test`
- [ ] Run architecture checks: `npm run arch:check`
- [ ] Check TypeScript: `npm run check`
- [ ] Lint and format: `npm run lint:fix && npm run format:fix`
- [ ] Review and fix any deprecation warnings

### Documentation Sync
- [ ] **Review `docs/rules-drift.md`** — Address items or move to next week with notes
- [ ] Check if any new CLI commands need docs
- [ ] Verify README.md examples still work
- [ ] Update CHANGELOG.md with noteworthy changes

### Data Integrity
- [ ] Run `npm run cli -- weave doctor` to check for any data inconsistencies
- [ ] Verify any recent session logs processed correctly

## Release

### Build & Test
- [ ] Clean build: `npm run rebuild`
- [ ] Run integration tests: `npm run test:scribe:int && npm run test:weave:int`
- [ ] Test CLI in real usage: run a session workflow end-to-end
- [ ] Build web: `npm run build:web`
- [ ] Smoke test web locally: `npm run preview`

### Release Process
- [ ] Follow the steps in README.md under "Release Process"

## Post-Release

### Communication
- [ ] Notify players of changes (if user-facing)
- [ ] Share release notes with co-GMs/players if relevant

### Cleanup & Planning
- [ ] Archive or close completed issues/tickets
- [ ] Review `docs/rules-drift.md` again—did release clear anything?
- [ ] Identify 1-3 priorities for next week
- [ ] Update project board or roadmap
- [ ] Prune old branches
  - Run `git branch -vv | grep ': gone]' | awk '{print $1}'` to see what will be deleted
  - Run `git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d` to delete them

### Health Check
- [ ] Monitor error logs (if you have any telemetry)
- [ ] Check for any urgent bug reports
- [ ] Ensure backup/export of campaign data is current

---

## Optional Deeper Reviews (Monthly)

Do these once a month or quarterly:

### Technical Debt
- [ ] Review TODOs in code: `git grep -n "TODO\|FIXME\|HACK"`
- [ ] Check dependency updates: `npm outdated`
- [ ] Review test coverage and add tests where thin
- [ ] Refactor any "smelly" code you've been ignoring

### Documentation Audit
- [ ] Read through player-facing rules as if you were a new player — Are they still clear?
- [ ] Verify all CLI commands have help text and examples
- [ ] Update architecture docs if structure changed
- [ ] Review API docs / CATALOG.md for accuracy

### Data & Campaign Health
- [ ] Backup campaign data to external storage
- [ ] Review character progression — Anyone stuck or racing ahead?
- [ ] Check session log quality — Any patterns of missing data?
- [ ] Audit trail/haven data for consistency

### Retrospective
- [ ] What went well this month?
- [ ] What slowed you down?
- [ ] Any tools/processes to add or remove?
- [ ] Update this checklist based on learnings

---

## Maintenance Mode

If development is paused but campaign continues:

**Before Each Session:**
- [ ] Quick test of `scribe` commands
- [ ] Verify data backup is current

**After Each Session:**
- [ ] Process session logs: `scribe finalize` → `weave apply`
- [ ] Update session reports
- [ ] Commit data changes

**Monthly:**
- [ ] Dependency security updates only
- [ ] Review and archive `docs/rules-drift.md`
