<script lang="ts">
  import { faSquare, faSquareCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  interface Props {
    checked: boolean;
  }

  const { checked }: Props = $props();
</script>

{#if checked}
  <FontAwesomeIcon icon={faSquareCheck} />
{:else}
  <FontAwesomeIcon icon={faSquare} />
{/if}
