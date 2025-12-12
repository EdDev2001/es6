// src/lib/stores/systemSettings.js
// Client-side store for system settings (theme, attendance rules, etc.)

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const DEFAULT_SETTINGS = {
    general: { siteName: 'Student Attendance', timezone: 'Asia/Manila', dateFormat: 'MM/DD/YYYY' },
    attendance: {
        startTime: '08:00', endTime: '17:00', autoCheckout: true, autoCheckoutTime: '18:00',
        lateThreshold: 15, gracePeriod: 15, geofenceEnabled: true, workDays: [1, 2, 3, 4, 5],
        holidayAutoMark: true, weekendAutoMark: true
    },
    epass: { qrExpiration: 30, animatedHologram: true, antiScreenshot: true, watermarkEnabled: true },
    theme: {
        accentColor: '#007AFF', logoUrl: '', seasonalTheme: 'none',
        welcomeBanner: { enabled: false, title: '', message: '', imageUrl: '' }
    },
    departments: [], years: [], sections: [], holidays: []
};

function createSystemSettingsStore() {
    const { subscribe, set, update } = writable(DEFAULT_SETTINGS);
    
    return {
        subscribe,
        set,
        update,
        
        async load() {
            if (!browser) return;
            try {
                // Try to load from localStorage first for instant UI
                const cached = localStorage.getItem('systemSettings');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    set({ ...DEFAULT_SETTINGS, ...parsed });
                }
                
                // Then fetch fresh from server
                const response = await fetch('/api/settings');
                if (response.ok) {
                    const data = await response.json();
                    if (data.settings) {
                        set({ ...DEFAULT_SETTINGS, ...data.settings });
                        localStorage.setItem('systemSettings', JSON.stringify(data.settings));
                    }
                }
            } catch (error) {
                console.error('Failed to load system settings:', error);
            }
        },
        
        applyTheme(settings) {
            if (!browser) return;
            const root = document.documentElement;
            
            // Apply accent color
            if (settings.theme?.accentColor) {
                root.style.setProperty('--apple-accent', settings.theme.accentColor);
                root.style.setProperty('--apple-accent-hover', adjustColor(settings.theme.accentColor, -20));
            }
            
            // Apply seasonal theme
            if (settings.theme?.seasonalTheme && settings.theme.seasonalTheme !== 'none') {
                document.body.setAttribute('data-seasonal-theme', settings.theme.seasonalTheme);
            } else {
                document.body.removeAttribute('data-seasonal-theme');
            }
        }
    };
}

function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const systemSettings = createSystemSettingsStore();

// Derived stores for specific settings
export const attendanceSettings = derived(systemSettings, $s => $s.attendance);
export const epassSettings = derived(systemSettings, $s => $s.epass);
export const themeSettings = derived(systemSettings, $s => $s.theme);
export const departments = derived(systemSettings, $s => $s.departments || []);
export const yearLevels = derived(systemSettings, $s => $s.years || []);
export const sectionsList = derived(systemSettings, $s => $s.sections || []);
export const holidays = derived(systemSettings, $s => $s.holidays || []);
