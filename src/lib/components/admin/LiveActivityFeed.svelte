<script>
    import { fly } from 'svelte/transition';
    import { IconUser, IconCheck, IconClock } from '@tabler/icons-svelte';

    export let activities = [];
    export let suspiciousAlerts = [];
    export let maxItems = 8;

    $: displayedActivities = activities.slice(0, maxItems);

    function getStatusColor(status) {
        return status === 'on_time' ? 'green' : status === 'late' ? 'orange' : 'blue';
    }
</script>

<div class="live-feed">
    <div class="feed-header">
        <h3>
            <span class="live-dot"></span>
            Live Activity
        </h3>
        <span class="count">{activities.length}</span>
    </div>

    {#if suspiciousAlerts.length > 0}
        <div class="alert-banner">
            ⚠️ {suspiciousAlerts.length} suspicious {suspiciousAlerts.length === 1 ? 'activity' : 'activities'}
        </div>
    {/if}

    <div class="activity-list">
        {#if displayedActivities.length === 0}
            <div class="empty">
                <IconClock size={24} stroke={1.5} />
                <span>Waiting for activity...</span>
            </div>
        {:else}
            {#each displayedActivities as activity, i (activity.id || i)}
                <div class="activity-item" in:fly={{ x: -20, duration: 200, delay: i * 30 }}>
                    <div class="avatar">
                        <IconUser size={14} stroke={1.5} />
                    </div>
                    <div class="info">
                        <span class="name">{activity.studentName}</span>
                        <span class="meta">{activity.department} • {activity.scanTime}</span>
                    </div>
                    <span class="status {getStatusColor(activity.status)}">
                        {#if activity.status === 'on_time'}
                            <IconCheck size={12} stroke={2} />
                        {:else}
                            <IconClock size={12} stroke={2} />
                        {/if}
                    </span>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .live-feed {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-md);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
    }

    .feed-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
        border-bottom: 1px solid var(--theme-border-light);
    }

    .feed-header h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        margin: 0;
    }

    .live-dot {
        width: 6px;
        height: 6px;
        background: var(--apple-red);
        border-radius: 50%;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    .count {
        font-size: 11px;
        color: var(--theme-text-secondary);
        background: var(--theme-border-light);
        padding: 2px 8px;
        border-radius: 10px;
    }

    .alert-banner {
        background: rgba(255, 59, 48, 0.1);
        color: var(--apple-red);
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 500;
    }

    .activity-list {
        max-height: 280px;
        overflow-y: auto;
        padding: 6px;
    }

    .activity-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        transition: background 0.2s;
    }

    .activity-item:hover {
        background: var(--theme-border-light);
    }

    .avatar {
        width: 28px;
        height: 28px;
        background: var(--theme-border-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--theme-text-secondary);
        flex-shrink: 0;
    }

    .info {
        flex: 1;
        min-width: 0;
    }

    .name {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .meta {
        font-size: 10px;
        color: var(--theme-text-secondary);
    }

    .status {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .status.green { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .status.orange { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .status.blue { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }

    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: var(--theme-text-secondary);
        gap: 8px;
        font-size: 12px;
    }

    @media (max-width: 768px) {
        .activity-list {
            max-height: 220px;
        }
    }
</style>
