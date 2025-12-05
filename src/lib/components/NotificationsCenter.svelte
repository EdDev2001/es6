<script>
    import { db, USER_PROFILE_PATH } from '$lib/firebase';
    import { ref, update, get } from 'firebase/database';
    import { onMount } from 'svelte';
    import {
        IconBell, IconAlertCircle, IconClock, IconCalendar,
        IconDevices, IconMail, IconCheck, IconChevronRight,
        IconTrash, IconCircleDot
    } from '@tabler/icons-svelte';

    export let user;
    export let userProfile;

    let saving = false;
    let saveSuccess = false;
    let notifications = [];
    let loadingNotifications = true;

    // Notification preferences
    let preferences = {
        absenceAlerts: true,
        lateWarnings: true,
        scheduleUpdates: true,
        deviceLoginActivity: true,
        emailNotifications: false
    };

    const preferenceItems = [
        { 
            key: 'absenceAlerts', 
            icon: IconAlertCircle, 
            title: 'Absence Alerts',
            desc: 'Get notified when you miss attendance',
            color: '#FF3B30'
        },
        { 
            key: 'lateWarnings', 
            icon: IconClock, 
            title: 'Late Warnings',
            desc: 'Alerts when you check in late',
            color: '#FF9500'
        },
        { 
            key: 'scheduleUpdates', 
            icon: IconCalendar, 
            title: 'Schedule Updates',
            desc: 'Changes to class schedules',
            color: '#007AFF'
        },
        { 
            key: 'deviceLoginActivity', 
            icon: IconDevices, 
            title: 'Device Login Activity',
            desc: 'New device sign-ins to your account',
            color: '#5856D6'
        },
        { 
            key: 'emailNotifications', 
            icon: IconMail, 
            title: 'Email Notifications',
            desc: 'Receive alerts via email',
            color: '#34C759'
        }
    ];

    onMount(async () => {
        await loadPreferences();
        await loadNotifications();
    });

    async function loadPreferences() {
        if (!user || !userProfile) return;
        
        if (userProfile.notificationPreferences) {
            preferences = { ...preferences, ...userProfile.notificationPreferences };
        }
    }

    async function loadNotifications() {
        loadingNotifications = true;
        try {
            const notifRef = ref(db, `notifications/${user.uid}`);
            const snapshot = await get(notifRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                notifications = Object.entries(data)
                    .map(([id, notif]) => ({ id, ...notif }))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 20);
            }
        } catch (e) {
            console.error('Error loading notifications:', e);
        }
        loadingNotifications = false;
    }

    async function togglePreference(key) {
        preferences[key] = !preferences[key];
        await savePreferences();
    }

    async function savePreferences() {
        if (!user || saving) return;
        saving = true;
        saveSuccess = false;

        try {
            const userRef = ref(db, `${USER_PROFILE_PATH}/${user.uid}`);
            await update(userRef, {
                notificationPreferences: preferences,
                updatedAt: new Date().toISOString()
            });
            saveSuccess = true;
            setTimeout(() => saveSuccess = false, 2000);
        } catch (e) {
            console.error('Save error:', e);
        }
        saving = false;
    }

    async function markAsRead(notifId) {
        try {
            const notifRef = ref(db, `notifications/${user.uid}/${notifId}`);
            await update(notifRef, { read: true });
            notifications = notifications.map(n => 
                n.id === notifId ? { ...n, read: true } : n
            );
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    }

    async function clearAllNotifications() {
        try {
            const notifRef = ref(db, `notifications/${user.uid}`);
            await update(notifRef, null);
            notifications = [];
        } catch (e) {
            console.error('Error clearing notifications:', e);
        }
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'absence': return IconAlertCircle;
            case 'late': return IconClock;
            case 'schedule': return IconCalendar;
            case 'device': return IconDevices;
            default: return IconBell;
        }
    }

    function getNotificationColor(type) {
        switch (type) {
            case 'absence': return '#FF3B30';
            case 'late': return '#FF9500';
            case 'schedule': return '#007AFF';
            case 'device': return '#5856D6';
            default: return '#8E8E93';
        }
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    }

    $: unreadCount = notifications.filter(n => !n.read).length;
</script>

