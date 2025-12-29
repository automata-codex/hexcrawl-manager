---
"@achm/cli": minor
"@achm/schemas": minor
"@achm/data": patch
"@achm/test-helpers": patch
---

Add milestone AP allocation support and fix flaky integration tests

**Milestone AP Feature:**
- Add `ap milestone "<note>"` command in scribe to create a todo for milestone AP allocation
- Refactor `weave allocate ap` to use subcommands: `absence` (existing) and `milestone` (new)
- Add `milestone_spend` entry type to the AP ledger schema
- Milestone allocations always grant 3 AP total, split across pillars by the user

**Breaking Change:**
- Old syntax `weave allocate ap --character ...` no longer works
- Must use `weave allocate ap absence --character ...` instead

**CLI Commands:**
```bash
# Scribe - during session
ap milestone "Survived the Winter of 1512"

# Weave - allocate absence credits (existing, renamed)
weave allocate ap absence --character alice --amount 2 --combat 1 --exploration 1

# Weave - allocate milestone AP (new)
weave allocate ap milestone --character alice --combat 1 --exploration 1 --social 1 --note "Winter survival"
```

**Test Infrastructure:**
- Fix flaky integration tests by configuring vitest to use forks pool for integration tests
- Add retry mechanism to `runWeave` and `runScribe` test helpers for transient SIGSEGV failures
