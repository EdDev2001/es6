// Notifications utility for managing user alerts
import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, push, set, get, update, query, orderByChild, limitToLast } from 'firebase/database';

/**
 * Notification types
 */
export const NotificationType = {
    ABSENCE: 'absence',
    LATE: 'late',
    SCHEDULE: 'schedule',
    DEVICE: 'device',
    GENERAL: 'general'
};

/**
 * Send a notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - Notification data
 */
export async function sendNotification(userId, { type, title, message }) {
    if (!browser || !db) return null;
    
    try {
        const notifRef = ref(db, `notifications/${userId}`);
        const newNotifRef = push(notifRef);
        
        await set(newNotifRef, {
            type: type || NotificationType.GENERAL,
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false
        });
        
        return newNotifRef.key;
    } catch (error) {
        console.error('Error sending notification:', error);
        return null;
    }
}

/**
 * Get user's notifications
 * @param {string} userId - User ID
 * @param {number} limit - Max notifications to fetch
 */
export async function getNotifications(userId, limit = 20) {
    if (!browser || !db) return [];
    
    try {
        const notifRef = ref(db, `notifications/${userId}`);
        const notifQuery = query(notifRef, orderByChild('timestamp'), limitToLast(limit));
        const snapshot = await get(notifQuery);
        
        if (!snapshot.exists()) return [];
        
        const notifications = [];
        snapshot.forEach(child => {
            notifications.push({ id: child.key, ...child.val() });
        });
        
        return notifications.reverse();
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 */
export async function markAsRead(userId, notificationId) {
    if (!browser || !db) return false;
    
    try {
        const notifRef = ref(db, `notifications/${userId}/${notificationId}`);
        await update(notifRef, { read: true });
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

/**
 * Mark all notifications as read
 * @param {string} userId - User ID
 */
export async function markAllAsRead(userId) {
    if (!browser || !db) return false;
    
    try {
        const notifications = await getNotifications(userId, 100);
        const updates = {};
        
        notifications.forEach(notif => {
            if (!notif.read) {
                updates[`notifications/${userId}/${notif.id}/read`] = true;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
        }
        
        return true;
    } catch (error) {
        console.error('Error marking all as read:', error);
        return false;
    }
}

/**
 * Get unread notification count
 * @param {string} userId - User ID
 */
export async function getUnreadCount(userId) {
    if (!browser || !db) return 0;
    
    try {
        const notifications = await getNotifications(userId, 100);
        return notifications.filter(n => !n.read).length;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

/**
 * Delete a notification
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 */
export async function deleteNotification(userId, notificationId) {
    if (!browser || !db) return false;
    
    try {
        const notifRef = ref(db, `notifications/${userId}/${notificationId}`);
        await set(notifRef, null);
        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        return false;
    }
}

/**
 * Clear all notifications for a user
 * @param {string} userId - User ID
 */
export async function clearAllNotifications(userId) {
    if (!browser || !db) return false;
    
    try {
        const notifRef = ref(db, `notifications/${userId}`);
        await set(notifRef, null);
        return true;
    } catch (error) {
        console.error('Error clearing notifications:', error);
        return false;
    }
}

// Pre-defined notification templates
export const NotificationTemplates = {
    absence: (date) => ({
        type: NotificationType.ABSENCE,
        title: 'Absence Recorded',
        message: `You were marked absent on ${date}. Contact your instructor if this is incorrect.`
    }),
    late: (minutes) => ({
        type: NotificationType.LATE,
        title: 'Late Check-in',
        message: `You checked in ${minutes} minutes late today. Try to arrive on time.`
    }),
    scheduleChange: (details) => ({
        type: NotificationType.SCHEDULE,
        title: 'Schedule Update',
        message: details
    }),
    newDevice: (deviceInfo) => ({
        type: NotificationType.DEVICE,
        title: 'New Device Login',
        message: `Your account was accessed from a new device: ${deviceInfo}`
    })
};
