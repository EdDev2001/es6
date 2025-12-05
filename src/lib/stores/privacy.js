import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const defaultPrivacySettings = {
    dataCollection: {
        locationTracking: false,
        attendanceAnalytics: true,
        performanceMetrics: true,
        deviceInfo: false,
        usagePatterns: true
    },
    supervisorVisibility: {
        attendanceLogs: true,
        checkInTimes: true,
        locationData: false,
        deviceUsed: false,
        performanceStats: true
    },
    thirdPartyApps: {
        googleCalendar: { connected: false, lastSync: null, email: null },
        microsoftTeams: { connected: false, lastSync: null, email: null },
        slack: { connected: false, lastSync: null, workspace: null },
        zoom: { connected: false, lastSync: null, email: null }
    },
    devicePermissions: {
        camera: { granted: false, lastRequested: null },
        microphone: { granted: false, lastRequested: null },
        notifications: { granted: false, lastRequested: null },
        location: { granted: false, lastRequested: null },
        biometrics: { granted: false, lastRequested: null }
    },
    consentHistory: []
};

function createPrivacyStore() {
    const stored = browser ? localStorage.getItem('privacySettings') : null;
    const initial = stored ? { ...defaultPrivacySettings, ...JSON.parse(stored) } : defaultPrivacySettings;
    
    const { subscribe, set, update } = writable(initial);

    const saveToStorage = (state) => {
        if (browser) {
            localStorage.setItem('privacySettings', JSON.stringify(state));
        }
    };

    const addConsent = (state, action, category, details) => {
        const record = {
            id: Date.now(),
            action,
            category,
            details,
            timestamp: new Date().toISOString(),
            userAgent: browser ? navigator.userAgent : null
        };
        return {
            ...state,
            consentHistory: [record, ...state.consentHistory].slice(0, 100)
        };
    };

    return {
        subscribe,
        
        init: async (userId) => {
            if (!browser) return;
            
            // Check actual device permissions on init
            const permissions = await checkAllPermissions();
            update(state => {
                const newState = {
                    ...state,
                    devicePermissions: {
                        ...state.devicePermissions,
                        notifications: { ...state.devicePermissions.notifications, granted: permissions.notifications },
                        location: { ...state.devicePermissions.location, granted: permissions.location },
                        camera: { ...state.devicePermissions.camera, granted: permissions.camera },
                        microphone: { ...state.devicePermissions.microphone, granted: permissions.microphone }
                    }
                };
                saveToStorage(newState);
                return newState;
            });
        },

        updateDataCollection: (key, value) => {
            update(state => {
                let newState = {
                    ...state,
                    dataCollection: { ...state.dataCollection, [key]: value }
                };
                newState = addConsent(newState, value ? 'enabled' : 'disabled', 'Data Collection', key);
                saveToStorage(newState);
                return newState;
            });
        },

        updateSupervisorVisibility: (key, value) => {
            update(state => {
                let newState = {
                    ...state,
                    supervisorVisibility: { ...state.supervisorVisibility, [key]: value }
                };
                newState = addConsent(newState, value ? 'granted' : 'revoked', 'Supervisor Visibility', key);
                saveToStorage(newState);
                return newState;
            });
        },

        connectThirdPartyApp: async (appKey) => {
            const result = await connectApp(appKey);
            if (result.success) {
                update(state => {
                    let newState = {
                        ...state,
                        thirdPartyApps: {
                            ...state.thirdPartyApps,
                            [appKey]: {
                                connected: true,
                                lastSync: new Date().toISOString(),
                                ...result.data
                            }
                        }
                    };
                    newState = addConsent(newState, 'connected', 'Third-party Apps', appKey);
                    saveToStorage(newState);
                    return newState;
                });
            }
            return result;
        },

        disconnectThirdPartyApp: (appKey) => {
            update(state => {
                let newState = {
                    ...state,
                    thirdPartyApps: {
                        ...state.thirdPartyApps,
                        [appKey]: { connected: false, lastSync: null, email: null, workspace: null }
                    }
                };
                newState = addConsent(newState, 'disconnected', 'Third-party Apps', appKey);
                saveToStorage(newState);
                return newState;
            });
        },

        requestDevicePermission: async (permissionKey) => {
            const result = await requestPermission(permissionKey);
            update(state => {
                let newState = {
                    ...state,
                    devicePermissions: {
                        ...state.devicePermissions,
                        [permissionKey]: {
                            granted: result.granted,
                            lastRequested: new Date().toISOString(),
                            error: result.error || null
                        }
                    }
                };
                newState = addConsent(newState, result.granted ? 'allowed' : 'denied', 'Device Permissions', permissionKey);
                saveToStorage(newState);
                return newState;
            });
            return result;
        },

        revokeDevicePermission: (permissionKey) => {
            update(state => {
                let newState = {
                    ...state,
                    devicePermissions: {
                        ...state.devicePermissions,
                        [permissionKey]: {
                            granted: false,
                            lastRequested: state.devicePermissions[permissionKey]?.lastRequested
                        }
                    }
                };
                newState = addConsent(newState, 'revoked', 'Device Permissions', permissionKey);
                saveToStorage(newState);
                return newState;
            });
        },

        exportData: () => {
            const state = get({ subscribe });
            return {
                exportedAt: new Date().toISOString(),
                settings: state
            };
        },

        clearHistory: () => {
            update(state => {
                const newState = { ...state, consentHistory: [] };
                saveToStorage(newState);
                return newState;
            });
        },

        reset: () => {
            set(defaultPrivacySettings);
            if (browser) {
                localStorage.setItem('privacySettings', JSON.stringify(defaultPrivacySettings));
            }
        }
    };
}

