<script lang="ts">
  import { faChevronRight, faXmark } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';

  import type { SidebarSection } from '../types.ts';

  interface Props {
    sections: SidebarSection[];
  }

  let { sections }: Props = $props();

  let sectionState: Record<string, boolean> = $state({});
  let open = $state(false);

  function toggleSection(section: keyof typeof sectionState) {
    sectionState[section] = !sectionState[section];
    localStorage.setItem('sidebarSections', JSON.stringify(sectionState));
  }

  function toggleSidebar() {
    open = !open;
  }

  onMount(() => {
    const stored = localStorage.getItem('sidebarSections');
    if (stored) {
      try {
        sectionState = JSON.parse(stored);
      } catch {
        // If it's broken, just use default
      }
    }

    window.addEventListener('toggle-sidebar', toggleSidebar);
    return () => {
      window.removeEventListener('toggle-sidebar', toggleSidebar);
    };
  });
</script>

<div class="sidebar-wrapper" class:open>
  <aside class="sidebar">
    <button
      class="sidebar-close"
      onclick={toggleSidebar}
      aria-label="Close menu"
    >
      <FontAwesomeIcon icon={faXmark} />
    </button>
    <nav>
      <div class="sidebar-content">
        {#each sections as section}
          <div class="accordion-section">
            <button
              class="accordion-header"
              onclick={() => toggleSection(section.id)}
              aria-label={sectionState[section.id] ? 'Collapse section' : 'Expand section'}
            >
              <span class="section-label">{section.label}</span>
              <span class="toggle-icon" class:rotated={sectionState[section.id]}>
                <FontAwesomeIcon icon={faChevronRight} />
              </span>
            </button>

            {#if sectionState[section.id]}
              <ul class="accordion-body" transition:slide>
                {#each section.items as item}
                  {#if item.expandable && item.id}
                    <li class="expandable-item">
                      <button
                        class="item-toggle"
                        onclick={() => toggleSection(item.id)}
                        aria-label={sectionState[item.id] ? 'Collapse' : 'Expand'}
                      >
                        <span class="item-label">{item.label}</span>
                        <span class="toggle-icon" class:rotated={sectionState[item.id]}>
                          <FontAwesomeIcon icon={faChevronRight} />
                        </span>
                      </button>
                      {#if sectionState[item.id] && item.items}
                        <ul class="sub-items" transition:slide>
                          {#each item.items as subItem}
                            <li><a href={subItem.hasToC && subItem.tocHref ? subItem.tocHref : subItem.href}>{subItem.label}</a></li>
                          {/each}
                        </ul>
                      {/if}
                    </li>
                  {:else}
                    <li><a href={item.hasToC && item.tocHref ? item.tocHref : item.href}>{item.label}</a></li>
                  {/if}
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    </nav>
  </aside>
</div>

<style>
  .accordion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .accordion-header:hover {
    background-color: var(--sidebar-hover);
  }

  .section-label {
    color: var(--sidebar-text);
    font-size: 1rem;
    flex: 1;
  }

  .toggle-icon {
    color: var(--sidebar-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }

  .accordion-body {
    list-style: none;
    margin: 0;
    padding-left: 0;
  }

  .accordion-body > li > a {
    color: var(--sidebar-text-muted);
    display: block;
    padding: 0 0.75rem 0 2rem;
    text-decoration: none;
  }

  .accordion-body > li > a:hover {
    background-color: var(--sidebar-hover);
    color: var(--sidebar-text);
  }

  .accordion-body li {
    margin: 0.25rem 0;
  }

  .item-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.25rem 0.75rem 0.25rem 2rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .item-toggle:hover {
    background-color: var(--sidebar-hover);
  }

  .item-label {
    color: var(--sidebar-text-muted);
    flex: 1;
  }

  .item-toggle:hover .item-label {
    color: var(--sidebar-text);
  }

  .sub-items {
    list-style: none;
    margin: 0;
    padding-left: 0;
  }

  .sub-items li {
    margin: 0.375rem 0;
  }

  .sub-items a {
    display: block;
    padding: 0 0.75rem 0 3rem;
  }

  .sub-items a:hover {
    background-color: var(--sidebar-hover);
    color: var(--sidebar-text);
  }

  a {
    text-decoration: none;
    color: var(--sidebar-text-muted);
  }

  a:hover {
    color: var(--sidebar-text);
  }

  .rotated {
    display: inline-block;
    transform: rotate(90deg);
    transition: transform 0.2s ease;
  }

  .sidebar-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  }

  .sidebar-wrapper.open {
    pointer-events: auto;
  }

  .sidebar {
    --sidebar-bg: #222;
    --sidebar-text: white;
    --sidebar-text-muted: #ccc;
    --sidebar-hover: rgba(255, 255, 255, 0.05);

    position: absolute;
    top: 0;
    left: 0;
    width: 250px;
    max-width: 80vw;
    height: 100%;
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    padding: 1rem;
    z-index: 1001;
  }

  /* Light mode - explicit theme selection */
  :global(html[data-theme='light']) .sidebar {
    --sidebar-bg: #f5f5f5;
    --sidebar-text: #222;
    --sidebar-text-muted: #555;
    --sidebar-hover: rgba(0, 0, 0, 0.05);
  }

  /* Light mode - system preference when no explicit theme */
  @media (prefers-color-scheme: light) {
    :global(html:not([data-theme])) .sidebar {
      --sidebar-bg: #f5f5f5;
      --sidebar-text: #222;
      --sidebar-text-muted: #555;
      --sidebar-hover: rgba(0, 0, 0, 0.05);
    }
  }

  .sidebar-wrapper.open .sidebar {
    transform: translateX(0);
  }

  .sidebar-close {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--sidebar-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    z-index: 1001;
  }

  .sidebar-close:hover {
    color: var(--sidebar-text);
  }

  .sidebar-content {
    padding-top: 1.5rem;
  }
</style>
