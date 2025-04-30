<script lang="ts">
  import { onMount } from 'svelte';
  import { Application, Graphics, Text, TextStyle } from 'pixi.js';

  let container: HTMLDivElement;

  onMount(() => {
    let app: Application;

    // Can't pass async callback directly to onMount, so we use an IIFE
    (async () => {
      app = new Application();
      await app.init({
        resizeTo: container,
        autoStart: true,
        antialias: true,
        backgroundColor: 0x202020
      });

      container.appendChild(app.canvas); // 🔥 use .canvas, not .view (deprecated)

      // Placeholder: Just draw a red square
      const square = new Graphics()
        .rect(50, 50, 100, 100)
        .fill({ color: 0xff0000 });
      app.stage.addChild(square);
    })();

    return () => app?.destroy(true);
  });
</script>

<div bind:this={container} class="map-viewer" style="width: 100%; height: 100vh;" ></div>
