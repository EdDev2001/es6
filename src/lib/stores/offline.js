// src/lib/stores/offline.js
// Reactive Svelte store for offline mode status and sync queue
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Core offline state
export const isOnline = writable(browser ? navigator.onLine : true);
export const pendingActions = writable([]);
export const syncStatus = writable({
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null
});

// Derived stores
export const pendingCount = derived(pendingActions, ($actions) => $actions.length);
export const hasPendingActions = derived(pendingCount, ($count) => $count > 0);

// Offline mode state
export const offlineMode = derived(
    [isOnline, hasPendingActions],
    ([$isOnline, $hasPending]) => ({
        isOnline: $isOnline,
        isOffline: !$isOnline,
        hasPending: $hasPending,
        showBadge: $hasPending
    })
);

/**
 * Initialize offline store and listeners
 */
export function initOfflineStore() {
    if (!browser) return;

    // Listen for online/offline events
    window.addEventListener('online', () => {
        isOnline.set(true);
        // Trigger sync when back online
        triggerSync();
    });

    window.addEventListener('offline', () => {
        isOnline.set(false);
    });

    // Listen for sync complete events
    window.addEventListener('offline-sync-complete', (event) => {
        const result = event.detail;
        syncStatus.update((s) => ({
            ...s,
            isSyncing: false,
            lastSyncTime: new Date().toISOString(),
            lastSyncResult: result
        }));
        // Refresh pending actions
        refreshPendingActions();
    });

    // Initial load of pending actions
    refreshPendingActions();

    // Periodic refresh
    setInterval(refreshPendingActions, 10000); // Every 10 seconds
}

/**
 * Refresh pending actions from IndexedDB
 */
export async function refreshPendingActions() {
    if (!browser) return;

    try {
        const { getPendingActions } = await import('$lib/offline/offlineQueue.js');
        const actions = await getPendingActions();
        pendingActions.set(actions);
    } catch (error) {
        console.error('Error refreshing pending actions:', error);
    }
}

/**
 * Trigger manual sync
 */
export async function triggerSync() {
    if (!browser) return { synced: 0, failed: 0, pending: 0 };

    syncStatus.update((s) => ({ ...s, isSyncing: true }));

    try {
        const { syncPendingActions } = await import('$lib/offline/offlineQueue.js');
        const result = await syncPendingActions();

        syncStatus.update((s) => ({
            ...s,
            isSyncing: false,
            lastSyncTime: new Date().toISOString(),
            lastSyncResult: result
        }));

        await refreshPendingActions();
        return result;
    } catch (error) {
        console.error('Sync error:', error);
        syncStatus.update((s) => ({ ...s, isSyncing: false }));
        return { synced: 0, failed: 0, pending: 0, error: error.message };
    }
}

/**
 * Add action to offline queue
 */
export async function addOfflineAction(action) {
    if (!browser) return null;

    try {
        const { queueOfflineAction } = await import('$lib/offline/offlineQueue.js');
        const id = await queueOfflineAction(action);
        await refreshPendingActions();
        return id;
    } catch (error) {
        console.error('Error adding offline action:', error);
        return null;
    }
}

/**
 * Clear synced actions from queue
 */
export async function clearSynced() {
    if (!browser) return 0;

    try {
        const { clearSyncedActions } = await import('$lib/offline/offlineQueue.js');
        const count = await clearSyncedActions();
        await refreshPendingActions();
        return count;
    } catch (error) {
        console.error('Error clearing synced actions:', error);
        return 0;
    }
}