// Real permission request functions
async function requestPermission(type) {
    if (!browser) return { granted: false, error: 'Not in browser' };

    try {
        switch (type) {
            case 'notifications':
                if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    return { granted: permission === 'granted' };
                }
                return { granted: false, error: 'Notifications not supported' };

            case 'location':
                return new Promise((resolve) => {
                    if ('geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition(
                            () => resolve({ granted: true }),
                            (err) => resolve({ granted: false, error: err.message }),
                            { timeout: 10000 }
                        );
                    } else {
                        resolve({ granted: false, error: 'Geolocation not supported' });
                    }
                });

            case 'camera':
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop());
                    return { granted: true };
                } catch (err) {
                    return { granted: false, error: err.message };
                }

            case 'microphone':
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    return { granted: true };
                } catch (err) {
                    return { granted: false, error: err.message };
                }

            case 'biometrics':
                if (window.PublicKeyCredential) {
                    try {
                        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                        return { granted: available };
                    } catch {
                        return { granted: false, error: 'Biometrics check failed' };
                    }
                }
                return { granted: false, error: 'WebAuthn not supported' };

            default:
                return { granted: false, error: 'Unknown permission type' };
        }
    } catch (err) {
        return { granted: false, error: err.message };
    }
}

async function checkAllPermissions() {
    const results = {
        notifications: false,
        location: false,
        camera: false,
        microphone: false
    };

    if (!browser) return results;

    // Check notification permission
    if ('Notification' in window) {
        results.notifications = Notification.permission === 'granted';
    }

    // Check other permissions via Permissions API
    if ('permissions' in navigator) {
        try {
            const [geo, cam, mic] = await Promise.all([
                navigator.permissions.query({ name: 'geolocation' }).catch(() => ({ state: 'denied' })),
                navigator.permissions.query({ name: 'camera' }).catch(() => ({ state: 'denied' })),
                navigator.permissions.query({ name: 'microphone' }).catch(() => ({ state: 'denied' }))
            ]);
            results.location = geo.state === 'granted';
            results.camera = cam.state === 'granted';
            results.microphone = mic.state === 'granted';
        } catch {
            // Permissions API not fully supported
        }
    }

    return results;
}

// Third-party app connection simulation (in real app, use OAuth)
async function connectApp(appKey) {
    if (!browser) return { success: false, error: 'Not in browser' };

    // Simulate OAuth flow - in production, redirect to actual OAuth endpoints
    const appConfigs = {
        googleCalendar: {
            name: 'Google Calendar',
            scopes: ['calendar.readonly', 'calendar.events']
        },
        microsoftTeams: {
            name: 'Microsoft Teams',
            scopes: ['User.Read', 'Calendars.Read']
        },
        slack: {
            name: 'Slack',
            scopes: ['users:read', 'chat:write']
        },
        zoom: {
            name: 'Zoom',
            scopes: ['meeting:read', 'user:read']
        }
    };

    const config = appConfigs[appKey];
    if (!config) return { success: false, error: 'Unknown app' };

    // In production, this would open OAuth popup
    // For demo, simulate successful connection
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    email: 'user@example.com',
                    workspace: appKey === 'slack' ? 'My Workspace' : null,
                    scopes: config.scopes
                }
            });
        }, 1500);
    });
}

export const privacyStore = createPrivacyStore();
