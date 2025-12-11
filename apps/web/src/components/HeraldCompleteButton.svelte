<script lang="ts">
  interface Props {
    regionId: string;
  }

  let { regionId }: Props = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleClick() {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/regions/${regionId}/complete-herald`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        error = data.error || 'Failed to complete herald';
      }
    } catch {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="herald-complete-container">
  <button
    class="herald-complete-btn"
    onclick={handleClick}
    disabled={loading}
  >
    {loading ? 'Completing...' : 'Mark Herald Complete'}
  </button>
  {#if error}
    <p class="error-message">{error}</p>
  {/if}
</div>

<style>
  .herald-complete-container {
    margin-top: 1rem;
  }

  .herald-complete-btn {
    padding: 0.5rem 1rem;
    background-color: #166534;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .herald-complete-btn:hover:not(:disabled) {
    background-color: #14532d;
  }

  .herald-complete-btn:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .error-message {
    color: #dc2626;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }
</style>
