<script lang="ts">
  import { faDungeon } from '@fortawesome/pro-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import { getDungeonPath } from '../../config/routes.ts';

  import type { DungeonEntry } from '../../types.ts';
  import type { HexData } from '@skyreach/schemas';

  interface Props {
    dungeons: DungeonEntry[];
    hex: HexData;
  }

  const { dungeons, hex }: Props = $props();

  const hexDungeons = $derived(
    dungeons
      .filter(
        (dungeon) => dungeon.data.hexId.toLowerCase() === hex.id.toLowerCase(),
      )
      .sort((a, b) => a.data.name.localeCompare(b.data.name)),
  );
</script>

<div>
  {#each hexDungeons as dungeon (dungeon.id)}
    <a href={getDungeonPath(dungeon.id)} title={dungeon.data.name}>
      <FontAwesomeIcon icon={faDungeon} />
    </a>
  {/each}
</div>
