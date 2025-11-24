<script lang="ts">
  import {
    faCircleHalfStroke,
    faMoon,
    faSun,
  } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import { themePreference, type ThemePreference } from '../stores/theme.ts';

  let currentTheme: ThemePreference = $state('system');

  $effect(() => {
    const unsubscribe = themePreference.subscribe((value) => {
      currentTheme = value;
    });
    return unsubscribe;
  });

  function setTheme(theme: ThemePreference) {
    themePreference.set(theme);
  }

  const options: { value: ThemePreference; icon: typeof faSun; label: string }[] = [
    { value: 'light', icon: faSun, label: 'Light theme' },
    { value: 'system', icon: faCircleHalfStroke, label: 'System theme' },
    { value: 'dark', icon: faMoon, label: 'Dark theme' },
  ];

  function getSliderPosition(theme: ThemePreference): number {
    if (theme === 'light') return 0;
    if (theme === 'system') return 1;
    return 2;
  }
</script>

<div class="theme-slider" role="radiogroup" aria-label="Theme selection">
  <div
    class="slider-track"
    style="--position: {getSliderPosition(currentTheme)}"
  >
    <div class="slider-thumb"></div>
  </div>
  {#each options as option}
    <button
      class="slider-option"
      class:active={currentTheme === option.value}
      onclick={() => setTheme(option.value)}
      aria-label={option.label}
      aria-checked={currentTheme === option.value}
      role="radio"
      title={option.label}
    >
      <FontAwesomeIcon icon={option.icon} />
    </button>
  {/each}
</div>

<style>
  .theme-slider {
    --option-size: 28px;
    display: flex;
    align-items: center;
    position: relative;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    padding: 2px;
    gap: 0;
  }

  .slider-track {
    position: absolute;
    top: 2px;
    left: 2px;
    width: var(--option-size);
    height: var(--option-size);
    pointer-events: none;
    transition: transform 0.2s ease;
    transform: translateX(calc(var(--position) * var(--option-size)));
  }

  .slider-thumb {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
  }

  .slider-option {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--option-size);
    height: var(--option-size);
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    border-radius: 50%;
    transition: color 0.2s ease;
  }

  .slider-option:hover {
    color: rgba(255, 255, 255, 0.8);
  }

  .slider-option.active {
    color: white;
  }
</style>
