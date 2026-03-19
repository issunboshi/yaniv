<script lang="ts">
  import { page } from '$app/stores';
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-800/50 bg-emerald-950/95 backdrop-blur-sm">
  <div class="mx-auto flex max-w-lg items-center justify-around py-2">
    {#each [
      { href: '/', label: 'Home', icon: '🏠' },
      { href: '/rules', label: 'Rules', icon: '📜' },
      { href: '/history', label: 'History', icon: '📊' },
      { href: '/stats', label: 'Stats', icon: '🏆' },
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ] as item}
      <a
        href={item.href}
        class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors
          {$page.url.pathname === item.href ? 'text-amber-400' : 'text-emerald-300/60 hover:text-emerald-200'}"
      >
        <span class="text-lg">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>
