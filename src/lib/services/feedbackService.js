// src/lib/services/feedbackService.js
// Firebase Feedback Service - Real database operations

import { browser } from '$app/environment';
import { 
    db, ref, push, set, get, query, orderByChild, equalTo, update 
} from '$lib/firebase';

const FEEDBACK_PATH = 'feedback';
const USER_FEEDBACK_PATH = 'userFeedback'; // User-specific feedback index
const FEEDBACK_NOTIFICATIONS_PATH = 'feedbackNotifications';

/**
 * Feedback Categories/Types with icons and colors
 * Types: bug, request, ui, performance, suggestion
 */
export const FEEDBACK_CATEGORIES = [
    { id: 'bug', label: 'Bug Report', icon: '🐞', color: '#FF3B30', description: 'Report errors or crashes' },
    { id: 'request', label: 'Feature Request', icon: '💡', color: '#FFCC00', description: 'Suggest new features' },
    { id: 'ui', label: 'UI/UX Issue', icon: '🎨', color: '#AF52DE', description: 'Design or usability problems' },
    { id: 'performance', label: 'Performance', icon: '🚀', color: '#FF9500', description: 'Speed or loading issues' },
    { id: 'suggestion', label: 'General Suggestion', icon: '✨', color: '#34C759', description: 'Other improvements' }
];

/**
 * Feedback Status definitions
 */
export const FEEDBACK_STATUS = {
    pending: { label: 'Sent', color: '#34C759', progress: 25 },
    in_progress: { label: 'In Progress', color: '#007AFF', progress: 50 },
    resolved: { label: 'Resolved', color: '#34C759', progress: 100 },
    closed: { label: 'Closed', color: '#8E8E93', progress: 100 }
};

/**
 * Priority levels: low, medium, high
 */
export const PRIORITY_LEVELS = [
    { id: 'low', label: 'Low', color: '#8E8E93' },
    { id: 'medium', label: 'Medium', color: '#007AFF' },
    { id: 'high', label: 'High', color: '#FF3B30' }
];

/**
 * Generate unique ticket ID
 */
