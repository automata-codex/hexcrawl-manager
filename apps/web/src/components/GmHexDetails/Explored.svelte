<script lang="ts">
  import CheckBoxIcon from '../InteractiveMap/CheckBoxIcon.svelte';

  interface Props {
    isExplored: boolean | undefined;
  }

  const { isExplored }: Props = $props();
</script>

<div class="data-bar-cell">
  <span class="inline-heading">Explored:</span>{' '}<CheckBoxIcon checked={isExplored ?? false} />
</div>
