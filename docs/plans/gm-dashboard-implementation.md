# GM Dashboard Implementation Plan

**Spec:** `docs/specs/gm-dashboard.md`
**Created:** 2025-12-10

## Overview

Implement a GM dashboard on the homepage for authenticated users with the `gm` role. The dashboard surfaces post-session todo items, upcoming session agendas, and provides a persistent nag indicator in the navbar when incomplete todos exist.

## Key Decisions

1. **Existing todo migration:** All existing session reports have `todo: []` (empty arrays), so no migration script is needed. The schema change is sufficient.
2. **Error response format:** Use `{ error, code }` for API errors.
3. **File write safety:** `writeYamlAtomic` already exists in `@skyreach/data`.

---

## Phase 1: Schema & Data Foundation

**Goal:** Establish the data structures and template file that everything else depends on.

### Changes

1. **Add `TodoItemSchema`** to `packages/schemas/src/schemas/session-report.ts`:
   ```typescript
   const TodoItemSchema = z.object({
     text: z.string(),
     status: z.enum(['pending', 'done']),
     source: z.enum(['template', 'scribe']).optional(),
   });
   ```

2. **Update `CompletedSessionReport.todo`** from `z.array(z.string())` to `z.array(TodoItemSchema)`

3. **Add `TEMPLATES` path** to `packages/data/src/repo-paths.ts`:
   ```typescript
   TEMPLATES: () => getRepoPath('data', 'templates'),
   ```

4. **Create template file** at `data/templates/post-session-checklist.yaml`:
   ```yaml
   items:
     - text: "Process scribe todos"
       source: template
     - text: "Update floating clues (if any were placed)"
       source: template
     - text: "Update plotlines and advance countdown clocks"
       source: template
     - text: "Add agenda items to next session"
       source: template
   ```

5. **Regenerate JSON schemas:** `npm run build:json-schemas`

### Files Modified
- `packages/schemas/src/schemas/session-report.ts`
- `packages/data/src/repo-paths.ts`
- `data/templates/post-session-checklist.yaml` (new)

### Verification
- `npm run typecheck` passes
- `npm run build:json-schemas` completes
- JSON schema in `packages/schemas/json-schemas/` reflects new todo structure

---

## Phase 2: CLI Integration

**Goal:** Update `weave apply ap` to produce the new todo format with template items.

### Changes

1. **Update `apps/cli/src/commands/weave/commands/apply-ap.ts`:**
   - Import template reading utilities
   - Read checklist template from `REPO_PATHS.TEMPLATES()`
   - Convert scribe todos to object format: `{ text, status: 'pending', source: 'scribe' }`
   - Prepend template items: `{ text, status: 'pending', source: 'template' }`
   - Update the `reportOut.todo` to use the new array of objects

2. **Current code (line 164-166):**
   ```typescript
   const todos = (eventsOf(events, 'todo') as TodoEvent[]).map(
     (e) => e.payload.text,
   );
   ```

3. **New code pattern:**
   ```typescript
   // Read template
   const templatePath = path.join(REPO_PATHS.TEMPLATES(), 'post-session-checklist.yaml');
   let templateTodos: TodoItem[] = [];
   if (fs.existsSync(templatePath)) {
     const template = yaml.parse(fs.readFileSync(templatePath, 'utf8'));
     templateTodos = (template.items || []).map((item: { text: string }) => ({
       text: item.text,
       status: 'pending' as const,
       source: 'template' as const,
     }));
   }

   // Convert scribe todos
   const scribeTodos = (eventsOf(events, 'todo') as TodoEvent[]).map((e) => ({
     text: e.payload.text,
     status: 'pending' as const,
     source: 'scribe' as const,
   }));

   const todos = [...templateTodos, ...scribeTodos];
   ```

### Files Modified
- `apps/cli/src/commands/weave/commands/apply-ap.ts`

### Verification
- Run `weave apply ap` on a test session (or use `--dry-run` if available)
- Inspect generated report YAML to confirm todo format is `[{ text, status, source }, ...]`

---

## Phase 3: Read-only Dashboard

**Goal:** Display todos and agenda in a GM-only dashboard component.

### Changes

1. **Create `apps/web/src/components/GmDashboard.svelte`:**
   - Aggregate incomplete todos across all session reports
   - Display next session agenda (from planned sessions)
   - Group by session with collapsible sections
   - Read-only initially (no toggle functionality yet)

2. **Create data loading utility** `apps/web/src/utils/load-todos.ts`:
   ```typescript
   interface TodoItem {
     sessionId: string;
     text: string;
     status: 'pending' | 'done';
     source?: 'template' | 'scribe';
     index: number;
   }
   ```

