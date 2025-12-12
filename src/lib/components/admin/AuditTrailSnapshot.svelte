<script>
    import { IconHistory, IconEdit, IconRefresh, IconSettings, IconChevronRight, IconUser } from '@tabler/icons-svelte';
    import { formatRelativeTime } from '$lib/stores/adminDashboard.js';

    export let auditLogs = [];
    export let maxItems = 4;

    $: displayedLogs = auditLogs.slice(0, maxItems);

    function getActionIcon(action) {
        switch (action) {
            case 'edit': return IconEdit;
            case 'reset': return IconRefresh;
            case 'settings': return IconSettings;
            default: return IconHistory;
        }
    }

    function getActionColor(action) {
        switch (action) {
            case 'edit': return 'orange';
            case 'reset': return 'purple';
            case 'settings': return 'blue';
            default: return 'gray';
        }
    }
</script>

<div class="audit-snapshot">
    <div class="snapshot-header">
        <h3>
            <IconHistory size={14} stroke={1.5} />
            Activity
        </h3>
        <a href="/admin/audit-logs" class="view-all">
            All
            <IconChevronRight size={12} stroke={2} />
        </a>
    </div>

    <div class="audit-list">
        {#if displayedLogs.length === 0}
            <div class="empty-state">
                <IconHistory size={20} stroke={1.5} />
                <p>No activity</p>
            </div>
        {:else}
            {#each displayedLogs as log}
                <div class="audit-item">
                    <div class="audit-icon {getActionColor(log.action)}">
                        <svelte:component this={getActionIcon(log.action)} size={14} stroke={1.5} />
                    </div>
                    <div class="audit-content">
                        <span class="audit-message">{log.message}</span>
                        <div class="audit-meta">
                            <span class="admin-name">
                                <IconUser size={9} stroke={1.5} />
                                {log.adminName}
                            </span>
                            <span class="audit-time">{formatRelativeTime(log.timestamp)}</span>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .audit-snapshot {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .snapshot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .snapshot-header h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .view-all {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 11px;
        font-weight: 500;
        color: var(--apple-accent);
        text-decoration: none;
        transition: var(--apple-transition);
    }

    .view-all:hover {
        opacity: 0.8;
    }

    .audit-list {
        padding: 10px 12px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .audit-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: var(--apple-radius-sm);
        transition: var(--apple-transition);
    }

    .audit-item:hover {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .audit-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .audit-icon.orange {
        background: rgba(255, 149, 0, 0.1);
        color: var(--apple-orange);
    }

    .audit-icon.purple {
        background: rgba(175, 82, 222, 0.1);
        color: var(--apple-purple);
    }

    .audit-icon.blue {
        background: rgba(0, 122, 255, 0.1);
        color: var(--apple-accent);
    }

    .audit-icon.gray {
        background: var(--theme-border-light, var(--apple-gray-5));
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .audit-content {
        flex: 1;
        min-width: 0;
    }

    .audit-message {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-text, var(--apple-black));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
    }

    .audit-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .admin-name {
        display: flex;
        align-items: center;
        gap: 3px;
        font-weight: 500;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 40px 16px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .empty-state p {
        margin-top: 8px;
        font-size: 12px;
    }

    @media (max-width: 768px) {
        .snapshot-header {
            padding: 10px 14px;
        }

        .audit-list {
            padding: 8px 10px;
        }

        .audit-item {
            padding: 8px 10px;
            gap: 8px;
        }

        .audit-icon {
            width: 24px;
            height: 24px;
        }
    }

    @media (max-width: 480px) {
        .audit-message {
            font-size: 11px;
        }

        .audit-meta {
            font-size: 9px;
        }
    }
</style>
