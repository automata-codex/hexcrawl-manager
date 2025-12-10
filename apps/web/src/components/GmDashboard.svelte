<script lang="ts">
  import { faCircle, faCircleCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import type { AggregatedTodoItem, NextSessionAgenda } from '../utils/load-todos';

  interface Props {
    todos: AggregatedTodoItem[];
    nextSession: NextSessionAgenda | null;
  }

  const { todos, nextSession }: Props = $props();

  let showCompleted = $state(false);

  // Group todos by session
  let groupedTodos = $derived(() => {
    const groups = new Map<string, TodoItem[]>();
    for (const todo of todos) {
      if (!showCompleted && todo.status === 'done') continue;
      const list = groups.get(todo.sessionId) || [];
      list.push(todo);
      groups.set(todo.sessionId, list);
    }
    return groups;
  });

  let incompleteCounts = $derived(() => {
    const counts = new Map<string, number>();
    for (const todo of todos) {
      if (todo.status === 'pending') {
        counts.set(todo.sessionId, (counts.get(todo.sessionId) || 0) + 1);
      }
    }
    return counts;
  });

  let totalIncomplete = $derived(() => {
    return todos.filter((t) => t.status === 'pending').length;
  });
</script>

<div class="gm-dashboard">
  <section class="dashboard-section">
    <h2 class="title is-4">
      Post-Session Todos
      {#if totalIncomplete() > 0}
        <span class="tag is-warning is-light">{totalIncomplete()} pending</span>
      {/if}
    </h2>

    <div class="field">
      <label class="checkbox">
        <input type="checkbox" bind:checked={showCompleted} />
        Show completed items
      </label>
    </div>

    {#if groupedTodos().size === 0}
      <p class="has-text-grey-light">
        {#if showCompleted}
          No todos found.
        {:else}
          All caught up! No pending todos.
        {/if}
      </p>
    {:else}
      {#each [...groupedTodos()].sort((a, b) => b[0].localeCompare(a[0])) as [sessionId, sessionTodos]}
        <div class="session-group box">
          <h3 class="subtitle is-6 session-header">
            <a href={`/gm-reference/sessions/${sessionId}`}>{sessionId}</a>
            {#if incompleteCounts().get(sessionId)}
              <span class="tag is-small is-warning is-light">
                {incompleteCounts().get(sessionId)} pending
              </span>
            {/if}
          </h3>
          <ul class="todo-list">
            {#each sessionTodos as todo}
              <li class="todo-item" class:is-done={todo.status === 'done'}>
                <span class="todo-icon">
                  {#if todo.status === 'done'}
                    <FontAwesomeIcon icon={faCircleCheck} />
                  {:else}
                    <FontAwesomeIcon icon={faCircle} />
                  {/if}
                </span>
                <span class="todo-text">{todo.text}</span>
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
      <h2 class="title is-4">Next Session</h2>
      <div class="box">
        <h3 class="subtitle is-6">
          <a href={`/gm-reference/sessions/${nextSession.sessionId}`}>
            {nextSession.sessionId}
          </a>
          {#if nextSession.sessionDate}
            <span class="has-text-grey-light"> &mdash; {nextSession.sessionDate}</span>
          {/if}
        </h3>
        <ul class="agenda-list">
          {#each nextSession.agenda as item}
            <li class="agenda-item">{item}</li>
          {/each}
        </ul>
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

  .session-group {
    margin-bottom: 1rem;
    padding: 1rem;
  }

  .session-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
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

  .agenda-list {
    margin: 0;
    padding-left: 1.5rem;
  }

  .agenda-item {
    margin-bottom: 0.25rem;
  }
</style>
