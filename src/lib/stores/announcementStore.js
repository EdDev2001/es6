// src/lib/stores/announcementStore.js
// Svelte store for announcement state management

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
    getUserAnnouncements,
    getUserReadAnnouncements,
    markAnnouncementRead,
    getUnreadAnnouncementCount
} from '$lib/services/announcementService';

// Main announcement store
function createAnnouncementStore() {
    const { subscribe, set, update } = writable({
        announcements: [],
        readIds: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        lastFetch: null
    });

    return {
        subscribe,
        
        // Load announcements for user
        async loadAnnouncements(userId, userDepartment = null) {
            if (!browser || !userId) return;
            
            update(state => ({ ...state, isLoading: true, error: null }));
            
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
        
        // Clear store
        reset() {
            set({
                announcements: [],
                readIds: [],
                unreadCount: 0,
                isLoading: false,
                error: null,
                lastFetch: null
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
