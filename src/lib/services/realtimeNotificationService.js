// src/lib/services/realtimeNotificationService.js
// Real-time push notification service for instant announcement delivery

import { browser } from '$app/environment';
import { db, ref, onChildAdded, off, query, orderByChild, limitToLast } from '$lib/firebase';
import { showPushNotification, playNotificationSound, vibrateDevice } from '$lib/notifications/pushNotificationService';
import { toastStore } from '$lib/stores/toastStore';
import { writable } from 'svelte/store';

// Store for real-time notification state
export const realtimeNotificationStore = writable({
    isListening: false,
    lastNotification: null,
    connectionStatus: 'disconnected'
});

// Active listeners map
const activeListeners = new Map();

/**
 * Start listening for real-time notifications for a user
 * This will trigger instant push notifications when new announcements are published
 */
export function startNotificationListener(userId) {
    if (!browser || !db || !userId) return null;
    
    // Don't create duplicate listeners
    if (activeListeners.has(userId)) {
        console.log('Notification listener already active for user:', userId);
        return activeListeners.get(userId);
    }
    
    try {
        const notificationsRef = ref(db, `notifications/${userId}`);
        const recentQuery = query(notificationsRef, orderByChild('createdAt'), limitToLast(1));
        
        // Track the initial load to avoid showing old notifications
        let initialLoadComplete = false;
        let initialNotificationIds = new Set();
        
        const unsubscribe = onChildAdded(recentQuery, async (snapshot) => {
            const notification = { id: snapshot.key, ...snapshot.val() };
            
            // Skip notifications during initial load
            if (!initialLoadComplete) {
                initialNotificationIds.add(snapshot.key);
                // Mark initial load complete after a short delay
                setTimeout(() => {
                    initialLoadComplete = true;
                }, 1000);
                return;
            }
            
            // Skip if this was part of initial load
            if (initialNotificationIds.has(snapshot.key)) return;
            
            // Skip already read notifications
            if (notification.read) return;
            
            console.log('New real-time notification received:', notification);
            
            // Update store
            realtimeNotificationStore.update(state => ({
                ...state,
                lastNotification: notification
            }));

            // Show instant push notification (native OS notification)
            await showInstantNotification(notification);
            
            // Also show in-app toast for immediate visibility
            showInAppToast(notification);
        });
        
        // Store the unsubscribe function
        activeListeners.set(userId, unsubscribe);
        
        realtimeNotificationStore.update(state => ({
            ...state,
            isListening: true,
            connectionStatus: 'connected'
        }));
        
        console.log('Real-time notification listener started for user:', userId);
        return unsubscribe;
        
    } catch (error) {
        console.error('Error starting notification listener:', error);
        realtimeNotificationStore.update(state => ({
            ...state,
            connectionStatus: 'error'
        }));
        return null;
    }
}

/**
 * Stop listening for notifications
 */
export function stopNotificationListener(userId) {
    if (!userId) return;
    
    const unsubscribe = activeListeners.get(userId);
    if (unsubscribe) {
        // Firebase onChildAdded returns an unsubscribe function
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
        activeListeners.delete(userId);
        
        realtimeNotificationStore.update(state => ({
            ...state,
            isListening: false,
            connectionStatus: 'disconnected'
        }));
        
        console.log('Notification listener stopped for user:', userId);
    }
}

/**
 * Show instant push notification with sound and vibration
 */
async function showInstantNotification(notification) {
    if (!browser) return;
    
    const { type, title, body, content, priority, announcementId } = notification;
    
    // Determine notification urgency
    const isUrgent = type === 'emergency_alert' || priority === 'urgent' || priority === 'high';
    
    // Play sound based on priority
    const soundType = isUrgent ? 'urgent' : 'default';
    playNotificationSound(soundType);
    
    // Vibrate device
    const vibrationPattern = isUrgent ? 'urgent' : 'default';
    vibrateDevice(vibrationPattern);
    
    // Show native push notification
    await showPushNotification({
        title: title || 'New Announcement',
        body: body || content?.substring(0, 100) || 'You have a new notification',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `announcement-${announcementId || notification.id}`,
        data: {
            type,
            announcementId,
            url: announcementId ? `/announcements/${announcementId}` : '/announcements'
        },
        sound: soundType,
        vibrate: vibrationPattern,
        requireInteraction: isUrgent,
        silent: false
    });
}

/**
 * Show in-app toast notification for immediate visibility
 */
function showInAppToast(notification) {
    if (!browser) return;
    
    const { type, title, body, content, priority, announcementId } = notification;
    
    toastStore.announcement({
        title: title || 'New Announcement',
        body: body || content?.substring(0, 100) || 'You have a new notification',
        priority: priority || 'normal',
        announcementId
    });
}

/**
 * Listen for new announcements globally (for all users)
 * This is useful for admin monitoring
 */
export function startAnnouncementListener(callback) {
    if (!browser || !db) return null;
    
    const listenerKey = 'announcements-global';
    if (activeListeners.has(listenerKey)) {
        return activeListeners.get(listenerKey);
    }
    
    try {
        const announcementsRef = ref(db, 'announcements');
        const recentQuery = query(announcementsRef, orderByChild('createdAt'), limitToLast(1));
        
        let initialLoadComplete = false;
        
        const unsubscribe = onChildAdded(recentQuery, (snapshot) => {
            if (!initialLoadComplete) {
                setTimeout(() => { initialLoadComplete = true; }, 1000);
                return;
            }
            
            const announcement = { id: snapshot.key, ...snapshot.val() };
            
            // Only trigger for published announcements
            if (announcement.status === 'published') {
                console.log('New announcement published:', announcement.title);
                if (callback) callback(announcement);
            }
        });
        
        activeListeners.set(listenerKey, unsubscribe);
        return unsubscribe;
        
    } catch (error) {
        console.error('Error starting announcement listener:', error);
        return null;
    }
}

/**
 * Stop all active listeners
 */
export function stopAllListeners() {
    activeListeners.forEach((unsubscribe, key) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    activeListeners.clear();
    
    realtimeNotificationStore.set({
        isListening: false,
        lastNotification: null,
        connectionStatus: 'disconnected'
    });
}

export default {
    startNotificationListener,
    stopNotificationListener,
    startAnnouncementListener,
    stopAllListeners,
    realtimeNotificationStore
};
