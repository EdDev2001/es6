// src/lib/realtime/index.js
// Real-time Sync Module - Central exports

export {
    liveAttendance,
    liveStatus,
    liveNotifications,
    subscribeToUserAttendance,
    subscribeToTodayAttendance,
    subscribeToNotifications,
    subscribeToDepartmentAttendance,
    subscribeToGamification,
    subscribeToLeaderboard,
    unsubscribeAll,
    isConnected,
    unreadNotificationCount,
    todayStatus
} from './liveSyncEngine.js';
