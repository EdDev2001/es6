// src/lib/security/geofence.js
// Smart Location Validation: Campus geofence system
import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, get, set } from 'firebase/database';

/**
 * Default campus zones - can be configured per organization
 * Each zone has a center point and radius in meters
 */
const DEFAULT_CAMPUS_ZONES = [
    {
        id: 'main_campus',
        name: 'Main Campus',
        latitude: 14.5995,  // Example: Manila coordinates
        longitude: 120.9842,
        radius: 500, // 500 meters
        type: 'primary'
    }
];

/**
 * Geofence configuration
 */
const GEOFENCE_CONFIG = {
    maxAccuracyThreshold: 100, // Max GPS accuracy in meters to accept
    allowedOutsideMinutes: 5,  // Grace period for brief exits
    strictMode: false,         // If true, requires exact zone match
    logAllAttempts: true       // Log all location validation attempts
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Get current location with high accuracy
 * @returns {Promise<object>} Location data
 */
export async function getCurrentLocation() {
    if (!browser) return null;
    
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy, altitude } = position.coords;
                
                // Get location name via reverse geocoding
                let locationName = 'Unknown Location';
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        const city = data.address?.city || data.address?.town || data.address?.village || '';
                        const area = data.address?.suburb || data.address?.neighbourhood || '';
                        locationName = area ? `${area}, ${city}` : city || data.display_name;
                    }
                } catch (e) { /* ignore geocoding errors */ }
                
                resolve({
                    latitude,
                    longitude,
                    accuracy,
                    altitude,
                    name: locationName,
                    timestamp: new Date().toISOString()
                });
            },
            (error) => {
                reject(new Error(`Location error: ${error.message}`));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

/**
 * Get campus zones from Firebase or use defaults
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<Array>} Campus zones
 */
export async function getCampusZones(organizationId = 'default') {
    if (!browser || !db) return DEFAULT_CAMPUS_ZONES;
    
    try {
        const zonesRef = ref(db, `geofence_zones/${organizationId}`);
        const snapshot = await get(zonesRef);
        
        if (snapshot.exists()) {
            return Object.values(snapshot.val());
        }
        
        return DEFAULT_CAMPUS_ZONES;
    } catch (error) {
        console.error('Error fetching campus zones:', error);
        return DEFAULT_CAMPUS_ZONES;
    }
}

/**
 * Validate if location is within campus geofence
 * @param {object} location - Current location {latitude, longitude, accuracy}
 * @param {string} organizationId - Organization ID
 * @returns {Promise<object>} Validation result
 */
export async function validateLocationInGeofence(location, organizationId = 'default') {
    if (!location || !location.latitude || !location.longitude) {
        return {
            valid: false,
            reason: 'invalid_location_data',
            message: 'Location data is missing or invalid'
        };
    }
    
    // Check GPS accuracy
    if (location.accuracy > GEOFENCE_CONFIG.maxAccuracyThreshold) {
        return {
            valid: false,
            reason: 'low_accuracy',
            message: `GPS accuracy too low (${Math.round(location.accuracy)}m). Please move to an open area.`,
            accuracy: location.accuracy
        };
    }
    
    const zones = await getCampusZones(organizationId);
    
    // Check each zone
    for (const zone of zones) {
        const distance = calculateDistance(
            location.latitude,
            location.longitude,
            zone.latitude,
            zone.longitude
        );
        
        if (distance <= zone.radius) {
            return {
                valid: true,
                zone: zone,
                distance: Math.round(distance),
                message: `Within ${zone.name}`,
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    name: location.name
                }
            };
        }
    }
    
    // Not in any zone
    const nearestZone = findNearestZone(location, zones);
    
    return {
        valid: false,
        reason: 'outside_geofence',
        message: `You are outside the allowed attendance area. Nearest zone: ${nearestZone.zone.name} (${Math.round(nearestZone.distance)}m away)`,
        nearestZone: nearestZone,
        location: {
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name
        }
    };
}

/**
 * Find the nearest campus zone
 * @param {object} location - Current location
 * @param {Array} zones - Campus zones
 * @returns {object} Nearest zone with distance
 */
function findNearestZone(location, zones) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const zone of zones) {
        const distance = calculateDistance(
            location.latitude,
            location.longitude,
            zone.latitude,
            zone.longitude
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearest = zone;
        }
    }
    
    return {
        zone: nearest,
        distance: minDistance
    };
}

/**
 * Log location validation attempt
 * @param {string} userId - User ID
 * @param {object} validationResult - Validation result
 * @param {string} action - Action type (checkIn, checkOut, etc.)
 */
export async function logLocationValidation(userId, validationResult, action) {
    if (!browser || !db || !GEOFENCE_CONFIG.logAllAttempts) return;
    
    try {
        const logRef = ref(db, `location_logs/${userId}/${Date.now()}`);
        await set(logRef, {
            action,
            valid: validationResult.valid,
            reason: validationResult.reason || null,
            zone: validationResult.zone?.name || null,
            distance: validationResult.distance || null,
            location: validationResult.location || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error logging location validation:', error);
    }
}

/**
 * Save campus zone configuration
 * @param {string} organizationId - Organization ID
 * @param {Array} zones - Campus zones to save
 */
export async function saveCampusZones(organizationId, zones) {
    if (!browser || !db) return false;
    
    try {
        const zonesRef = ref(db, `geofence_zones/${organizationId}`);
        const zonesObj = {};
        zones.forEach(zone => {
            zonesObj[zone.id] = zone;
        });
        await set(zonesRef, zonesObj);
        return true;
    } catch (error) {
        console.error('Error saving campus zones:', error);
        return false;
    }
}

/**
 * Check if location spoofing is detected
 * @param {object} location - Current location
 * @param {object} previousLocation - Previous location
 * @param {number} timeDiffMs - Time difference in milliseconds
 * @returns {object} Spoofing detection result
 */
export function detectLocationSpoofing(location, previousLocation, timeDiffMs) {
    if (!previousLocation) return { suspicious: false };
    
    const distance = calculateDistance(
        location.latitude,
        location.longitude,
        previousLocation.latitude,
        previousLocation.longitude
    );
    
    // Calculate speed in m/s
    const timeDiffSeconds = timeDiffMs / 1000;
    const speed = distance / timeDiffSeconds;
    
    // Max reasonable speed: 120 km/h = 33.33 m/s
    const maxReasonableSpeed = 33.33;
    
    if (speed > maxReasonableSpeed) {
        return {
            suspicious: true,
            reason: 'impossible_speed',
            speed: Math.round(speed * 3.6), // Convert to km/h
            distance: Math.round(distance),
            message: `Suspicious movement detected: ${Math.round(distance)}m in ${Math.round(timeDiffSeconds)}s`
        };
    }
    
    // Check for exact coordinate matches (common in spoofing)
    if (location.latitude === previousLocation.latitude && 
        location.longitude === previousLocation.longitude &&
        timeDiffMs > 60000) { // More than 1 minute
        return {
            suspicious: true,
            reason: 'static_coordinates',
            message: 'Location appears to be static/spoofed'
        };
    }
    
    return { suspicious: false };
}
