// Admin Dashboard Store - Real-time data and state management
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const DASHBOARD_PREFS_KEY = 'admin-dashboard-prefs';

// Dashboard view modes
export const DASHBOARD_MODES = {
    CLASSIC: 'classic',
    APPLE: 'apple',
    COMPACT: 'compact'
};

// Notification categories
export const NOTIFICATION_CATEGORIES = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    INFO: 'info',
    SUCCESS: 'success'
};

// Create dashboard preferences store
function createDashboardPrefsStore() {
    const defaultPrefs = {
        viewMode: DASHBOARD_MODES.APPLE,
        holidayModeEnabled: true,
        holidayModeScheduled: false,
        compactStats: false,
        showLiveActivity: true,
        showPredictions: true,
        refreshInterval: 30000 // 30 seconds
    };

    const stored = browser ? JSON.parse(localStorage.getItem(DASHBOARD_PREFS_KEY) || 'null') : null;
    const initialPrefs = { ...defaultPrefs, ...stored };

    const { subscribe, set, update } = writable(initialPrefs);

    return {
        subscribe,
        setViewMode: (mode) => {
            update(state => {
                const newState = { ...state, viewMode: mode };
                if (browser) localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(newState));
                return newState;
            });
        },
        toggleHolidayMode: () => {
            update(state => {
                const newState = { ...state, holidayModeEnabled: !state.holidayModeEnabled };
                if (browser) localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(newState));
                return newState;
            });
        },
        setHolidayScheduled: (scheduled) => {
            update(state => {
                const newState = { ...state, holidayModeScheduled: scheduled };
                if (browser) localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(newState));
                return newState;
            });
        },
        toggleCompactStats: () => {
            update(state => {
                const newState = { ...state, compactStats: !state.compactStats };
                if (browser) localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(newState));
                return newState;
            });
        },
        toggleLiveActivity: () => {
            update(state => {
                const newState = { ...state, showLiveActivity: !state.showLiveActivity };
                if (browser) localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(newState));
                return newState;
            });
        },
        reset: () => {
            if (browser) localStorage.removeItem(DASHBOARD_PREFS_KEY);
            set(defaultPrefs);
        }
    };
}

export const dashboardPrefs = createDashboardPrefsStore();

// Real-time stats store
export const dashboardStats = writable({
    totalPresent: 0,
    totalAbsent: 0,
    excusedAbsent: 0,
    unexcusedAbsent: 0,
    lateArrivals: 0,
    avgLateMinutes: 0,
    activeScanners: 0,
    totalScanners: 0,
    liveCheckIns: 0,
    yesterdayPresent: 0,
    attendanceRate: 0,
    isAboveAvgLate: false
});

// Live activity feed store
export const liveActivityFeed = writable([]);

// Suspicious activity alerts store
export const suspiciousAlerts = writable([]);

// Department stats store
export const departmentStats = writable([]);

// Hourly heatmap data store
export const hourlyHeatmap = writable([]);

// Monthly analytics store
export const monthlyAnalytics = writable({
    totalDaysTracked: 0,
    avgDailyAttendance: 0,
    mostAbsentDay: '',
    bestAttendanceDay: '',
    dailyData: [],
    patterns: []
});

// Pending items store
export const pendingItems = writable({
    feedback: [],
    requests: [],
    systemAlerts: []
});

// System health store
export const systemHealth = writable({
    server: { status: 'online', responseTime: 0 },
    database: { status: 'online', queryPerformance: 'good' },
    redis: { queueLength: 0, failedJobs: 0, delayedJobs: 0 },
    scanners: []
});

// Admin notifications store
export const adminNotifications = writable([]);

// Audit trail store
export const auditTrail = writable([]);

// Helper function to get greeting based on time
export function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

// Helper function to format relative time
export function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Helper function to calculate percentage change
export function calculatePercentChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}
