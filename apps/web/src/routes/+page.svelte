<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AppHost from '$lib/appHost/AppHost.svelte';
  import manifest, { manifestList, type AppId } from '$lib/appHost/manifest';

  const orderedEntries = manifestList;

  const normalizeId = (candidate: string | null): AppId | null => {
    if (!candidate) return orderedEntries[0]?.id ?? null;
    return candidate in manifest ? (candidate as AppId) : orderedEntries[0]?.id ?? null;
  };

  $: queryApp = $page.url.searchParams.get('app');
  $: activeApp = normalizeId(queryApp);

  async function handleSelect(event: CustomEvent<{ id: AppId }>): Promise<void> {
    const { id } = event.detail;
    const url = new URL($page.url);

    if (!id || id === orderedEntries[0]?.id) {
      url.searchParams.delete('app');
    } else {
      url.searchParams.set('app', id);
    }

    await goto(`${url.pathname}${url.search}`, {
      replaceState: true,
      keepfocus: true,
      noscroll: true
    });
  }
</script>

<AppHost {manifest} appId={activeApp} on:select={handleSelect} />