<div class="notifications-container">
    <!-- Preferences Section -->
    <section class="section">
        <div class="section-header">
            <IconBell size={20} stroke={1.5} />
            <h3 class="section-title">Notification Preferences</h3>
        </div>
        
        <div class="preferences-list">
            {#each preferenceItems as item}
                <button 
                    class="preference-item"
                    on:click={() => togglePreference(item.key)}
                >
                    <div class="pref-icon" style:--pref-color={item.color}>
                        <svelte:component this={item.icon} size={20} stroke={1.5} />
                    </div>
                    <div class="pref-content">
                        <span class="pref-title">{item.title}</span>
                        <span class="pref-desc">{item.desc}</span>
                    </div>
                    <div class="toggle" class:toggle-on={preferences[item.key]}>
                        <div class="toggle-knob"></div>
                    </div>
                </button>
            {/each}
        </div>
    </section>

    <!-- Recent Alerts Section -->
    <section class="section">
        <div class="section-header">
            <IconAlertCircle size={20} stroke={1.5} />
            <h3 class="section-title">Recent Alerts</h3>
            {#if unreadCount > 0}
                <span class="unread-badge">{unreadCount}</span>
            {/if}
            {#if notifications.length > 0}
                <button class="clear-btn" on:click={clearAllNotifications}>
                    <IconTrash size={16} stroke={1.5} />
                    <span>Clear All</span>
                </button>
            {/if}
        </div>

        {#if loadingNotifications}
            <div class="loading-state">
                <div class="spinner-small"></div>
                <span>Loading alerts...</span>
            </div>
        {:else if notifications.length === 0}
            <div class="empty-state">
                <div class="empty-icon">
                    <IconBell size={32} stroke={1.5} />
                </div>
                <p class="empty-title">No notifications yet</p>
                <p class="empty-desc">You're all caught up!</p>
            </div>
        {:else}
            <div class="notifications-list">
                {#each notifications as notif}
                    <button 
                        class="notification-item"
                        class:notification-unread={!notif.read}
                        on:click={() => markAsRead(notif.id)}
                    >
                        <div class="notif-icon" style:--notif-color={getNotificationColor(notif.type)}>
                            <svelte:component this={getNotificationIcon(notif.type)} size={18} stroke={1.5} />
                        </div>
                        <div class="notif-content">
                            <span class="notif-title">{notif.title}</span>
                            <span class="notif-message">{notif.message}</span>
                            <span class="notif-time">{formatTime(notif.timestamp)}</span>
                        </div>
                        {#if !notif.read}
                            <div class="unread-dot"></div>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </section>

    <!-- Status Messages -->
    {#if saveSuccess}
        <div class="status-msg status-success">
            <IconCheck size={16} stroke={2} />
            <span>Preferences saved!</span>
        </div>
    {/if}
</div>

<style>
    .notifications-container {
        display: flex;
        flex-direction: column;
        gap: 28px;
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--theme-text, var(--apple-black));
    }

    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
    }

    .unread-badge {
        background: var(--apple-red);
        color: white;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        margin-left: 4px;
    }

    .clear-btn {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: transparent;
        border: 1px solid var(--theme-border, var(--apple-gray-4));
        border-radius: var(--apple-radius-sm);
        color: var(--apple-red);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .clear-btn:hover {
        background: rgba(255, 59, 48, 0.1);
    }

    /* Preferences List */
    .preferences-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-lg);
        overflow: hidden;
    }

    .preference-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        background: var(--theme-card-bg, var(--apple-white));
        border: none;
        cursor: pointer;
        transition: var(--apple-transition);
        text-align: left;
        width: 100%;
    }

    .preference-item:hover {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .pref-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--apple-radius-sm);
        background: color-mix(in srgb, var(--pref-color) 15%, transparent);
        color: var(--pref-color);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .pref-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .pref-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-text, var(--apple-black));
    }

    .pref-desc {
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    /* Toggle Switch */
    .toggle {
        width: 50px;
        height: 30px;
        border-radius: 15px;
        background: var(--theme-border, var(--apple-gray-4));
        padding: 2px;
        transition: var(--apple-transition);
        flex-shrink: 0;
    }

    .toggle-on {
        background: var(--apple-green);
    }

    .toggle-knob {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: var(--apple-transition);
    }

    .toggle-on .toggle-knob {
        transform: translateX(20px);
    }

    /* Notifications List */
    .notifications-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-lg);
        overflow: hidden;
        max-height: 400px;
        overflow-y: auto;
    }

    .notification-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        background: var(--theme-card-bg, var(--apple-white));
        border: none;
        cursor: pointer;
        transition: var(--apple-transition);
        text-align: left;
        width: 100%;
    }

    .notification-item:hover {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .notification-unread {
        background: color-mix(in srgb, var(--apple-accent) 5%, var(--theme-card-bg, var(--apple-white)));
    }

    .notif-icon {
        width: 32px;
        height: 32px;
        border-radius: var(--apple-radius-sm);
        background: color-mix(in srgb, var(--notif-color) 15%, transparent);
        color: var(--notif-color);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
    }

    .notif-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .notif-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
    }

    .notif-message {
        font-size: 13px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        line-height: 1.4;
    }

    .notif-time {
        font-size: 11px;
        color: var(--theme-text-secondary, var(--apple-gray-2));
        margin-top: 2px;
    }

    .unread-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--apple-accent);
        flex-shrink: 0;
        margin-top: 6px;
    }

    /* Empty & Loading States */
    .empty-state, .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
    }

    .loading-state {
        flex-direction: row;
        gap: 12px;
        padding: 24px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        font-size: 14px;
    }

    .spinner-small {
        width: 20px;
        height: 20px;
        border: 2px solid var(--theme-border-light, var(--apple-gray-5));
        border-top-color: var(--apple-accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--theme-border-light, var(--apple-gray-6));
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--theme-text-secondary, var(--apple-gray-2));
        margin-bottom: 16px;
    }

    .empty-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin-bottom: 4px;
    }

    .empty-desc {
        font-size: 14px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    /* Status Messages */
    .status-msg {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: var(--apple-radius-md);
        font-size: 14px;
        font-weight: 500;
    }

    .status-success {
        background: rgba(52, 199, 89, 0.15);
        color: var(--apple-green);
    }
</style>
