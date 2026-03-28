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

<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
  <div class="flex-1">
    <p class="text-xs text-muted-foreground uppercase tracking-wide">Game Code</p>
    <p class="text-xl font-bold tracking-widest">{code}</p>
  </div>
  <Button variant="outline" size="sm" onclick={copyLink}>Copy</Button>
  <Button variant="outline" size="sm" onclick={share}>Share</Button>
</div>
