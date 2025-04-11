<script lang="ts">
  import { getStatBlockPath } from '../utils/routes.ts';

  interface Entry {
    type: 'group' | 'single';
    label: string;
    entries?: any[];
    entry?: any;
  }
  interface Props {
    entries: Entry[];
  }

  const { entries }: Props = $props();

  let search = $state('');
  let typeFilter = $state('');

  let filtered = $derived(() => {
    const matchesFilter = (e: Entry) =>
      !typeFilter || (e.entry?.data.type ?? e.entries?.[0]?.data?.type) === typeFilter;

    const matchesSearch = (e: Entry) =>
      !search || e.label.toLowerCase().includes(search.toLowerCase());

    return entries.filter((e) => matchesFilter(e) && matchesSearch(e));
  });

  function getSortedEntries(entries: any[]) {
    return [...entries].sort((a, b) => a.data.name.localeCompare(b.data.name));
  }
</script>

<div>
  <label>
    Search: <input type="text" bind:value={search} placeholder="Search by name…" />
  </label>
  <label>
    Type:
    <select bind:value={typeFilter}>
      <option value="">All</option>
      <option value="aberration">Aberration</option>
      <option value="beast">Beast</option>
      <option value="celestial">Celestial</option>
      <option value="construct">Construct</option>
      <option value="dragon">Dragon</option>
      <option value="elemental">Elemental</option>
      <option value="fey">Fey</option>
      <option value="fiend">Fiend</option>
      <option value="giant">Giant</option>
      <option value="humanoid">Humanoid</option>
      <option value="monstrosity">Monstrosity</option>
      <option value="ooze">Ooze</option>
      <option value="plant">Plant</option>
      <option value="undead">Undead</option>
    </select>
  </label>

  <ul class="stat-block-index">
    {#each filtered() as item}
      {#if item.type === 'group'}
        <li>
          <strong>{item.label}</strong>
          <ul>
            {#each getSortedEntries(item.entries ?? []) as entry}
              <li><a href={getStatBlockPath(entry.slug)}>{entry.data.name}</a></li>
            {/each}
          </ul>
        </li>
      {:else}
        <li><a href={getStatBlockPath(item.entry.slug)}>{item.label}</a></li>
      {/if}
    {/each}
  </ul>
</div>
