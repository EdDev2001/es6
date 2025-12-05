// src/lib/security/sessionManager.js
// Zero-Trust Security: Session management with device and location binding
import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, set, get, update, onValue, off } from 'firebase/database';
import { generateDeviceFingerprint, getDeviceInfo } from './deviceFingerprint.js';

const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

/**
 * Session data structure
 * @typedef {Object} SessionData
 * @property {string} sessionId - Unique session identifier
 * @property {string} userId - User ID
 * @property {string} deviceFingerprint - Device fingerprint
 * @property {object} deviceInfo - Device information
 * @property {object} location - Location at session start
 * @property {string} createdAt - Session creation timestamp
 * @property {string} lastActivity - Last activity timestamp
 * @property {string} status - Session status (active, expired, revoked)
 */

/**
 * Create a new secure session
 * @param {string} userId - User ID
 * @param {object} location - User's location
 * @returns {Promise<SessionData>} Session data
 */
export async function createSecureSession(userId, location = null) {
    if (!browser || !db) return null;
    
    try {
        const deviceInfo = await getDeviceInfo();
        const sessionId = generateSessionId();
        
        const sessionData = {
            sessionId,
            userId,
            deviceFingerprint: deviceInfo.fingerprint,
            deviceInfo: {
                browser: deviceInfo.browser,
                platform: deviceInfo.platform,
                isMobile: deviceInfo.isMobile,
                screenResolution: deviceInfo.screenResolution
            },
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
                name: location.name || 'Unknown'
            } : null,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            status: 'active'
        };
        
        // Store session in Firebase
        const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);
        await set(sessionRef, sessionData);
        
        // Store current session ID locally
        localStorage.setItem(`current_session_${userId}`, sessionId);
        
        // Start activity monitoring
        startActivityMonitor(userId, sessionId);
        
        return sessionData;
    } catch (error) {
        console.error('Error creating secure session:', error);
        return null;
    }
}

/**
 * Generate unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}`;
}

/**
 * Validate current session
 * @param {string} userId - User ID
 * @returns {Promise<object>} Validation result
 */
export async function validateSession(userId) {
    if (!browser || !db) return { valid: false, reason: 'not_browser' };
    
    try {
        const currentSessionId = localStorage.getItem(`current_session_${userId}`);
        if (!currentSessionId) {
            return { valid: false, reason: 'no_session' };
        }
        
        const sessionRef = ref(db, `sessions/${userId}/${currentSessionId}`);
        const snapshot = await get(sessionRef);
        
        if (!snapshot.exists()) {
            return { valid: false, reason: 'session_not_found' };
        }
        
        const sessionData = snapshot.val();
        
        // Check session status
        if (sessionData.status !== 'active') {
            return { valid: false, reason: 'session_revoked' };
        }
        
        // Check session timeout
        const lastActivity = new Date(sessionData.lastActivity).getTime();
        if (Date.now() - lastActivity > SESSION_TIMEOUT) {
            await expireSession(userId, currentSessionId);
            return { valid: false, reason: 'session_expired' };
        }
        
        // Validate device fingerprint
        const currentFingerprint = await generateDeviceFingerprint();
        if (sessionData.deviceFingerprint !== currentFingerprint) {
            return { 
                valid: false, 
                reason: 'device_mismatch',
                suspicious: true
            };
        }
        
        return { valid: true, session: sessionData };
    } catch (error) {
        console.error('Error validating session:', error);
        return { valid: false, reason: 'validation_error' };
    }
}

/**
 * Update session activity
 * @param {string} userId - User ID
 */
export async function updateSessionActivity(userId) {
    if (!browser || !db) return;
    
    try {
        const currentSessionId = localStorage.getItem(`current_session_${userId}`);
        if (!currentSessionId) return;
        
        const sessionRef = ref(db, `sessions/${userId}/${currentSessionId}`);
        await update(sessionRef, {
            lastActivity: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating session activity:', error);
    }
}

/**
 * Expire a session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 */
export async function expireSession(userId, sessionId) {
    if (!browser || !db) return;
    
    try {
        const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);
        await update(sessionRef, {
            status: 'expired',
            expiredAt: new Date().toISOString()
        });
        
        const currentSessionId = localStorage.getItem(`current_session_${userId}`);
        if (currentSessionId === sessionId) {
            localStorage.removeItem(`current_session_${userId}`);
        }
    } catch (error) {
        console.error('Error expiring session:', error);
    }
}

/**
 * Revoke a session (security action)
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {string} reason - Revocation reason
 */
export async function revokeSession(userId, sessionId, reason = 'manual') {
    if (!browser || !db) return;
    
    try {
        const sessionRef = ref(db, `sessions/${userId}/${sessionId}`);
        await update(sessionRef, {
            status: 'revoked',
            revokedAt: new Date().toISOString(),
            revokeReason: reason
        });
        
        const currentSessionId = localStorage.getItem(`current_session_${userId}`);
        if (currentSessionId === sessionId) {
            localStorage.removeItem(`current_session_${userId}`);
        }
    } catch (error) {
        console.error('Error revoking session:', error);
    }
}

/**
 * Revoke all sessions for a user
 * @param {string} userId - User ID
 * @param {string} exceptSessionId - Session ID to keep active
 */
export async function revokeAllSessions(userId, exceptSessionId = null) {
    if (!browser || !db) return;
    
    try {
        const sessionsRef = ref(db, `sessions/${userId}`);
        const snapshot = await get(sessionsRef);
        
        if (!snapshot.exists()) return;
        
        const sessions = snapshot.val();
        const updates = {};
        
        Object.keys(sessions).forEach(sessionId => {
            if (sessionId !== exceptSessionId && sessions[sessionId].status === 'active') {
                updates[`${sessionId}/status`] = 'revoked';
                updates[`${sessionId}/revokedAt`] = new Date().toISOString();
                updates[`${sessionId}/revokeReason`] = 'all_sessions_revoked';
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(sessionsRef, updates);
        }
    } catch (error) {
        console.error('Error revoking all sessions:', error);
    }
}

/**
 * Get active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of active sessions
 */
export async function getActiveSessions(userId) {
    if (!browser || !db) return [];
    
    try {
        const sessionsRef = ref(db, `sessions/${userId}`);
        const snapshot = await get(sessionsRef);
        
        if (!snapshot.exists()) return [];
        
        const sessions = snapshot.val();
        return Object.values(sessions)
            .filter(s => s.status === 'active')
            .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    } catch (error) {
        console.error('Error getting active sessions:', error);
        return [];
    }
}

// Activity monitor interval reference
let activityMonitorInterval = null;

/**
 * Start activity monitoring
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 */
function startActivityMonitor(userId, sessionId) {
    if (!browser) return;
    
    // Clear existing monitor
    if (activityMonitorInterval) {
        clearInterval(activityMonitorInterval);
    }
    
    // Update activity on user interactions
    const updateActivity = () => updateSessionActivity(userId);
    
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('scroll', updateActivity);
    
    // Periodic activity check
    activityMonitorInterval = setInterval(async () => {
        const validation = await validateSession(userId);
        if (!validation.valid) {
            // Session invalid - trigger logout
            window.dispatchEvent(new CustomEvent('session-invalid', { 
                detail: { reason: validation.reason }
            }));
        }
    }, ACTIVITY_CHECK_INTERVAL);
}

/**
 * Stop activity monitoring
 */
export function stopActivityMonitor() {
    if (activityMonitorInterval) {
        clearInterval(activityMonitorInterval);
        activityMonitorInterval = null;
    }
}
