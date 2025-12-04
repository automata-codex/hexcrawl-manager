<script lang="ts">
  import { faChevronRight } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import { renderBulletMarkdown } from '../utils/markdown.js';
  import { generateLink, generateLabelAppendix } from '../utils/placement-links.js';

  import type { PlacementRef } from '../types.js';
  import type { KnowledgeNodeData } from '@skyreach/schemas';

  interface Props {
    node: KnowledgeNodeData;
    nodeKey: string;
    placements: PlacementRef[];
  }

  let { node, nodeKey, placements }: Props = $props();

  // Use node's children directly (passed through Astro serialization)
  const children = node.children ?? [];

  let isDetailsExpanded = $state(false);
  let renderedDescription = $state('');
  let renderedDetails = $state('');

  $effect(() => {
    renderBulletMarkdown(node.description).then((html) => {
      renderedDescription = html;
    });
  });

  $effect(() => {
    if (node.details) {
      renderBulletMarkdown(node.details).then((html) => {
        renderedDetails = html;
      });
    }
  });

  function getChildPath(childId: string): string {
    const basePath = nodeKey.split('.').join('/');
    return `/gm-reference/knowledge-trees/${basePath}/${childId}`;
  }
</script>

<article class="node-content">
  <header>
    <h1>{node.name}</h1>
    {#if node.isUnlocked}
      <span class="unlocked-badge">&#10003; Unlocked</span>
    {/if}
  </header>

  <div class="description">
    {@html renderedDescription}
  </div>

  {#if node.details}
    <section class="details-section">
      <button
        class="details-toggle"
        onclick={() => (isDetailsExpanded = !isDetailsExpanded)}
      >
        <span class="chevron" class:rotated={isDetailsExpanded}>
          <FontAwesomeIcon icon={faChevronRight} />
        </span>
        <strong>Details</strong>
      </button>
      {#if isDetailsExpanded}
        <div class="details-content">
          {@html renderedDetails}
        </div>
      {/if}
    </section>
  {/if}

  {#if !node.notPlaced}
    <section class="placements-section">
      <h2>Placements</h2>
      {#if placements.length > 0}
        <ul class="placement-list">
          {#each placements as ref (ref.id)}
            <li>
              <a href={generateLink(ref)}>{ref.label}</a>
              {' '}
              {generateLabelAppendix(ref)}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="not-placed">Not placed</p>
      {/if}
    </section>
  {/if}

  {#if children.length > 0}
    <section class="children-section">
      <h2>Children</h2>
      <ul class="children-list">
        {#each children as child (child.id)}
          <li>
            <a href={getChildPath(child.id)}>{child.name}</a>
            {#if child.isUnlocked}
              <span class="unlocked-indicator">&#10003;</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</article>

<style>
  .node-content {
    background: var(--bulma-scheme-main-bis);
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .unlocked-badge {
    background: var(--bulma-success);
    color: var(--bulma-success-invert);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .description {
    margin-bottom: 1rem;
  }

  .details-section {
    margin-bottom: 1rem;
  }

  .details-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--bulma-text);
  }

  .details-toggle .chevron {
    width: 1em;
    transition: transform 0.2s ease;
  }

  .details-toggle .chevron.rotated {
    transform: rotate(90deg);
  }

  .details-content {
    margin-top: 0.5rem;
    margin-left: 1.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--bulma-border);
  }

  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
    color: var(--bulma-text-weak);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .placement-list,
  .children-list {
    margin: 0;
    padding-left: 1.25rem;
  }

  .placement-list li,
  .children-list li {
    margin: 0.25rem 0;
  }

  .not-placed {
    color: var(--bulma-danger);
    margin: 0;
  }

  .unlocked-indicator {
    color: var(--bulma-success);
    margin-left: 0.25rem;
  }
</style>
