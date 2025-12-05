// src/lib/security/deviceFingerprint.js
// Zero-Trust Security: Device fingerprinting and session binding
import { browser } from '$app/environment';

/**
 * Generate a unique device fingerprint based on browser/device characteristics
 * @returns {Promise<string>} Device fingerprint hash
 */
export async function generateDeviceFingerprint() {
    if (!browser) return null;
    
    const components = [];
    
    // Screen properties
    components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(`availScreen:${screen.availWidth}x${screen.availHeight}`);
    
    // Timezone
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    components.push(`tzOffset:${new Date().getTimezoneOffset()}`);
    
    // Language
    components.push(`lang:${navigator.language}`);
    components.push(`langs:${navigator.languages?.join(',') || ''}`);
    
    // Platform info
    components.push(`platform:${navigator.platform}`);
    components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
    components.push(`memory:${navigator.deviceMemory || 'unknown'}`);
    
    // Touch support
    components.push(`touch:${navigator.maxTouchPoints || 0}`);
    
    // WebGL fingerprint
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                components.push(`gpu:${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`);
            }
        }
    } catch (e) { /* ignore */ }
    
    // Canvas fingerprint
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        components.push(`canvas:${canvas.toDataURL().slice(-50)}`);
    } catch (e) { /* ignore */ }
    
    // Audio context fingerprint
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        components.push(`audio:${audioCtx.sampleRate}`);
        audioCtx.close();
    } catch (e) { /* ignore */ }
    
    const fingerprintString = components.join('|');
    return await hashString(fingerprintString);
}

/**
 * Hash a string using SHA-256
 * @param {string} str - String to hash
 * @returns {Promise<string>} Hex hash
 */
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get device info for session binding
 * @returns {Promise<object>} Device information
 */
export async function getDeviceInfo() {
    if (!browser) return null;
    
    const fingerprint = await generateDeviceFingerprint();
    const ua = navigator.userAgent;
    
    return {
        fingerprint,
        userAgent: ua,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isMobile: /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(ua),
        browser: detectBrowser(ua),
        timestamp: new Date().toISOString()
    };
}

/**
 * Detect browser from user agent
 * @param {string} ua - User agent string
 * @returns {object} Browser info
 */
function detectBrowser(ua) {
    let name = 'Unknown', version = 'Unknown';
    
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
        name = 'Chrome';
        version = (ua.match(/Chrome\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
        name = 'Firefox';
        version = (ua.match(/Firefox\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        name = 'Safari';
        version = (ua.match(/Version\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (ua.includes('Edg')) {
        name = 'Edge';
        version = (ua.match(/Edg\/([\d.]+)/) || [])[1] || 'Unknown';
    }
    
    return { name, version };
}

/**
 * Validate device fingerprint against stored fingerprint
 * @param {string} storedFingerprint - Previously stored fingerprint
 * @param {string} currentFingerprint - Current device fingerprint
 * @param {number} tolerance - Allowed difference threshold (0-1)
 * @returns {boolean} Whether device is trusted
 */
export function validateDeviceFingerprint(storedFingerprint, currentFingerprint, tolerance = 0) {
    if (!storedFingerprint || !currentFingerprint) return false;
    return storedFingerprint === currentFingerprint;
}

/**
 * Store trusted device in local storage
 * @param {string} userId - User ID
 * @param {object} deviceInfo - Device information
 */
export function storeTrustedDevice(userId, deviceInfo) {
    if (!browser) return;
    
    const key = `trusted_devices_${userId}`;
    const devices = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Check if device already exists
    const existingIndex = devices.findIndex(d => d.fingerprint === deviceInfo.fingerprint);
    
    if (existingIndex >= 0) {
        devices[existingIndex].lastUsed = new Date().toISOString();
        devices[existingIndex].useCount = (devices[existingIndex].useCount || 0) + 1;
    } else {
        devices.push({
            ...deviceInfo,
            addedAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            useCount: 1
        });
    }
    
    // Keep only last 5 devices
    const sortedDevices = devices.sort((a, b) => 
        new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    ).slice(0, 5);
    
    localStorage.setItem(key, JSON.stringify(sortedDevices));
}

/**
 * Check if current device is trusted
 * @param {string} userId - User ID
 * @param {string} fingerprint - Current device fingerprint
 * @returns {boolean} Whether device is trusted
 */
export function isDeviceTrusted(userId, fingerprint) {
    if (!browser) return false;
    
    const key = `trusted_devices_${userId}`;
    const devices = JSON.parse(localStorage.getItem(key) || '[]');
    
    return devices.some(d => d.fingerprint === fingerprint);
}

/**
 * Get all trusted devices for a user
 * @param {string} userId - User ID
 * @returns {Array} List of trusted devices
 */
export function getTrustedDevices(userId) {
    if (!browser) return [];
    
    const key = `trusted_devices_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

/**
 * Remove a trusted device
 * @param {string} userId - User ID
 * @param {string} fingerprint - Device fingerprint to remove
 */
export function removeTrustedDevice(userId, fingerprint) {
    if (!browser) return;
    
    const key = `trusted_devices_${userId}`;
    const devices = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = devices.filter(d => d.fingerprint !== fingerprint);
    localStorage.setItem(key, JSON.stringify(filtered));
}
