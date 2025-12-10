<script lang="ts">
  import { faCircle, faCircleCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { parseSessionId, type SessionId } from '@skyreach/schemas';

  import { renderMarkdown } from '../utils/markdown';

  import type { AggregatedTodoItem, NextSessionAgenda } from '../utils/load-todos';

  function formatSessionId(sessionId: string): string {
    try {
      const { number } = parseSessionId(sessionId as SessionId);
      return `Session ${number}`;
    } catch {
      return sessionId;
    }
  }

  interface Props {
    todos: AggregatedTodoItem[];
    nextSession: NextSessionAgenda | null;
  }

  const { todos: initialTodos, nextSession }: Props = $props();

  // Local state for todos (allows optimistic updates)
  let localTodos = $state<AggregatedTodoItem[]>([...initialTodos]);
  let showCompleted = $state(false);
  let sessionFilter = $state(''); // Empty string = all sessions
  let updating = $state<string | null>(null); // Track which todo is being updated
  let errorMessage = $state<string | null>(null); // Error message for failed updates

  // Get unique session IDs for filter dropdown
  let sessionIds = $derived(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- creating fresh Set inside derived
    const ids = new Set<string>();
    for (const todo of localTodos) {
      ids.add(todo.sessionId);
    }
    return [...ids].sort((a, b) => b.localeCompare(a)); // Most recent first
  });

  // Group todos by session, applying filters
  let groupedTodos = $derived(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- creating fresh Map inside derived
    const groups = new Map<string, AggregatedTodoItem[]>();
    for (const todo of localTodos) {
      if (!showCompleted && todo.status === 'done') continue;
      if (sessionFilter && todo.sessionId !== sessionFilter) continue;
      const list = groups.get(todo.sessionId) || [];
      list.push(todo);
      groups.set(todo.sessionId, list);
    }
    return groups;
  });

  let incompleteCounts = $derived(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- creating fresh Map inside derived
    const counts = new Map<string, number>();
    for (const todo of localTodos) {
      if (todo.status === 'pending') {
        counts.set(todo.sessionId, (counts.get(todo.sessionId) || 0) + 1);
      }
    }
    return counts;
  });

  let totalIncomplete = $derived(() => {
    return localTodos.filter((t) => t.status === 'pending').length;
  });

  function clearError() {
    errorMessage = null;
  }

  async function toggleTodo(todo: AggregatedTodoItem) {
    const todoKey = `${todo.sessionId}-${todo.index}`;
    if (updating === todoKey) return; // Prevent double-clicks

    const newStatus = todo.status === 'pending' ? 'done' : 'pending';
    updating = todoKey;
    errorMessage = null; // Clear any previous error

    // Optimistic update
    const todoIndex = localTodos.findIndex(
      (t) => t.sessionId === todo.sessionId && t.index === todo.index,
    );
    if (todoIndex !== -1) {
      localTodos[todoIndex] = { ...localTodos[todoIndex], status: newStatus };
    }

    try {
      const response = await fetch('/api/todo/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: todo.sessionId,
          todoIndex: todo.index,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        // Revert on error
        if (todoIndex !== -1) {
          localTodos[todoIndex] = { ...localTodos[todoIndex], status: todo.status };
        }
        const data = await response.json().catch(() => ({}));
        errorMessage = data.error || 'Failed to update todo. Please try again.';
      } else {
        // Dispatch event to notify navbar to refresh
        window.dispatchEvent(new CustomEvent('todo-updated'));
      }
    } catch (error) {
      // Revert on error
      if (todoIndex !== -1) {
        localTodos[todoIndex] = { ...localTodos[todoIndex], status: todo.status };
      }
      errorMessage = 'Network error. Please check your connection and try again.';
      console.error('Failed to update todo:', error);
    } finally {
      updating = null;
    }
  }
</script>

