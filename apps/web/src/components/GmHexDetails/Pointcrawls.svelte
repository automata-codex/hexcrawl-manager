<script lang="ts">
  import { faChartNetwork } from '@fortawesome/pro-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import { getPointcrawlPath } from '../../config/routes.ts';

  import type { PointcrawlLink } from '../../types.ts';

  interface Props {
    pointcrawls?: PointcrawlLink[];
  }

  const { pointcrawls = [] }: Props = $props();
</script>

<div>
  {#each pointcrawls as pc (pc.slug)}
    <a href={getPointcrawlPath(pc.slug)} title={pc.name}>
      <FontAwesomeIcon icon={faChartNetwork} />
    </a>
  {/each}
</div>
