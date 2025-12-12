<script>
    import { fly, fade } from 'svelte/transition';
    import { IconBell, IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconCheck, IconX, IconClock, IconHistory } from '@tabler/icons-svelte';
    import { formatRelativeTime, NOTIFICATION_CATEGORIES } from '$lib/stores/adminDashboard.js';

    export let notifications = [];
    export let showHistory = false;

    let activeFilter = 'all';

    $: filteredNotifications = activeFilter === 'all' 
        ? notifications 
        : notifications.filter(n => n.category === activeFilter);

    $: unreadCount = notifications.filter(n => !n.read).length;
    $: criticalCount = notifications.filter(n => n.category === NOTIFICATION_CATEGORIES.CRITICAL && !n.read).length;

    function getCategoryIcon(category) {
        switch (category) {
            case NOTIFICATION_CATEGORIES.CRITICAL: return IconAlertTriangle;
            case NOTIFICATION_CATEGORIES.WARNING: return IconAlertCircle;
            case NOTIFICATION_CATEGORIES.SUCCESS: return IconCheck;
            default: return IconInfoCircle;
        }
    }

    function getCategoryColor(category) {
        switch (category) {
            case NOTIFICATION_CATEGORIES.CRITICAL: return 'red';
            case NOTIFICATION_CATEGORIES.WARNING: return 'orange';
            case NOTIFICATION_CATEGORIES.SUCCESS: return 'green';
            default: return 'blue';
        }
    }

    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    function handleSnooze(id) {
        dispatch('snooze', { id });
    }

    function handleDismiss(id) {
        dispatch('dismiss', { id });
    }

    function handleResolve(id) {
        dispatch('resolve', { id });
    }

    function toggleHistory() {
        showHistory = !showHistory;
    }
</script>

