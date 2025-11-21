<script lang="ts">
  import {
    faCircleHalfStroke,
    faMoon,
    faSun,
  } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';

  import {
    cycleTheme,
    themePreference,
    type ThemePreference,
  } from '../stores/theme.ts';

  let currentTheme: ThemePreference = $state('system');

  const icons = {
    light: faSun,
    system: faCircleHalfStroke,
    dark: faMoon,
  };

  const labels = {
    light: 'Light theme (click for system)',
    system: 'System theme (click for dark)',
    dark: 'Dark theme (click for light)',
  };

  onMount(() => {
    const unsubscribe = themePreference.subscribe((value) => {
      currentTheme = value;
    });
    return unsubscribe;
  });
</script>

<button
  class="button is-dark is-small theme-toggle"
  onclick={cycleTheme}
  aria-label={labels[currentTheme]}
  title={labels[currentTheme]}
>
  <FontAwesomeIcon icon={icons[currentTheme]} />
</button>

<style>
  .theme-toggle {
    font-size: 1rem;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    height: fit-content;
    align-self: center;
  }

  .theme-toggle:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
</style>
