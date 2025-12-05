// src/lib/offline/index.js
// Offline Support Module - Central exports

export {
    queueOfflineAction,
    getPendingActions,
    markActionSynced,
    syncPendingActions,
    getPendingCount,
    clearSyncedActions,
    setupAutoSync,
    isOffline
} from './offlineQueue.js';
