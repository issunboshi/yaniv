<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import CrtOverlay from '$lib/components/layout/CrtOverlay.svelte';
  import Nav from '$lib/components/layout/Nav.svelte';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-dvh pb-20">
  {@render children()}
</div>

<Nav />
<CrtOverlay />
