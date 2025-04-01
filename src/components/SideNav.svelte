<script lang="ts">
  import { onMount } from 'svelte';

  let sections = $state({
    playersGuide: false,
    gmTools: false,
    reference: false,
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
        font-size: 1rem;
        font-weight: bold;
        padding: 0.5rem 1rem;
        width: 100%;
        text-align: left;
        color: white;
        cursor: pointer;
        transition: background 0.2s;
    }

    .accordion-header:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .accordion-body {
        list-style: none;
        padding: 0.5rem 1.5rem;
        margin: 0;
    }

    .accordion-body li {
        margin: 0.25rem 0;
    }

    .accordion-body a {
        color: #ccc;
        text-decoration: none;
    }

    .accordion-body a:hover {
        color: white;
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
          Player’s Guide
        </button>
        {#if sections.playersGuide}
          <ul class="accordion-body">
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
          GM Tools
        </button>
        {#if sections.gmTools}
          <ul class="accordion-body">
            <li><a href="/session-notes">Session Notes</a></li>
            <li><a href="/bounty-board">Bounty Board</a></li>
            <li><a href="/characters">Characters</a></li>
          </ul>
        {/if}
      </div>

      <!-- Accordion Section: GM Reference -->
      <div class="accordion-section">
        <button onclick={() => toggleSection('reference')} class="accordion-header">
          GM Reference
        </button>
        {#if sections.reference}
          <ul class="accordion-body">
            <li><a href="/regions">Regions</a></li>
            <li><a href="/rumors">Rumors</a></li>
            <li><a href="/clues">Clues</a></li>
            <li><a href="/timeline">Timeline</a></li>
          </ul>
        {/if}
      </div>
    </nav>
  </aside>
</div>