<div class="gm-dashboard">
  <section class="dashboard-section">
    <h2 class="title is-3">
      Post-Session Todos
      {#if totalIncomplete() > 0}
        <span class="tag is-warning is-light">{totalIncomplete()} pending</span>
      {/if}
    </h2>

    {#if errorMessage}
      <div class="notification is-danger is-light">
        <button aria-label="Clear" class="delete" onclick={clearError}></button>
        {errorMessage}
      </div>
    {/if}

    <div class="filters">
      <div class="field">
        <label class="label is-small" for="session-filter">Filter by session</label>
        <div class="control">
          <div class="select is-small">
            <select id="session-filter" bind:value={sessionFilter}>
              <option value="">All sessions</option>
              {#each sessionIds() as id (id)}
                <option value={id}>{formatSessionId(id)}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" bind:checked={showCompleted} />
          Show completed
        </label>
      </div>
    </div>

    {#if localTodos.length === 0}
      <p class="has-text-grey-light">
        No todos found. Todos will appear here after running <code>weave apply ap</code>.
      </p>
    {:else if groupedTodos().size === 0}
      <p class="has-text-grey-light">
        {#if sessionFilter}
          No matching todos for this session.
        {:else if !showCompleted}
          All caught up! No pending todos.
        {:else}
          No todos found.
        {/if}
      </p>
    {:else}
      {#each [...groupedTodos()].sort((a, b) => b[0].localeCompare(a[0])) as [sessionId, sessionTodos] (sessionId)}
        <div class="session-group box">
          <h3 class="subtitle is-4 session-header">
            {formatSessionId(sessionId)}
            {#if incompleteCounts().get(sessionId)}
              <span class="tag is-small is-warning is-light">
                {incompleteCounts().get(sessionId)} pending
              </span>
            {/if}
          </h3>
          <ul class="todo-list">
            {#each sessionTodos as todo (`${todo.sessionId}-${todo.index}`)}
              <li
                class="todo-item"
                class:is-done={todo.status === 'done'}
                class:is-updating={updating === `${todo.sessionId}-${todo.index}`}
              >
                <button
                  class="todo-toggle"
                  onclick={() => toggleTodo(todo)}
                  disabled={updating === `${todo.sessionId}-${todo.index}`}
                  aria-label={todo.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                >
                  <span class="todo-icon">
                    {#if todo.status === 'done'}
                      <FontAwesomeIcon icon={faCircleCheck} />
                    {:else}
                      <FontAwesomeIcon icon={faCircle} />
                    {/if}
                  </span>
                  <span class="todo-text">{todo.text}</span>
                </button>
                {#if todo.source === 'template'}
                  <span class="tag is-small is-info is-light source-tag">template</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    {/if}
  </section>

  {#if nextSession}
    <section class="dashboard-section">
      <h2 class="title is-3">Next Session</h2>
      <div class="agenda box">
        <h3 class="subtitle is-4 next-session-id">
          {formatSessionId(nextSession.sessionId)}
          {#if nextSession.sessionDate}
            <span class="has-text-grey-light"> &mdash; {nextSession.sessionDate}</span>
          {/if}
        </h3>
        <div class="agenda-content">
          {#await renderMarkdown(nextSession.agenda) then html}
            {@html html}
          {/await}
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .gm-dashboard {
    max-width: 800px;
    margin: 0 auto;
  }

  .dashboard-section {
    margin-bottom: 2rem;
  }

  .dashboard-section .title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-end;
    margin-bottom: 1rem;
  }

  .filters .field {
    margin-bottom: 0;
  }

  .filters .label {
    margin-bottom: 0.25rem;
  }

  .next-session-id {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .session-group {
    margin-bottom: 1rem;
    padding: 1rem;
  }

  .session-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .todo-item.is-done {
    opacity: 0.6;
  }

  .todo-item.is-done .todo-text {
    text-decoration: line-through;
  }

  .todo-item.is-updating {
    opacity: 0.5;
  }

  .todo-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font: inherit;
    flex-grow: 1;
  }

  .todo-toggle:hover .todo-icon {
    color: var(--bulma-link-text);
  }

  .todo-toggle:disabled {
    cursor: wait;
  }

  .todo-icon {
    flex-shrink: 0;
    width: 1rem;
    text-align: center;
    margin-top: 0.125rem;
  }

  .todo-text {
    flex-grow: 1;
  }

  .source-tag {
    flex-shrink: 0;
    font-size: 0.65rem;
  }

  .agenda {
    padding: 1rem;
  }

  .agenda-content :global(ul),
  .agenda-content :global(ol) {
    margin-top: 0;
    margin-bottom: 0;
  }

  .agenda-content :global(li) {
    margin-bottom: 0.25rem;
  }

  .agenda-content :global(li:last-child) {
    margin-bottom: 0;
  }
</style>
