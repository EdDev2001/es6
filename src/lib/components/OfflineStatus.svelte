<script>
    import { onMount, onDestroy } from 'svelte';
    import {
        isOnline,
        pendingCount,
        syncStatus,
        offlineMode,
        initOfflineStore,
        triggerSync,
        refreshPendingActions
    } from '$lib/stores/offline.js';

    export let showBanner = true;
    export let showBadge = true;
    export let position = 'top'; // 'top' or 'bottom'

    let showDetails = false;

    onMount(() => {
        initOfflineStore();
    });

    async function handleSync() {
        await triggerSync();
    }

    function playSound(type = 'sync') {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
   