# GM Dashboard & Todo System Specification

## Overview

Add a GM dashboard to the homepage for authenticated users with the `gm` role. The dashboard surfaces post-session todo items, upcoming session agendas, and provides a persistent nag indicator in the navbar when incomplete todos exist.

## Components

### 1. Post-Session Checklist Template

**File:** `data/templates/post-session-checklist.yaml`

```yaml
# Items added to every session report's todo list
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

**Note:** Template items don't include `status` — it defaults to `pending` when injected. The `source: template` marker distinguishes them from scribe-originated todos.

### 2. Todo Format in Session Reports

Todos are objects with `text` and `status` fields for extensibility:

```yaml
todo:
  - text: "Process scribe todos"
    status: pending
  - text: "Updated bearfolk clue status"
    status: done
  - text: "Check if revenant clock should advance"
    status: pending
```

**Status values (initial):**
- `pending` — Not started
- `done` — Completed

**Future extensibility:** Can add `in-progress` or other statuses for kanban-style workflows without format changes.

**Optional fields for later:**
```yaml
todo:
  - text: "Process scribe todos"
    status: pending
    source: template  # 'template' | 'scribe' — where the item originated
    createdAt: 2025-12-10T14:30:00Z
```

**Schema (Zod):**
```typescript
const TodoItemSchema = z.object({
  text: z.string(),
  status: z.enum(['pending', 'done']),
  source: z.enum(['template', 'scribe']).optional(),
  createdAt: z.string().datetime().optional(),
});
```

### 3. Update `weave apply ap` Command

**Location:** `apps/cli/src/commands/weave/commands/apply-ap.ts`

**Changes:**

1. Read the checklist template file if it exists
2. Prepend template items to any todos collected from scribe logs
3. Mark template-sourced items with a prefix or keep them distinguishable (optional—could just be convention that template items come first)

```typescript
// Pseudocode for the change
const templatePath = path.join(REPO_PATHS.TEMPLATES(), 'post-session-checklist.yaml');
let templateTodos: string[] = [];
if (fs.existsSync(templatePath)) {
  const template = yaml.parse(fs.readFileSync(templatePath, 'utf8'));
  templateTodos = template.items || [];
}

const allTodos = [...templateTodos, ...todos]; // todos from scribe logs
```

### 4. GM Dashboard Component

**Location:** `apps/web/src/components/GmDashboard.svelte` (or `.astro` if preferred)

**Data sources:**
- All session reports in `data/reports/`
- Planned sessions with agendas

**Sections:**

#### 4a. Incomplete Todos

Aggregate all incomplete todos across all session reports:

```typescript
interface TodoItem {
  sessionId: string;
  text: string;
  status: 'pending' | 'done';
  source?: 'template' | 'scribe';
  index: number; // position in the session's todo array
}

// Query all session reports, extract todos with context
const allTodos: TodoItem[] = sessionReports.flatMap(report =>
  (report.todo || []).map((item, index) => ({
    sessionId: report.id,
    text: item.text,
    status: item.status,
    source: item.source,
    index
  }))
);
```

**UI Features:**
- Filter by session (dropdown or chips)
- Toggle to show/hide completed items (status === 'done')
- Click to toggle status (triggers API call to update session report)
- Visual grouping: template items could be styled differently or shown in a separate section

#### 4b. Next Session Agenda

Find the most recent planned session (or next by date if `sessionDate` is in the future):

```typescript
const plannedSessions = sessionReports
  .filter(r => r.status === 'planned' && r.agenda?.length > 0)
  .sort((a, b) => /* by sessionDate or id */);

