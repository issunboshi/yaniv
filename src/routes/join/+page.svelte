<script lang="ts">
  import { goto } from '$app/navigation';
  import Header from '$lib/components/layout/Header.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';

  let code = $state('');
  let error = $state('');

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      error = 'Please enter a valid game code';
      return;
    }
    goto(`/join/${trimmed}`);
  }
</script>

<Header title="Join Game" showBack />

<div class="container mx-auto max-w-md p-4">
  <div class="flex flex-col items-center gap-6 pt-8">
    <p class="text-muted-foreground text-center">Enter the game code shared by the scorekeeper</p>

    <Input
      bind:value={code}
      placeholder="XKCD42"
      class="text-center text-2xl tracking-widest uppercase"
      maxlength={6}
      onkeydown={(e) => e.key === 'Enter' && handleJoin()}
    />

    {#if error}
      <p class="text-destructive text-sm">{error}</p>
    {/if}

    <Button onclick={handleJoin} class="w-full" size="lg">Join Game</Button>
  </div>
</div>