function generateTicketId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FB-${timestamp}-${random}`;
}

/**
 * Get comprehensive device and browser info
 */
function getDeviceInfo() {
    if (!browser) return {};
    
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = '';
    let osName = 'Unknown';
    let osVersion = '';
    let deviceType = 'Desktop';
    
    // Detect browser and version
    if (ua.includes('Chrome/')) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Firefox/')) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
        browserName = 'Safari';
        browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Edg/')) {
        browserName = 'Edge';
        browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || '';
    }
    
    // Detect OS and version
    if (ua.includes('Windows NT 10')) { osName = 'Windows'; osVersion = '10/11'; }
    else if (ua.includes('Windows')) { osName = 'Windows'; }
    else if (ua.includes('Mac OS X')) { 
        osName = 'macOS'; 
        osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
    }
    else if (ua.includes('Linux')) osName = 'Linux';
    else if (ua.includes('Android')) { 
        osName = 'Android'; 
        osVersion = ua.match(/Android (\d+)/)?.[1] || '';
        deviceType = 'Mobile';
    }
    else if (ua.includes('iPhone')) { 
        osName = 'iOS'; 
        osVersion = ua.match(/OS (\d+)/)?.[1] || '';
        deviceType = 'Mobile';
    }
    else if (ua.includes('iPad')) { 
        osName = 'iPadOS'; 
        osVersion = ua.match(/OS (\d+)/)?.[1] || '';
        deviceType = 'Tablet';
    }
    
    // Detect device type
    if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'Mobile';
    else if (/iPad|Tablet/i.test(ua)) deviceType = 'Tablet';
    
    return {
        browser: browserName,
        browserVersion,
        platform: osName,
        platformVersion: osVersion,
        deviceType,
        userAgent: ua,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled
    };
}

/**
 * Submit new feedback to Firebase
 * Supports: type (bug/request/ui/performance/suggestion), priority (low/medium/high), screenshot, device info
 */
export async function submitFeedback(userId, feedbackData) {
    if (!browser || !db) throw new Error('Database not available');
    
    const ticketId = generateTicketId();
    const deviceInfo = getDeviceInfo();
    
    const feedback = {
        ticketId,
        userId,
        // Type/category of feedback
        type: feedbackData.category || feedbackData.type || 'suggestion',
        category: feedbackData.category || feedbackData.type || 'suggestion', // Keep for backwards compat
        // Content
        title: feedbackData.title || feedbackData.subject || '',
        subject: feedbackData.title || feedbackData.subject || '',
        message: feedbackData.description || feedbackData.message || '',
        description: feedbackData.description || feedbackData.message || '', // Keep for backwards compat
        // Priority: low, medium, high
        priority: feedbackData.priority || 'medium',
        // Optional rating 1-5
        rating: feedbackData.rating || null,
        // Screenshot URL or base64
        screenshotUrl: feedbackData.screenshot || feedbackData.screenshotUrl || null,
        screenshot: feedbackData.screenshot || null, // Keep for backwards compat
        // Device information
        deviceInfo,
        // Status tracking
        status: 'pending',
        // Assignment
        assignedTo: null,
        assignedAt: null,
        // Replies from admin
        replies: [],
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null
    };
    
    // Save to main feedback collection
    const feedbackRef = ref(db, FEEDBACK_PATH);
    const newFeedbackRef = push(feedbackRef);
    const feedbackId = newFeedbackRef.key;
    await set(newFeedbackRef, feedback);
    
    // Also save reference under user's feedback path for easy querying
    const userFeedbackRef = ref(db, `${USER_FEEDBACK_PATH}/${userId}/${feedbackId}`);
    await set(userFeedbackRef, {
        ticketId,
        type: feedback.type,
        category: feedback.category,
        title: feedback.title,
        description: feedback.description,
        rating: feedback.rating,
        status: 'pending',
        priority: feedback.priority,
        replies: [],
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt
    });
    
    return {
        id: feedbackId,
        ticketId,
        estimatedResponse: feedback.priority === 'high' ? '12-24 hours' : '24-72 hours'
    };
}

/**
 * Get all feedback for a specific user
 */
export async function getUserFeedback(userId) {
    if (!browser || !db) throw new Error('Database not available');
    
    // Read from user-specific feedback path (no query needed)
    const userFeedbackRef = ref(db, `${USER_FEEDBACK_PATH}/${userId}`);
    const snapshot = await get(userFeedbackRef);
    
    if (!snapshot.exists()) return [];
    
    const feedbackList = [];
    snapshot.forEach((child) => {
        feedbackList.push({
            id: child.key,
            ...child.val()
        });
    });
    
    // Sort by createdAt descending
    return feedbackList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Get single feedback by ID
 */
export async function getFeedbackById(feedbackId) {
    if (!browser || !db) throw new Error('Database not available');
    
    const feedbackRef = ref(db, `${FEEDBACK_PATH}/${feedbackId}`);
    const snapshot = await get(feedbackRef);
    
    if (!snapshot.exists()) return null;
    
    return {
        id: feedbackId,
        ...snapshot.val()
    };
}

/**
 * Get user's feedback notifications
 */
export async function getUserFeedbackNotifications(userId) {
    if (!browser || !db) throw new Error('Database not available');
    
    const notifRef = ref(db, `${FEEDBACK_NOTIFICATIONS_PATH}/${userId}`);
    const snapshot = await get(notifRef);
    
    if (!snapshot.exists()) return [];
    
    const notifications = [];
    snapshot.forEach((child) => {
        notifications.push({
            id: child.key,
            ...child.val()
        });
    });
    
    return notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(userId, notificationId) {
    if (!browser || !db) throw new Error('Database not available');
    
    const notifRef = ref(db, `${FEEDBACK_NOTIFICATIONS_PATH}/${userId}/${notificationId}`);
    await update(notifRef, { read: true });
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId) {
    const notifications = await getUserFeedbackNotifications(userId);
    return notifications.filter(n => !n.read).length;
}

/**
 * AI-powered category suggestion based on text
 */
export function suggestCategory(text) {
    const lowerText = text.toLowerCase();
    
    const keywords = {
        bug: ['error', 'crash', 'bug', 'broken', 'not working', 'issue', 'problem', 'fail', 'doesn\'t work', 'won\'t load'],
        request: ['feature', 'add', 'would be nice', 'request', 'want', 'need', 'wish', 'could you', 'please add'],
        ui: ['design', 'ui', 'ux', 'layout', 'button', 'color', 'font', 'look', 'ugly', 'confusing', 'hard to find', 'interface'],
        performance: ['slow', 'loading', 'speed', 'lag', 'freeze', 'performance', 'takes too long', 'stuck', 'hang'],
        suggestion: ['suggest', 'idea', 'improve', 'better', 'feedback', 'opinion', 'think', 'recommend']
    };
    
    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => lowerText.includes(word))) {
            return category;
        }
    }
    
    return 'suggestion';
}

/**
 * Quick feedback options
 */
export const QUICK_FEEDBACK_OPTIONS = [
    { id: 'bug', label: 'Report a Bug', icon: '🐞', category: 'bug' },
    { id: 'request', label: 'Request Feature', icon: '💡', category: 'request' },
    { id: 'suggest', label: 'Give Suggestion', icon: '✨', category: 'suggestion' }
];
