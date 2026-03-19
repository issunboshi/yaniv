<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import RulesAccordion from '$lib/components/rules/RulesAccordion.svelte';
</script>

<Header title="Rules" showBack />

<div class="mx-auto max-w-lg px-4 py-6">
  <RulesAccordion />
</div>