<div class="notifications-hud">
    <div class="hud-header">
        <div class="header-title">
            <IconBell size={18} stroke={1.5} />
            <h3>Notifications</h3>
            {#if unreadCount > 0}
                <span class="unread-badge">{unreadCount}</span>
            {/if}
        </div>
        <button class="history-btn" class:active={showHistory} on:click={toggleHistory}>
            <IconHistory size={16} stroke={1.5} />
        </button>
    </div>

    <!-- Category Filters -->
    <div class="category-filters">
        <button 
            class="filter-btn" 
            class:active={activeFilter === 'all'}
            on:click={() => activeFilter = 'all'}
        >
            All
        </button>
        <button 
            class="filter-btn critical" 
            class:active={activeFilter === NOTIFICATION_CATEGORIES.CRITICAL}
            on:click={() => activeFilter = NOTIFICATION_CATEGORIES.CRITICAL}
        >
            Critical
            {#if criticalCount > 0}
                <span class="filter-count">{criticalCount}</span>
            {/if}
        </button>
        <button 
            class="filter-btn warning" 
            class:active={activeFilter === NOTIFICATION_CATEGORIES.WARNING}
            on:click={() => activeFilter = NOTIFICATION_CATEGORIES.WARNING}
        >
            Warning
        </button>
        <button 
            class="filter-btn info" 
            class:active={activeFilter === NOTIFICATION_CATEGORIES.INFO}
            on:click={() => activeFilter = NOTIFICATION_CATEGORIES.INFO}
        >
            Info
        </button>
        <button 
            class="filter-btn success" 
            class:active={activeFilter === NOTIFICATION_CATEGORIES.SUCCESS}
            on:click={() => activeFilter = NOTIFICATION_CATEGORIES.SUCCESS}
        >
            Success
        </button>
    </div>

    <!-- Notifications List -->
    <div class="notifications-list">
        {#if filteredNotifications.length === 0}
            <div class="empty-state">
                <IconBell size={28} stroke={1.5} />
                <p>No notifications</p>
            </div>
        {:else}
            {#each filteredNotifications as notification (notification.id)}
                <div 
                    class="notification-item {getCategoryColor(notification.category)}"
                    class:unread={!notification.read}
                    in:fly={{ x: -20, duration: 200 }}
                    out:fade={{ duration: 150 }}
                >
                    <div class="notif-icon {getCategoryColor(notification.category)}">
                        <svelte:component this={getCategoryIcon(notification.category)} size={16} stroke={2} />
                    </div>
                    <div class="notif-content">
                        <span class="notif-title">{notification.title}</span>
                        <span class="notif-meta">
                            {notification.message.slice(0, 30)}{notification.message.length > 30 ? '...' : ''} · {formatRelativeTime(notification.timestamp)}
                        </span>
                    </div>
                    <div class="notif-actions">
                        <button class="action-btn snooze" title="Snooze" on:click={() => handleSnooze(notification.id)}>
                            <IconClock size={14} stroke={1.5} />
                        </button>
                        <button class="action-btn resolve" title="Mark as Resolved" on:click={() => handleResolve(notification.id)}>
                            <IconCheck size={14} stroke={2} />
                        </button>
                        <button class="action-btn dismiss" title="Dismiss" on:click={() => handleDismiss(notification.id)}>
                            <IconX size={14} stroke={2} />
                        </button>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .notifications-hud {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
    }

    .hud-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .header-title h3 {
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .unread-badge {
        background: var(--apple-red);
        color: white;
        font-size: 10px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 8px;
        min-width: 16px;
        text-align: center;
    }

    .history-btn {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .history-btn:hover, .history-btn.active {
        background: var(--apple-accent);
        color: white;
    }

    .category-filters {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        overflow-x: auto;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .filter-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 500;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        cursor: pointer;
        transition: var(--apple-transition);
        white-space: nowrap;
    }

    .filter-btn:hover {
        background: var(--theme-border, var(--apple-gray-5));
    }

    .filter-btn.active {
        background: var(--apple-accent);
        color: white;
    }

    .filter-btn.critical.active { background: var(--apple-red); }
    .filter-btn.warning.active { background: var(--apple-orange); }
    .filter-btn.success.active { background: var(--apple-green); }

    .filter-count {
        background: rgba(255, 255, 255, 0.3);
        padding: 0 4px;
        border-radius: 6px;
        font-size: 9px;
    }

    .notifications-list {
        max-height: 200px;
        overflow-y: auto;
        padding: 8px;
    }

    .notification-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: var(--apple-radius-sm);
        margin-bottom: 6px;
        background: var(--theme-border-light, var(--apple-gray-6));
        transition: var(--apple-transition);
    }

    .notification-item:last-child {
        margin-bottom: 0;
    }

    .notification-item:hover {
        background: var(--theme-border, var(--apple-gray-5));
    }

    .notification-item.unread {
        background: rgba(0, 122, 255, 0.05);
        border-left: 2px solid var(--apple-accent);
    }

    .notification-item.unread.red {
        background: rgba(255, 59, 48, 0.05);
        border-left-color: var(--apple-red);
    }

    .notification-item.unread.orange {
        background: rgba(255, 149, 0, 0.05);
        border-left-color: var(--apple-orange);
    }

    .notification-item.unread.green {
        background: rgba(52, 199, 89, 0.05);
        border-left-color: var(--apple-green);
    }

    .notif-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .notif-icon.red {
        background: rgba(255, 59, 48, 0.1);
        color: var(--apple-red);
    }

    .notif-icon.orange {
        background: rgba(255, 149, 0, 0.1);
        color: var(--apple-orange);
    }

    .notif-icon.green {
        background: rgba(52, 199, 89, 0.1);
        color: var(--apple-green);
    }

    .notif-icon.blue {
        background: rgba(0, 122, 255, 0.1);
        color: var(--apple-accent);
    }

    .notif-content {
        flex: 1;
        min-width: 0;
    }

    .notif-title {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .notif-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 9px;
        color: var(--theme-text-secondary, var(--apple-gray-2));
    }

    .notif-actions {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.15s;
    }

    .notification-item:hover .notif-actions {
        opacity: 1;
    }

    .action-btn {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--theme-card-bg, var(--apple-white));
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--apple-transition);
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .action-btn:hover {
        transform: scale(1.1);
    }

    .action-btn.snooze:hover {
        background: var(--apple-orange);
        color: white;
    }

    .action-btn.resolve:hover {
        background: var(--apple-green);
        color: white;
    }

    .action-btn.dismiss:hover {
        background: var(--apple-red);
        color: white;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .empty-state p {
        margin-top: 8px;
        font-size: 11px;
    }

    @media (max-width: 768px) {
        .notifications-list {
            max-height: 180px;
        }

        .notif-actions {
            opacity: 1;
        }
    }

    @media (max-width: 480px) {
        .hud-header {
            padding: 8px 12px;
        }

        .category-filters {
            padding: 6px 10px;
        }

        .notifications-list {
            padding: 6px;
        }

        .notification-item {
            padding: 6px 8px;
        }
    }
</style>
