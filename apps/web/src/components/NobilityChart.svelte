<script lang="ts">
  import type { NobleData } from '@skyreach/schemas';
  import {
    buildTree,
    computeVerticalLayout,
    getVerticalEdgePath,
    type LayoutConfig,
  } from '../utils/tree-layout';

  interface Props {
    nobles: NobleData[];
    showSecrets?: boolean;
    highlightFaction?: string | null;
  }

  const { nobles, showSecrets = false, highlightFaction = null }: Props = $props();

  // Filter nobles based on visibility
  const visibleNobles = $derived(
    showSecrets ? nobles : nobles.filter((n) => !n.secret)
  );

  // Build and layout tree, sorted by sortValue if available
  const roots = $derived(
    buildTree(
      visibleNobles,
      (noble) => noble.liege,
      (noble) => noble.sortValue ?? noble.id
    )
  );

  const config: Partial<LayoutConfig> = {
    nodeWidth: 150,
    nodeHeight: 60,
    horizontalGap: 40,  // gap between depth levels (columns)
    verticalGap: 15,    // gap between siblings (rows)
  };

  const layout = $derived(computeVerticalLayout(roots, config));

  // Styling helpers
  function getNodeClass(noble: NobleData): string {
    const classes = ['node'];

    if (highlightFaction && noble.factions?.includes(highlightFaction)) {
      classes.push('highlighted');
    }

    if (noble.secret) {
      classes.push('secret');
    }

    // Rank-based styling
    if (['king', 'queen'].includes(noble.title)) {
      classes.push('royal');
    } else if (noble.title === 'prince' || noble.title === 'princess') {
      classes.push('royal');
    } else if (noble.title === 'duke') {
      classes.push('duke');
    }

    return classes.join(' ');
  }

  function getDisplayTitle(noble: NobleData): string {
    if (noble.displayTitle) {
      return noble.displayTitle;
    }
    const titleCapitalized = noble.title.charAt(0).toUpperCase() + noble.title.slice(1);
    return `${titleCapitalized} ${noble.name}`;
  }

  // Split long names for display
  function splitName(title: string): string[] {
    const words = title.split(' ');
    if (words.length <= 2) return [title];

    // Try to split roughly in half
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
</script>

<div class="nobility-chart-container">
  <svg
    viewBox="{-20} {-20} {layout.width + 40} {layout.height + 40}"
    preserveAspectRatio="xMidYMin meet"
  >
    <!-- Edges -->
    <g class="edges">
      {#each layout.edges as edge}
        <path
          d={getVerticalEdgePath(edge)}
          class="edge"
          class:secret={edge.target.data.secret}
        />
      {/each}
    </g>

    <!-- Nodes -->
    <g class="nodes">
      {#each layout.nodes as node}
        {@const lines = splitName(getDisplayTitle(node.data))}
        <g
          class={getNodeClass(node.data)}
          transform="translate({node.x}, {node.y})"
        >
          <rect
            width={node.width}
            height={node.height}
            rx="4"
            ry="4"
          />

          {#if lines.length === 1}
            <text
              x={node.width / 2}
              y={node.height / 2}
              dominant-baseline="middle"
              text-anchor="middle"
            >
              {lines[0]}
            </text>
          {:else}
            <text
              x={node.width / 2}
              y={node.height / 2 - 7}
              dominant-baseline="middle"
              text-anchor="middle"
            >
              {lines[0]}
            </text>
            <text
              x={node.width / 2}
              y={node.height / 2 + 7}
              dominant-baseline="middle"
              text-anchor="middle"
            >
              {lines[1]}
            </text>
          {/if}

          <!-- Tooltip -->
          {#if node.data.description || node.data.gmNotes}
            <title>{#if node.data.description}{node.data.description}{/if}{#if showSecrets && node.data.gmNotes}{node.data.description ? '\n\n' : ''}[GM] {node.data.gmNotes}{/if}</title>
          {/if}
        </g>
      {/each}
    </g>
  </svg>
</div>

<style>
  .nobility-chart-container {
    padding: 1rem;
  }

  svg {
    width: 100%;
    height: auto;
    font-family: var(--bulma-family-primary, system-ui, sans-serif);
    font-size: 12px;
  }

  .edge {
    fill: none;
    stroke: var(--bulma-border, #666);
    stroke-width: 2;
  }

  .edge.secret {
    stroke: var(--bulma-grey-light, #999);
    stroke-dasharray: 4 2;
  }

  .node rect {
    fill: var(--bulma-scheme-main-bis, #e3f2fd);
    stroke: var(--bulma-link, #1976d2);
    stroke-width: 2;
  }

  .node text {
    fill: var(--bulma-text, #333);
    pointer-events: none;
  }

  .node.royal rect {
    fill: #fff3e0;
    stroke: #f57c00;
    stroke-width: 3;
  }

  :global(html[data-theme='dark']) .node.royal rect {
    fill: #4a3728;
    stroke: #ffb74d;
  }

  @media (prefers-color-scheme: dark) {
    :global(html:not([data-theme])) .node.royal rect {
      fill: #4a3728;
      stroke: #ffb74d;
    }
  }

  .node.duke rect {
    fill: #e8f5e9;
    stroke: #388e3c;
  }

  :global(html[data-theme='dark']) .node.duke rect {
    fill: #1b4332;
    stroke: #66bb6a;
  }

  @media (prefers-color-scheme: dark) {
    :global(html:not([data-theme])) .node.duke rect {
      fill: #1b4332;
      stroke: #66bb6a;
    }
  }

  .node.secret rect {
    fill: #fce4ec;
    stroke: #c2185b;
    stroke-dasharray: 4 2;
  }

  :global(html[data-theme='dark']) .node.secret rect {
    fill: #4a1a2c;
    stroke: #f48fb1;
  }

  @media (prefers-color-scheme: dark) {
    :global(html:not([data-theme])) .node.secret rect {
      fill: #4a1a2c;
      stroke: #f48fb1;
    }
  }

  .node.highlighted rect {
    stroke-width: 3;
    filter: drop-shadow(0 0 4px currentColor);
  }

  .node:hover rect {
    filter: brightness(0.95);
  }

  :global(html[data-theme='dark']) .node:hover rect {
    filter: brightness(1.1);
  }

  @media (prefers-color-scheme: dark) {
    :global(html:not([data-theme])) .node:hover rect {
      filter: brightness(1.1);
    }
  }
</style>
