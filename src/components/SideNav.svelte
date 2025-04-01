<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';

  let sections = $state({
    playersGuide: false,
    gmTools: false,
    reference: false,
    regions: false,
  })
  let open = $state(false);

  function toggleSection(section: keyof typeof sections) {
    sections[section] = !sections[section];
    localStorage.setItem('sidebarSections', JSON.stringify(sections));
  }

  function toggleSidebar() {
    open = !open;
  }

  onMount(() => {
    const stored = localStorage.getItem('sidebarSections');
    if (stored) {
      try {
        sections = JSON.parse(stored);
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

<style>
    .accordion-header {
        background: none;
        border: none;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        color: white;
        width: 100%;
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }

    .accordion-header:hover {
        background-color: rgba(255, 255, 255, 0.05);
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
        padding-left: 1.5rem;
    }

    .accordion-link {
        background: none;
        border: none;
        font: inherit;
        padding: 0;
        color: #ccc;
        display: flex;
        justify-content: space-between;
        width: 100%;
        text-align: left;
        cursor: pointer;
    }

    .accordion-link:hover {
        color: white;
    }

    .accordion-sub {
        padding-left: 2rem;
        font-size: 0.95rem;
    }

    .accordion-body li,
    .accordion-sub li {
        margin: 0.25rem 0;
    }

    a {
        text-decoration: none;
        color: #ccc;
    }

    a:hover {
        color: white;
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
        position: absolute;
        top: 0;
        left: 0;
        width: 250px;
        max-width: 80vw;
        height: 100%;
        background: #222;
        color: white;
        transform: translateX(-100%);
        transition: transform 0.3s ease-in-out;
        padding: 1rem;
        z-index: 1001;
    }

    .sidebar-wrapper.open .sidebar {
        transform: translateX(0);
    }
</style>

<div class="sidebar-wrapper" class:open={open}>
  <aside class="sidebar">
    <nav>
      <!-- Accordion Section: Player’s Guide -->
      <div class="accordion-section">
        <button onclick={() => toggleSection('playersGuide')} class="accordion-header">
          <span>Player’s Guide</span>
          <span class:rotated={sections.playersGuide}>▸</span>
        </button>
        {#if sections.playersGuide}
          <ul class="accordion-body" transition:slide>
            <li><a href="/heritage">Heritage</a></li>
            <li><a href="/class">Class</a></li>
            <li><a href="/goals">Goals</a></li>
            <li><a href="/level-up">Level Up</a></li>
          </ul>
        {/if}
      </div>
      <!-- Accordion Section: GM Tools -->
      <div class="accordion-section">
        <button onclick={() => toggleSection('gmTools')} class="accordion-header">
          <span>GM Tools</span>
          <span class:rotated={sections.gmTools}>▸</span>
        </button>
        {#if sections.gmTools}
          <ul class="accordion-body" transition:slide>
            <li><a href="/session-notes">Session Notes</a></li>
            <li><a href="/bounty-board">Bounty Board</a></li>
            <li><a href="/characters">Characters</a></li>
          </ul>
        {/if}
      </div>

      <!-- Accordion Section: GM Reference -->
      <div class="accordion-section">
        <button onclick={() => toggleSection('reference')} class="accordion-header">
          <span>GM Reference</span>
          <span class:rotated={sections.reference}>▸</span>
        </button>
        {#if sections.reference}
          <ul class="accordion-body" transition:slide>
            <li>
              <button class="accordion-link" onclick={() => toggleSection('regions')}>
                <span>Regions</span>
                <span class:rotated={sections.regions}>▸</span>
              </button>
              {#if sections.regions}
                <ul class="accordion-sub" transition:slide>
                  <li><a href="/regions/01">Region 01</a></li>
                  <li><a href="/regions/02">Region 02</a></li>
                  <li><a href="/regions/03">Region 03</a></li>
                </ul>
              {/if}
            </li>
            <li><a href="/rumors">Rumors</a></li>
            <li><a href="/clues">Clues</a></li>
            <li><a href="/timeline">Timeline</a></li>
          </ul>
        {/if}
      </div>
    </nav>
  </aside>
</div>
