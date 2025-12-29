<script lang="ts">
  import { faListCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';

  let incompleteCount = $state(0);
  let loading = $state(true);
  let isAuthorized = $state(false); // Only show for GM users

  async function fetchCount() {
    try {
      const response = await fetch('/api/todo/count');
      if (response.ok) {
        isAuthorized = true;
        const data = await response.json();
        incompleteCount = data.incomplete;
      } else if (response.status === 403) {
        isAuthorized = false;
      }
    } catch (error) {
      console.error('Failed to fetch todo count:', error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchCount();

    // Listen for todo updates from the dashboard
    const handleTodoUpdated = () => {
      fetchCount();
    };

    window.addEventListener('todo-updated', handleTodoUpdated);

    return () => {
      window.removeEventListener('todo-updated', handleTodoUpdated);
    };
  });
</script>

{#if !loading && isAuthorized}
  <a
    href="/"
    class="nag-icon"
    title={incompleteCount > 0 ? `${incompleteCount} pending todos` : 'All todos complete'}
  >
    <FontAwesomeIcon icon={faListCheck} />
    {#if incompleteCount > 0}
      <span class="badge">{incompleteCount}</span>
    {/if}
  </a>
{/if}

<style>
  .nag-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    color: inherit;
    text-decoration: none;
  }

  .nag-icon:hover {
    color: var(--bulma-link-text);
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    font-size: 0.65rem;
    font-weight: 600;
    line-height: 16px;
    text-align: center;
    color: black;
    background-color: #f59e0b;
    border-radius: 8px;
    font-family: 'Source Sans 3', sans-serif;
  }
</style>
