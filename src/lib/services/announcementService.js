// src/lib/services/announcementService.js
// Complete Announcement Service with all Phase 4.1 features

import { browser } from '$app/environment';
import { db, ref, push, set, get, update, query, orderByChild, equalTo } from '$lib/firebase';

const ANNOUNCEMENTS_PATH = 'announcements';
const USER_ANNOUNCEMENTS_PATH = 'userAnnouncements';

/**
 * Announcement Types
 */
export const ANNOUNCEMENT_TYPES = {
    SCHOOL_WIDE: { id: 'school_wide', label: 'School-Wide', icon: '🏫', color: '#007AFF' },
    DEPARTMENT: { id: 'department', label: 'Department', icon: '🏢', color: '#5856D6' },
    EMERGENCY: { id: 'emergency', label: 'Emergency Alert', icon: '🚨', color: '#FF3B30' },
    SCHEDULED: { id: 'scheduled', label: 'Scheduled', icon: '📅', color: '#FF9500' }
};

/**
 * Priority Levels
 */
export const ANNOUNCEMENT_PRIORITIES = {
    LOW: { id: 'low', label: 'Low', color: '#8E8E93' },
    NORMAL: { id: 'normal', label: 'Normal', color: '#007AFF' },
    HIGH: { id: 'high', label: 'High', color: '#FF9500' },
    URGENT: { id: 'urgent', label: 'Urgent', color: '#FF3B30' }
};

/**
 * Notification Channels
 */
export const NOTIFICATION_CHANNELS = {
    IN_APP: 'in_app',
    PUSH: 'push',
    EMAIL: 'email'
};

/**
 * Get announcements for a user (filtered by department if applicable)
 */
export async function getUserAnnouncements(userId, userDepartment = null) {
    if (!browser || !db) throw new Error('Database not available');
    
    const announcementsRef = ref(db, ANNOUNCEMENTS_PATH);
    const snapshot = await get(announcementsRef);
    
    if (!snapshot.exists()) return [];
    
    const now = new Date();
    const announcements = [];
    
    snapshot.forEach((child) => {
        const announcement = { id: child.key, ...child.val() };
        
        // Filter out expired announcements
        if (announcement.expiresAt && new Date(announcement.expiresAt) < now) {
            return;
        }
        
        // Filter scheduled announcements not yet published
        if (announcement.scheduledAt && new Date(announcement.scheduledAt) > now) {
            return;
        }
        
        // Filter by department if it's a department announcement
        if (announcement.type === 'department' && announcement.targetDepartment) {
            if (userDepartment && announcement.targetDepartment !== userDepartment) {
                return;
            }
        }
        
        // Check if announcement is active
        if (announcement.status !== 'published' && announcement.status !== 'active') {
            return;
        }
        
        announcements.push(announcement);
    });
    
    // Sort by priority (urgent first) then by date
    return announcements.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/**
 * Mark announcement as read by user
 */
export async function markAnnouncementRead(userId, announcementId) {
    if (!browser || !db) throw new Error('Database not available');
    
    const userAnnouncementRef = ref(db, `${USER_ANNOUNCEMENTS_PATH}/${userId}/${announcementId}`);
    await set(userAnnouncementRef, {
        readAt: new Date().toISOString(),
        announcementId
    });
}

/**
 * Get user's read announcements
 */
export async function getUserReadAnnouncements(userId) {
    if (!browser || !db) throw new Error('Database not available');
    
    const userAnnouncementsRef = ref(db, `${USER_ANNOUNCEMENTS_PATH}/${userId}`);
    const snapshot = await get(userAnnouncementsRef);
    
    if (!snapshot.exists()) return [];
    
    const readAnnouncements = [];
    snapshot.forEach((child) => {
        readAnnouncements.push(child.key);
    });
    
    return readAnnouncements;
}

/**
 * Get unread announcement count for user
 */
export async function getUnreadAnnouncementCount(userId, userDepartment = null) {
    const [announcements, readIds] = await Promise.all([
        getUserAnnouncements(userId, userDepartment),
        getUserReadAnnouncements(userId)
    ]);
    
    return announcements.filter(a => !readIds.includes(a.id)).length;
}
