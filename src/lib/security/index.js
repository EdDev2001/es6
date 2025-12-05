// src/lib/security/index.js
// Enterprise Security Module - Central exports

// Device Fingerprinting & Zero-Trust
export {
    generateDeviceFingerprint,
    getDeviceInfo,
    validateDeviceFingerprint,
    storeTrustedDevice,
    isDeviceTrusted,
    getTrustedDevices,
    removeTrustedDevice
} from './deviceFingerprint.js';

// Session Management
export {
    createSecureSession,
    validateSession,
    updateSessionActivity,
    expireSession,
    revokeSession,
    revokeAllSessions,
    getActiveSessions,
    stopActivityMonitor
} from './sessionManager.js';

// Geofence & Location Validation
export {
    calculateDistance,
    getCurrentLocation,
    getCampusZones,
    validateLocationInGeofence,
    logLocationValidation,
    saveCampusZones,
    detectLocationSpoofing
} from './geofence.js';
