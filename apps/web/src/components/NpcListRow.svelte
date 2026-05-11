<script lang="ts">
  import Badge from './Badge.svelte';
  import type { NpcListItem } from './npc-list-types';

  interface Props {
    npc: NpcListItem;
  }

  const { npc }: Props = $props();
</script>

<a class="npc-link" href={npc.href}>
  {#if npc.image}
    <img class="npc-thumb" src={npc.image} alt="" loading="lazy" />
  {:else}
    <span class="npc-thumb npc-thumb-placeholder" aria-hidden="true"></span>
  {/if}
  <span class="npc-text">
    <span class="npc-name">
      {npc.displayName}
      {#if npc.visibility === 'gm'}
        <Badge color="purple">GM</Badge>
      {/if}
      {#if npc.campaignStatus === 'inactive'}
        <Badge color="gray">inactive</Badge>
      {/if}
    </span>
    <span class="npc-occupation">{npc.occupation}</span>
  </span>
</a>

<style>
  .npc-link {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.25rem 0.25rem 0.25rem 0;
    color: inherit;
    text-decoration: none;
    border-radius: 4px;
  }

  .npc-link:hover {
    background-color: var(--bulma-scheme-main-bis);
  }

  .npc-link:hover .npc-name {
    text-decoration: underline;
    color: var(--bulma-link-text);
  }

  .npc-thumb {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 4px;
    object-fit: cover;
    background-color: var(--bulma-scheme-main-bis);
  }

  .npc-thumb-placeholder {
    display: inline-block;
    border: 1px dashed var(--bulma-border);
  }

  .npc-text {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    min-width: 0;
  }

  .npc-name {
    font-weight: 600;
    color: var(--bulma-strong-color);
  }

  .npc-occupation {
    font-size: 0.85rem;
    color: var(--bulma-text-weak);
  }
</style>
