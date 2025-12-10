<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	
	let { children } = $props();
	let showSplash = $state(false);
	let appReady = $state(false);

	onMount(() => {
		// Only show splash on first visit per session
		if (browser) {
			const hasSeenSplash = sessionStorage.getItem('splashShown');
			if (!hasSeenSplash) {
				showSplash = true;
				sessionStorage.setItem('splashShown', 'true');
			} else {
				appReady = true;
			}
		}
	});

	function handleSplashComplete() {
		showSplash = false;
		appReady = true;
	}
</script>

{#if showSplash}
	<SplashScreen onComplete={handleSplashComplete} duration={2500} />
{/if}

{#if appReady || !browser}
	{@render children()}
{/if}
