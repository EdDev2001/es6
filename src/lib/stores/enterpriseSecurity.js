// src/lib/stores/enterpriseSecurity.js
// Enterprise Security Store: Centralized security state management
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Security status store
 */
export const securityStatus = writable({
    sessionValid: false,
    deviceTrusted: false,
    locationValid: false,
    behaviorNormal: true,
    isOnline: true,
    pendingSync: 0,
    lastCheck: null
});

/**
 * Current session store
 */
export const currentSession = writable(null);

/**
 * Geofence status store
 */
export const geofenceStatus = writable({
    inZone: false,
    currentZone: null,
    distance: null,
    lastValidation: null
});

/**
 * Offline queue status store
 */
export const offlineStatus = writable({
    isOffline: false,
    pendingActions: 0,
    lastSync: null,
    syncInProgress: false
});

/**
 * Behavior analysis store
 */
export const behaviorStatus = writable({
    trustScore: 100,
    riskLevel: 'low',
    anomalies: [],
    lastAnalysis: null
});

/**
 * Derived store for overall security readiness
 */
export const securityReady = derived(
    [securityStatus, geofenceStatus, behaviorStatus],
    ([$security, $geofence, $behavior]) => {
        const issues = [];
        
        if (!$security.sessionValid) issues.push('Session not validated');
        if (!$security.deviceTrusted) issues.push('Device not trusted');
        if (!$geofence.inZone) issues.push('Outside allowed area');
        if ($behavior.riskLevel === 'high' || $behavior.riskLevel === 'critical') {
            issues.push('Behavior anomaly detected');
        }
        
        return {
            ready: issues.length === 0,
            issues,
            canProceed: issues.length <= 1 && !issues.includes('Behavior anomaly detected')
        };
    }
);
