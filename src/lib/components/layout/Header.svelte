<script lang="ts">
  interface Props {
    title: string;
    showBack?: boolean;
    backHref?: string;
  }
  let { title, showBack = false, backHref = '/' }: Props = $props();
</script>

<header class="sticky top-0 z-30 border-b border-emerald-800/50 bg-emerald-950/95 px-4 py-3 backdrop-blur-sm">
  <div class="mx-auto flex max-w-lg items-center gap-3">
    {#if showBack}
      <a href={backHref} class="text-emerald-300 hover:text-amber-400 transition-colors">←</a>
    {/if}
    <h1 class="font-bold text-lg text-amber-400 tracking-wide">{title}</h1>
  </div>
</header>
