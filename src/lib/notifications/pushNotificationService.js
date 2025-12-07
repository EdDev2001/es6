// src/lib/notifications/pushNotificationService.js
// Real Push Notification Service with FCM, vibration, and sound support
import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, set, get, update } from 'firebase/database';

// Notification sound URLs (using Web Audio API for custom sounds)
const NOTIFICATION_SOUNDS = {
    default: '/sounds/notification.mp3',
    urgent: '/sounds/urgent.mp3',
    success: '/sounds/success.mp3',
    reminder: '/sounds/reminder.mp3'
};

// Vibration patterns (in milliseconds)
const VIBRATION_PATTERNS = {
    default: [200, 100, 200],
    urgent: [300, 100, 300, 100, 300],
    gentle: [100],
    success: [100, 50, 100, 50, 200]
};

// Store service worker registration globally
let swRegistration = null;

/**
 * Initialize push notification service
 */
export async function initPushNotifications() {
    if (!browser) return { success: false, error: 'Not in browser' };

    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            return { success: false, error: 'Notifications not supported' };
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return { success: false, error: 'Permission denied' };
        }

        // Try to register service worker (may fail on HTTPS with self-signed cert)
        if ('serviceWorker' in navigator) {
            try {
                swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', swRegistration.scope);
                await navigator.serviceWorker.ready;
                console.log('Service Worker ready');
                return { success: true, registration: swRegistration, swEnabled: true };
            } catch (swError) {
                // Service Worker failed (likely SSL issue in dev), but notifications still work
                console.warn('Service Worker registration failed (will use fallback):', swError.message);
                return { success: true, swEnabled: false, swError: swError.message };
            }
        }

        return { success: true, swEnabled: false };
    } catch (error) {
        console.error('Push notification init error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get or register service worker
 */
async function getServiceWorkerRegistration() {
    if (swRegistration) return swRegistration;
    
    if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            return swRegistration;
        } catch (e) {
            console.warn('Could not register service worker:', e);
        }
    }
    return null;
}

/**
 * Save FCM token to user profile
 */
export async function saveFCMToken(userId, token) {
    if (!browser || !db || !userId || !token) return false;

    try {
        const tokenRef = ref(db, `users/${userId}/fcmTokens/${token.replace(/[.#$[\]]/g, '_')}`);
        await set(tokenRef, {
            token,
            createdAt: new Date().toISOString(),
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100)
        });
        return true;
    } catch (error) {
        console.error('Error saving FCM token:', error);
        return false;
    }
}

/**
 * Play notification sound
 */
export function playNotificationSound(type = 'default') {
    if (!browser) return;

    try {
        // Create audio context for better control
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            // Fallback to simple audio
            const audio = new Audio(NOTIFICATION_SOUNDS[type] || NOTIFICATION_SOUNDS.default);
            audio.volume = 0.5;
            audio.play().catch(() => {});
            return;
        }

        // Generate a simple notification beep using Web Audio API
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Different frequencies for different notification types
        const frequencies = {
            default: 800,
            urgent: 1000,
            success: 600,
            reminder: 700
        };

        oscillator.frequency.value = frequencies[type] || 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (error) {
        console.warn('Could not play notification sound:', error);
    }
}

/**
 * Trigger device vibration
 */
export function vibrateDevice(pattern = 'default') {
    if (!browser || !navigator.vibrate) return;

    try {
        const vibrationPattern = VIBRATION_PATTERNS[pattern] || VIBRATION_PATTERNS.default;
        navigator.vibrate(vibrationPattern);
    } catch (error) {
        console.warn('Vibration not supported:', error);
    }
}

/**
 * Show native OS push notification popup with sound and vibration
 */
export async function showPushNotification(options) {
    if (!browser) return false;

    const {
        title,
        body,
        icon = '/logo.png',
        badge = '/logo.png',
        tag = `notif-${Date.now()}`,
        data = {},
        sound = 'default',
        vibrate = 'default',
        requireInteraction = false,
        actions = [],
        silent = false
    } = options;

    try {
        // Check permission
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;
        }

        // Play sound (unless silent)
        if (!silent) {
            playNotificationSound(sound);
        }

        // Vibrate device (unless silent)
        if (!silent) {
            vibrateDevice(vibrate);
        }

        const notificationOptions = {
            body,
            icon,
            badge,
            tag,
            data: { ...data, url: data.url || '/' },
            requireInteraction,
            renotify: true, // Always show even if same tag
            vibrate: VIBRATION_PATTERNS[vibrate] || VIBRATION_PATTERNS.default,
            silent: silent
        };

        // Add actions if supported (only works with service worker)
        if (actions.length > 0) {
            notificationOptions.actions = actions;
        }

        // Try to show via Service Worker first (better support for native popups)
        const registration = await getServiceWorkerRegistration();
        
        if (registration) {
            await registration.showNotification(title, notificationOptions);
            console.log('Notification shown via Service Worker');
        } else {
            // Fallback to regular Notification API
            const notification = new Notification(title, {
                body,
                icon,
                badge,
                tag,
                data,
                requireInteraction,
                silent
            });

            // Handle click
            notification.onclick = () => {
                window.focus();
                if (data.url) {
                    window.location.href = data.url;
                }
                notification.close();
            };

            console.log('Notification shown via Notification API');
        }

        return true;
    } catch (error) {
        console.error('Error showing notification:', error);
        return false;
    }
}

/**
 * Get notification permission status
 */
export function getNotificationPermission() {
    if (!browser || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
    if (!browser || !('Notification' in window)) {
        return { granted: false, error: 'Notifications not supported' };
    }

    try {
        const permission = await Notification.requestPermission();
        return { granted: permission === 'granted', permission };
    } catch (error) {
        return { granted: false, error: error.message };
    }
}

/**
 * Check if push notifications are fully supported
 */
export function isPushSupported() {
    if (!browser) return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Subscribe to push notifications topic
 */
export async function subscribeToTopic(userId, topic) {
    if (!browser || !db) return false;

    try {
        const subscriptionRef = ref(db, `pushSubscriptions/${topic}/${userId}`);
        await set(subscriptionRef, {
            subscribedAt: new Date().toISOString(),
            active: true
        });
        return true;
    } catch (error) {
        console.error('Error subscribing to topic:', error);
        return false;
    }
}

/**
 * Unsubscribe from push notifications topic
 */
export async function unsubscribeFromTopic(userId, topic) {
    if (!browser || !db) return false;

    try {
        const subscriptionRef = ref(db, `pushSubscriptions/${topic}/${userId}`);
        await set(subscriptionRef, null);
        return true;
    } catch (error) {
        console.error('Error unsubscribing from topic:', error);
        return false;
    }
}
