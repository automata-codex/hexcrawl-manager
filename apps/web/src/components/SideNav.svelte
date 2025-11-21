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
            >
              <span>{section.label}</span>
              <span class:rotated={sectionState[section.id]}>
                <FontAwesomeIcon icon={faChevronRight} />
              </span>
            </button>

            {#if sectionState[section.id]}
              <ul class="accordion-body" transition:slide>
                {#each section.items as item}
                  {#if item.expandable}
                    <li>
                      <button
                        class="accordion-link"
                        onclick={() => toggleSection(item.id)}
                      >
                        <span>{item.label}</span>
                        <span class:rotated={sectionState[item.id]}>
                          <FontAwesomeIcon icon={faChevronRight} />
                        </span>
                      </button>
                      {#if sectionState[item.id]}
                        <ul class="accordion-sub" transition:slide>
                          {#if item.items}
                            {#each item.items as subitem}
                              <li>
                                <a href={subitem.href}>{subitem.label}</a>
                              </li>
                            {/each}
                          {/if}
                        </ul>
                      {/if}
                    </li>
                  {:else}
                    <li><a href={item.href}>{item.label}</a></li>
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
    background: none;
    border: none;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    color: var(--sidebar-text);
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .accordion-header:hover {
    background-color: var(--sidebar-hover);
  }

  .accordion-header span:last-child,
  .accordion-link span:last-child {
    margin-left: auto;
    transition: transform 0.2s;
  }

  .accordion-body {
    overflow: hidden;
    padding-left: 1.5rem;
    margin: 0;
    list-style: none;
  }

  .accordion-body,
  .accordion-sub {
    list-style: none;
    margin: 0;
    padding-left: 0;
  }

  .accordion-body a,
  .accordion-sub a,
  .accordion-link {
    align-items: center;
    background: none;
    border: none;
    color: var(--sidebar-text-muted);
    cursor: pointer;
    display: flex;
    font: inherit;
    justify-content: space-between;
    padding: 0 0.75rem 0 2rem;
    text-decoration: none;
    width: 100%;
  }

  .accordion-body a:hover,
  .accordion-sub a:hover,
  .accordion-link:hover {
    background-color: var(--sidebar-hover);
    color: var(--sidebar-text);
  }

  .accordion-sub a {
    padding-left: 3.5rem;
  }

  .accordion-body li,
  .accordion-sub li {
    margin: 0.25rem 0;
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