3. **Update `apps/web/src/pages/index.astro`:**
   - Import `getCurrentUserRole` from auth utils
   - Check if user has `gm` role
   - Conditionally render `GmDashboard` or existing public content
   - Optionally extract public content to `PublicHomepage.astro`

### Files Modified/Created
- `apps/web/src/components/GmDashboard.svelte` (new)
- `apps/web/src/utils/load-todos.ts` (new)
- `apps/web/src/pages/index.astro`
- `apps/web/src/components/PublicHomepage.astro` (new, optional)

### Verification
- Log in as GM role, see dashboard with todos and agenda
- Log out or use non-GM account, see public homepage
- Verify todos are grouped by session and show correct status

---

## Phase 4: API Endpoints

**Goal:** Create the backend for todo count and status updates.

### Changes

1. **Create `apps/web/src/pages/api/todo/count.ts`** (GET):
   ```typescript
   // Returns { incomplete: number, total: number }
   // Requires gm role, returns 403 otherwise
   ```

2. **Create `apps/web/src/pages/api/todo/update.ts`** (POST):
   ```typescript
   // Request: { sessionId, todoIndex, status }
   // Action: Update session report YAML, set updatedAt
   // Response: { success: true, incomplete, total }
   // Requires gm role, returns 403 otherwise
   ```

3. **Error response format:**
   ```json
   { "error": "Session not found", "code": "SESSION_NOT_FOUND" }
   ```

### Files Created
- `apps/web/src/pages/api/todo/count.ts`
- `apps/web/src/pages/api/todo/update.ts`

### Verification
- Test GET `/api/todo/count` returns correct counts
- Test POST `/api/todo/update` updates YAML file correctly
- Verify auth: non-GM users get 403 response
- Verify `updatedAt` timestamp is updated on mutation

---

## Phase 5: Interactive Dashboard & Navbar Nag

**Goal:** Wire up interactivity and add the persistent nag indicator.

### Changes

1. **Update `apps/web/src/components/GmDashboard.svelte`:**
   - Add click handlers to todo items
   - Call `/api/todo/update` on toggle
   - Update local state optimistically
   - Dispatch event to refresh navbar count

2. **Create `apps/web/src/components/NavbarNagIcon.svelte`:**
   - Fetch count from `/api/todo/count` on mount
   - Display badge with incomplete count (or dot if > 0)
   - Link to homepage/dashboard section
   - Listen for refresh events from dashboard

3. **Update `apps/web/src/components/TopBar.astro`:**
   - Add `NavbarNagIcon` in `navbar-end` section
   - Only render for signed-in users (Svelte component handles GM check)

### Files Modified/Created
- `apps/web/src/components/GmDashboard.svelte` (update)
- `apps/web/src/components/NavbarNagIcon.svelte` (new)
- `apps/web/src/components/TopBar.astro` (update)

### Verification
- Toggle todo in dashboard, see status change
- Verify navbar badge updates after toggle
- Navigate between pages, badge persists
- Non-GM users don't see the nag icon

---

## Phase 6: Polish

**Goal:** Add filtering, visual refinements, and handle edge cases.

### Changes

1. **Filtering:**
   - Session filter dropdown or chips in dashboard
   - Toggle to show/hide completed todos

2. **Visual distinction:**
   - Style template-sourced items differently (icon or subtle background)
   - Clear visual for pending vs done status

3. **Error handling:**
   - Loading states for API calls
   - Error toast/message on failed updates
   - Graceful handling of malformed todo data (backward compatibility)

4. **Edge cases:**
   - Handle sessions with no todos gracefully
   - Handle empty agenda in next session
   - Handle case where no planned sessions exist

### Files Modified
- `apps/web/src/components/GmDashboard.svelte`
- Associated styles

### Verification
- Full end-to-end testing of all features
- Test with various data states (empty todos, many todos, no planned sessions)
- Verify responsive design on different screen sizes

---

## Reference: Key Files

| File | Purpose |
|------|---------|
| `packages/schemas/src/schemas/session-report.ts` | Todo schema definition |
| `packages/data/src/repo-paths.ts` | TEMPLATES path |
| `apps/cli/src/commands/weave/commands/apply-ap.ts` | CLI todo generation |
| `apps/web/src/components/GmDashboard.svelte` | Main dashboard UI |
| `apps/web/src/components/NavbarNagIcon.svelte` | Navbar badge |
| `apps/web/src/components/TopBar.astro` | Navbar container |
| `apps/web/src/pages/index.astro` | Homepage routing |
| `apps/web/src/pages/api/todo/count.ts` | Count API |
| `apps/web/src/pages/api/todo/update.ts` | Update API |
| `apps/web/src/utils/auth.ts` | Role checking |
| `data/templates/post-session-checklist.yaml` | Template items |
