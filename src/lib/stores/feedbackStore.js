// src/lib/stores/feedbackStore.js
// Svelte store for feedback state management

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import {
    getUserFeedback,
    getUserFeedbackNotifications,
    getUnreadNotificationCount,
    submitFeedback,
    markNotificationRead,
    FEEDBACK_STATUS
} from '$lib/services/feedbackService';

// Main feedback store
function createFeedbackStore() {
    const { subscribe, set, update } = writable({
        feedbackList: [],
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        lastFetch: null
    });

    return {
        subscribe,
        
        // Load user's feedback from Firebase
        async loadFeedback(userId) {
            if (!browser || !userId) return;
            
            update(state => ({ ...state, isLoading: true, error: null }));
            
            try {
                const [feedbackList, notifications] = await Promise.all([
                    getUserFeedback(userId),
                    getUserFeedbackNotifications(userId)
                ]);
                
                const unreadCount = notifications.filter(n => !n.read).length;
                
                update(state => ({
                    ...state,
                    feedbackList,
                    notifications,
                    unreadCount,
                    isLoading: false,
                    lastFetch: new Date().toISOString()
                }));
            } catch (error) {
                console.error('Error loading feedback:', error);
                update(state => ({
                    ...state,
                    isLoading: false,
                    error: error.message
                }));
            }
        },
        
        // Submit new feedback
        async submit(userId, feedbackData) {
            if (!browser || !userId) throw new Error('Not authenticated');
            
            update(state => ({ ...state, isLoading: true, error: null }));
            
            try {
                const result = await submitFeedback(userId, feedbackData);
                
                // Refresh feedback list
                const feedbackList = await getUserFeedback(userId);
                
                update(state => ({
                    ...state,
                    feedbackList,
                    isLoading: false
                }));
                
                return result;
            } catch (error) {
                console.error('Error submitting feedback:', error);
                update(state => ({
                    ...state,
                    isLoading: false,
                    error: error.message
                }));
                throw error;
            }
        },
        
        // Mark notification as read
        async markRead(userId, notificationId) {
            if (!browser || !userId) return;
            
            try {
                await markNotificationRead(userId, notificationId);
                
                update(state => ({
                    ...state,
                    notifications: state.notifications.map(n =>
                        n.id === notificationId ? { ...n, read: true } : n
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1)
                }));
            } catch (error) {
                console.error('Error marking notification read:', error);
            }
        },
        
        // Clear store
        reset() {
            set({
                feedbackList: [],
                notifications: [],
                unreadCount: 0,
                isLoading: false,
                error: null,
                lastFetch: null
            });
        }
    };
}

export const feedbackStore = createFeedbackStore();

// Derived stores for filtered views
export const pendingFeedback = derived(feedbackStore, $store =>
    $store.feedbackList.filter(f => f.status === 'pending')
);

export const inProgressFeedback = derived(feedbackStore, $store =>
    $store.feedbackList.filter(f => f.status === 'in_progress')
);

export const resolvedFeedback = derived(feedbackStore, $store =>
    $store.feedbackList.filter(f => f.status === 'resolved' || f.status === 'closed')
);