const nextSession = plannedSessions[0];
```

Display agenda items as a simple list under a "Next Session" heading.

### 5. Todo Completion API

**Endpoint:** `POST /api/todo/update`

**Request:**
```json
{
  "sessionId": "session-0024",
  "todoIndex": 2,
  "status": "done"
}
```

**Action:**
1. Validate `gm` role via `getCurrentUserRole()`
2. Read the session report YAML
3. Update the todo at the given index with the new status
4. Update the `updatedAt` timestamp to `new Date().toISOString()`
5. Write the file back using `writeYamlAtomic`
6. Return success with updated todo counts

**Response (success):**
```json
{
  "success": true,
  "incomplete": 6,
  "total": 12
}
```

**Response (error):**
```json
{
  "error": "Session not found",
  "code": "SESSION_NOT_FOUND"
}
```

**Auth:** Require `gm` role. Return 403 for unauthorized.

**Note:** Endpoint is named `update` rather than `complete` to reflect that it can set any status value, supporting future kanban workflows.

### 6. Navbar Nag Icon (Live)

**Location:** Add to existing navbar component

**Behavior:**
- Icon (e.g., a checklist or bell icon) always visible when user has `gm` role
- Shows a badge/indicator (dot or count) when any incomplete todos exist
- Clicking the icon navigates to the dashboard (or scrolls to todo section if on homepage)

**Data:** Client-side fetch on page load for live updates during dev.

**API Endpoint:** `GET /api/todo/count`

**Response:**
```json
{
  "incomplete": 7,
  "total": 12
}
```

**Auth:** Require `gm` role. Return 403 for other roles.

**Component logic:**
```svelte
<script>
  import { onMount } from 'svelte';

  let incompleteCount = 0;
  let loading = true;

  onMount(async () => {
    try {
      const res = await fetch('/api/todo/count');
      if (res.ok) {
        const data = await res.json();
        incompleteCount = data.incomplete;
      }
    } finally {
      loading = false;
    }
  });
</script>

{#if !loading && incompleteCount > 0}
  <a href="/#todos" class="relative">
    <ChecklistIcon />
    <span class="badge">{incompleteCount}</span>
  </a>
{/if}
```

**Refresh strategy:**
- Fetch on mount (every page navigation)
- After completing a todo, the dashboard component can dispatch a custom event or call a shared refresh function to update the navbar count without a full page reload

### 7. Homepage Role-Based Content

**Location:** `apps/web/src/pages/index.astro` (or wherever the homepage lives)

**Logic:**
```astro
---
import { getCurrentUserRole } from '../utils/auth';
import GmDashboard from '../components/GmDashboard.svelte';
import PublicHomepage from '../components/PublicHomepage.astro';

const role = getCurrentUserRole(Astro.locals);
const isGm = role === 'gm';
---

{isGm ? (
  <GmDashboard client:load />
) : (
  <PublicHomepage />
)}
```

The existing public homepage content moves into a `<PublicHomepage />` component (or just stays inline in an else block).

## File Changes Summary

| File                                               | Change                                      |
|----------------------------------------------------|---------------------------------------------|
| `data/templates/post-session-checklist.yaml`       | New file                                    |
| `apps/cli/src/commands/weave/commands/apply-ap.ts` | Read template, prepend to todos             |
| `apps/web/src/components/GmDashboard.svelte`       | New component                               |
| `apps/web/src/components/NavbarNagIcon.svelte`     | New component                               |
| `apps/web/src/pages/index.astro`                   | Role-based content switch                   |
| `apps/web/src/pages/api/todo/count.ts`             | New API endpoint (GET, read-only)           |
| `apps/web/src/pages/api/todo/update.ts`            | New API endpoint (POST, mutation)           |
| `packages/schemas/src/session-report.ts`           | Add `TodoItemSchema` if not already present |

## Implementation Order

1. **Checklist template + CLI update** — Get template todos flowing into session reports
2. **Dashboard component (read-only)** — Display todos and agendas without completion toggle
3. **Todo completion API** — Enable marking todos complete
4. **Navbar nag icon** — Add the indicator
5. **Polish** — Filtering, show/hide completed, styling

## Open Questions

1. **First mutation route patterns:** This is the first mutation API route. Consider:
   - Error response format (JSON with `error` field?)
   - Success response format (return updated todo list, or just `{ success: true }`?)
   - Whether to add CSRF protection (Clerk may handle this via session validation)

2. **File write safety:** The mutation endpoint writes to YAML files. Consider:
   - File locking if concurrent writes are possible (probably not an issue for single-user GM tool)
   - Atomic writes (write to temp file, then rename) — check if `writeYamlAtomic` already does this

3. **Existing todo migration:** If any session reports already have todos in a different format (string array, GFM checkboxes), decide whether to:
   - Migrate them as part of this work
   - Leave them and let the dashboard skip/ignore malformed items
   - The `weave apply ap` currently writes `todos` as a string array — this will need updating regardless
