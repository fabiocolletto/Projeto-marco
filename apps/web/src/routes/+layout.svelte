<script lang="ts">
        import '../app.css';
        import AppBaseLayout from '$lib/layout/AppBaseLayout.svelte';
        import favicon from '$lib/assets/favicon.svg';

        let { children } = $props();
</script>

<svelte:head>
        <link rel="icon" href={favicon} />
</svelte:head>

<AppBaseLayout>
        {@render children?.()}
</AppBaseLayout>
