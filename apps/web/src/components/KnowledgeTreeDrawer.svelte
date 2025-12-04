<script lang="ts">
  import { faTree, faXmark } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import type { KnowledgeNodeData } from '@skyreach/schemas';

  interface Props {
    tree: KnowledgeNodeData;
    treeId: string;
    currentNodeKey: string;
  }

  let { tree, treeId, currentNodeKey }: Props = $props();

  let isOpen = $state(false);
  let drawerRef: HTMLElement | undefined = $state(undefined);
  let currentNodeRef: HTMLElement | null = $state(null);

  function toggle(event: MouseEvent) {
    event.stopPropagation();
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      close();
    }
  }

  function handleBackdropClick() {
    close();
  }

  $effect(() => {
    if (isOpen && currentNodeRef) {
      // Auto-scroll to current node after drawer opens
      setTimeout(() => {
        currentNodeRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  });

  function getNodePath(nodeKey: string): string {
    return `/gm-reference/knowledge-trees/${nodeKey.split('.').join('/')}`;
  }

  // Svelte action to track the current node element
  function trackCurrentNode(node: HTMLElement, isCurrent: boolean) {
    if (isCurrent) {
      currentNodeRef = node;
    }
    return {
      update(newIsCurrent: boolean) {
        if (newIsCurrent) {
          currentNodeRef = node;
        }
      },
    };
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<button class="toggle-button" onclick={toggle} aria-label="View tree structure">
  <FontAwesomeIcon icon={faTree} />
  <span>View Tree</span>
</button>

{#if isOpen}
  <div class="drawer-backdrop" aria-hidden="true" onclick={handleBackdropClick}></div>
  <aside class="drawer" bind:this={drawerRef} onclick={(e) => e.stopPropagation()}>
    <header class="drawer-header">
      <h2>Tree Structure</h2>
      <button class="close-button" onclick={close} aria-label="Close drawer">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </header>
    <nav class="tree-nav">
      {#snippet treeNode(node: KnowledgeNodeData, nodeKey: string, depth: number)}
        {@const isCurrent = nodeKey === currentNodeKey}
        <div
          class="tree-node"
          class:current={isCurrent}
          style="padding-left: {depth * 1}rem"
          use:trackCurrentNode={isCurrent}
        >
          <a href={getNodePath(nodeKey)} class:current={isCurrent}>
            {#if isCurrent}<span class="star">&#9733;</span>{/if}
            {node.name}
            {#if node.isUnlocked}
              <span class="unlocked">&#10003;</span>
            {/if}
          </a>
        </div>
        {#if node.children}
          {#each node.children as child (child.id)}
            {@render treeNode(child, `${nodeKey}.${child.id}`, depth + 1)}
          {/each}
        {/if}
      {/snippet}
      {@render treeNode(tree, tree.id, 0)}
    </nav>
  </aside>
{/if}

<style>
  .toggle-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--bulma-scheme-main-bis);
    border: 1px solid var(--bulma-border);
    border-radius: 0.375rem;
    cursor: pointer;
    color: var(--bulma-text);
    font-size: 0.875rem;
  }

  .toggle-button:hover {
    background: var(--bulma-scheme-main-ter);
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 20rem;
    max-width: 90vw;
    background: var(--bulma-scheme-main);
    border-left: 1px solid var(--bulma-border);
    z-index: 50;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--bulma-border);
  }

  .drawer-header h2 {
    margin: 0;
    font-size: 1rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: var(--bulma-text-weak);
  }

  .close-button:hover {
    color: var(--bulma-text);
  }

  .tree-nav {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .tree-node {
    margin: 0.125rem 0;
  }

  .tree-node a {
    display: block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    color: var(--bulma-text);
    text-decoration: none;
  }

  .tree-node a:hover {
    background: var(--bulma-scheme-main-bis);
  }

  .tree-node a.current {
    background: var(--bulma-primary);
    color: var(--bulma-primary-invert);
    font-weight: 600;
  }

  .star {
    margin-right: 0.25rem;
  }

  .unlocked {
    color: var(--bulma-success);
    margin-left: 0.25rem;
  }

  .tree-node a.current .unlocked {
    color: var(--bulma-success-light);
  }
</style>
