// src/lib/stores/announcementStore.js
// Svelte store for announcement state management with real-time support

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
    getUserAnnouncements,
    getUserReadAnnouncements,
    markAnnouncementRead,
    getUnreadAnnouncementCount
} from '$lib/services/announcementService';
import {
    startNotificationListener,
    stopNotificationListener,
    realtimeNotificationStore
} from '$lib/services/realtimeNotificationService';

// Main announcement store
function createAnnouncementStore() {
    const { subscribe, set, update } = writable({
        announcements: [],
        readIds: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        lastFetch: null,
        isRealtimeActive: false,
        currentUserId: null
    });

    // Subscribe to real-time notifications to auto-refresh
    let realtimeUnsubscribe = null;
    if (browser) {
        realtimeUnsubscribe = realtimeNotificationStore.subscribe(rtState => {
            if (rtState.lastNotification) {
                // Auto-refresh when new notification arrives
                update(state => {
                    if (state.currentUserId) {
                        // Trigger a refresh
                        setTimeout(() => {
                            announcementStore.loadAnnouncements(state.currentUserId);
                        }, 500);
                    }
                    return state;
                });
            }
        });
    }

    return {
        subscribe,
        
        // Load announcements for user and start real-time listener
        async loadAnnouncements(userId, userDepartment = null) {
            if (!browser || !userId) return;
            
            update(state => ({ ...state, isLoading: true, error: null, currentUserId: userId }));
            
            try {
                const [announcements, readIds] = await Promise.all([
                    getUserAnnouncements(userId, userDepartment),
                    getUserReadAnnouncements(userId)
                ]);
                
                const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;
                
                update(state => ({
                    ...state,
                    announcements,
                    readIds,
                    unreadCount,
                    isLoading: false,
                    lastFetch: new Date().toISOString()
                }));
            } catch (error) {
                console.error('Error loading announcements:', error);
                update(state => ({
                    ...state,
                    isLoading: false,
                    error: error.message
                }));
            }
        },
        
        // Start real-time notification listener for instant push notifications
        startRealtimeListener(userId) {
            if (!browser || !userId) return;
            
            startNotificationListener(userId);
            update(state => ({ ...state, isRealtimeActive: true, currentUserId: userId }));
            console.log('Real-time announcement notifications enabled for user:', userId);
        },
        
        // Stop real-time listener
        stopRealtimeListener(userId) {
            if (!browser) return;
            
            stopNotificationListener(userId);
            update(state => ({ ...state, isRealtimeActive: false }));
        },
        
        // Mark announcement as read
        async markRead(userId, announcementId) {
            if (!browser || !userId) return;
            
            try {
                await markAnnouncementRead(userId, announcementId);
                
                update(state => ({
                    ...state,
                    readIds: [...state.readIds, announcementId],
                    unreadCount: Math.max(0, state.unreadCount - 1)
                }));
            } catch (error) {
                console.error('Error marking announcement read:', error);
            }
        },
        
        // Clear store and stop listeners
        reset() {
            update(state => {
                if (state.currentUserId) {
                    stopNotificationListener(state.currentUserId);
                }
                return {
                    announcements: [],
                    readIds: [],
                    unreadCount: 0,
                    isLoading: false,
                    error: null,
                    lastFetch: null,
                    isRealtimeActive: false,
                    currentUserId: null
                };
            });
        }
    };
}

export const announcementStore = createAnnouncementStore();

// Derived stores
export const unreadAnnouncements = derived(announcementStore, $store =>
    $store.announcements.filter(a => !$store.readIds.includes(a.id))
);

export const emergencyAnnouncements = derived(announcementStore, $store =>
    $store.announcements.filter(a => a.type === 'emergency' || a.priority === 'urgent')
);

export const regularAnnouncements = derived(announcementStore, $store =>
    $store.announcements.filter(a => a.type !== 'emergency' && a.priority !== 'urgent')
);
