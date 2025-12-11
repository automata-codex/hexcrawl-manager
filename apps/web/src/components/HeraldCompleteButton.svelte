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

<button
  class="button herald-complete-btn"
  onclick={handleClick}
  disabled={loading}
>
  {loading ? 'Completing...' : 'Mark Herald Complete'}
</button>
{#if error}
  <p class="error-message">{error}</p>
{/if}

<style>
  .herald-complete-btn {
    padding: 0.25rem 0.75rem;
    margin-bottom: 0.25rem;
  }

  .error-message {
    color: #dc2626;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }
</style>
