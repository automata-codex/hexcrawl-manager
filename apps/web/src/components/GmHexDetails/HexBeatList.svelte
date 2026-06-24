<script lang="ts">
  import { getLinkPath } from '../../utils/link-generator';

  import type { BeatMapEntry } from '../../types.ts';

  interface Props {
    /** Canonical beat IDs ("plotlineSlug/beatSlug") anchored on this hex feature. */
    beats?: string[];
    beatMap?: Record<string, BeatMapEntry>;
  }

  const { beats, beatMap = {} }: Props = $props();

  const resolved = $derived(
    (beats ?? []).map((id) => {
      const entry = beatMap?.[id];
      return {
        id,
        title: entry?.title ?? id,
        triggerHtml: entry?.triggerHtml ?? '',
        found: !!entry,
      };
    }),
  );
</script>

{#if resolved.length > 0}
  <p class="beats-heading"><strong>Beats:</strong></p>
  <ul class="beats-list">
    {#each resolved as beat (beat.id)}
      <li>
        {#if beat.found}
          <a href={getLinkPath('beat', beat.id)}>{beat.title}</a>
        {:else}
          <span class="has-text-danger">{beat.title} (not found)</span>
        {/if}{#if beat.triggerHtml}&nbsp;&mdash; <span class="beat-trigger">{@html beat.triggerHtml}</span>{/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .beats-heading {
    margin-bottom: 0;
    text-indent: 0;
  }

  /* The global `ul` rule already supplies the disc marker and gutter (same as
     the GM-notes list). The only override needed: reset the negative
     `text-indent` inherited from the enclosing `.hanging-indent` block, which
     would otherwise drag the marker left over the text. */
  .beats-list {
    margin-top: 0;
    margin-bottom: 0;
    text-indent: 0;
  }

  .beat-trigger {
    font-style: italic;
    color: var(--bulma-text-weak);
  }
</style>
