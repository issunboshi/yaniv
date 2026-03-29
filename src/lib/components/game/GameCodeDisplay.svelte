<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  interface Props {
    code: string;
  }

  let { code }: Props = $props();

  async function copyLink() {
    const url = `${window.location.origin}/join/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  }

  async function share() {
    const url = `${window.location.origin}/join/${code}`;
    if (navigator.share) {
      await navigator.share({ title: 'Join Yaniv Game', url });
    } else {
      await copyLink();
    }
  }
</script>

<div class="flex items-center gap-3 rounded-lg border border-emerald-800/50 bg-emerald-950/60 p-3">
  <div class="flex-1">
    <p class="text-xs text-emerald-500 uppercase tracking-wide">Game Code</p>
    <p class="text-xl font-bold tracking-widest text-amber-400">{code}</p>
  </div>
  <Button variant="outline" size="sm" class="border-emerald-600 text-emerald-300 hover:bg-emerald-900/50" onclick={copyLink}>Copy</Button>
  <Button size="sm" class="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold" onclick={share}>Share</Button>
</div>
