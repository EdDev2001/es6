// src/lib/stores/toastStore.js
// Global toast notification store for real-time announcements

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createToastStore() {
    const { subscribe, update } = writable([]);
    
    return {
        subscribe,
        
        // Add a toast notification
        show({ title, body, type = 'info', duration = 5000, onClick = null, data = {} }) {
            const id = Date.now() + Math.random();
            const toast = { id, title, body, type, onClick, data, createdAt: new Date() };
            
            update(toasts => [...toasts, toast]);
            
            // Auto-remove after duration (unless duration is 0 for persistent)
            if (duration > 0) {
                setTimeout(() => {
                    this.dismiss(id);
                }, duration);
            }
            
            return id;
        },
        
        // Show announcement notification
        announcement({ title, body, priority = 'normal', announcementId = null }) {
            const type = priority === 'urgent' || priority === 'high' ? 'urgent' : 'announcement';
            const duration = type === 'urgent' ? 10000 : 6000;
            
            return this.show({
                title: `📢 ${title}`,
                body,
                type,
                duration,
                data: { announcementId },
                onClick: announcementId ? () => {
                    if (browser) window.location.href = `/app/announcements`;
                } : null
            });
        },
        
        // Show success toast
        success(title, body = '') {
            return this.show({ title, body, type: 'success', duration: 4000 });
        },
        
        // Show error toast
        error(title, body = '') {
            return this.show({ title, body, type: 'error', duration: 6000 });
        },
        
        // Show warning toast
        warning(title, body = '') {
            return this.show({ title, body, type: 'warning', duration: 5000 });
        },
        
        // Dismiss a specific toast
        dismiss(id) {
            update(toasts => toasts.filter(t => t.id !== id));
        },
        
        // Clear all toasts
        clear() {
            update(() => []);
        }
    };
}

export const toastStore = createToastStore();
