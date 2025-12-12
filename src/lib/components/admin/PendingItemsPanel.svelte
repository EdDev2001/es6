<script>
    import { IconMessage, IconFileText, IconAlertTriangle, IconChevronRight } from '@tabler/icons-svelte';
    import { formatRelativeTime } from '$lib/stores/adminDashboard.js';

    export let feedback = [];
    export let requests = [];
    export let systemAlerts = [];

    let activeTab = 'feedback';

    $: totalPending = feedback.length + requests.length + systemAlerts.length;
</script>

<div class="pending-panel">
    <div class="tabs">
        <button class:active={activeTab === 'feedback'} on:click={() => activeTab = 'feedback'}>
            <IconMessage size={14} stroke={1.5} />
            <span>Feedback</span>
            {#if feedback.length > 0}<span class="badge">{feedback.length}</span>{/if}
        </button>
        <button class:active={activeTab === 'requests'} on:click={() => activeTab = 'requests'}>
            <IconFileText size={14} stroke={1.5} />
            <span>Requests</span>
            {#if requests.length > 0}<span class="badge">{requests.length}</span>{/if}
        </button>
        <button class:active={activeTab === 'alerts'} on:click={() => activeTab = 'alerts'}>
            <IconAlertTriangle size={14} stroke={1.5} />
            <span>Alerts</span>
            {#if systemAlerts.length > 0}<span class="badge alert">{systemAlerts.length}</span>{/if}
        </button>
    </div>

    <div class="content">
        {#if activeTab === 'feedback'}
            {#if feedback.length === 0}
                <div class="empty">No pending feedback</div>
            {:else}
                {#each feedback.slice(0, 4) as item}
                    <div class="item">
                        <div class="item-info">
                            <span class="item-title">{item.title}</span>
                            <span class="item-meta">{item.user} • {item.category}</span>
                        </div>
                        <span class="urgency {item.urgency}">{item.urgency}</span>
                    </div>
                {/each}
            {/if}
        {:else if activeTab === 'requests'}
            {#if requests.length === 0}
                <div class="empty">No pending requests</div>
            {:else}
                {#each requests.slice(0, 4) as item}
                    <div class="item">
                        <div class="item-info">
                            <span class="item-title">{item.title}</span>
                            <span class="item-meta">{item.user} • {formatRelativeTime(item.timestamp)}</span>
                        </div>
                        <span class="type-badge">{item.type}</span>
                    </div>
                {/each}
            {/if}
        {:else}
            {#if systemAlerts.length === 0}
                <div class="empty success">All systems operational ✓</div>
            {:else}
                {#each systemAlerts.slice(0, 4) as alert}
                    <div class="item alert-item">
                        <IconAlertTriangle size={14} stroke={1.5} />
                        <div class="item-info">
                            <span class="item-title">{alert.title}</span>
                            <span class="item-meta">{alert.message}</span>
                        </div>
                    </div>
                {/each}
            {/if}
        {/if}
    </div>

    <a href="/admin/feedback" class="view-all">
        View All <IconChevronRight size={12} stroke={2} />
    </a>
</div>

<style>
    .pending-panel {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-md);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
    }

    .tabs {
        display: flex;
        border-bottom: 1px solid var(--theme-border-light);
    }

    .tabs button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px 8px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        font-size: 11px;
        font-weight: 500;
        color: var(--theme-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
    }

    .tabs button:hover {
        color: var(--theme-text);
    }

    .tabs button.active {
        color: var(--apple-accent);
        border-bottom-color: var(--apple-accent);
    }

    .badge {
        background: var(--apple-accent);
        color: white;
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 8px;
        min-width: 14px;
    }

    .badge.alert {
        background: var(--apple-red);
    }

    .content {
        padding: 8px;
        min-height: 140px;
        max-height: 200px;
        overflow-y: auto;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        margin-bottom: 4px;
    }

    .item:hover {
        background: var(--theme-border-light);
    }

    .item-info {
        flex: 1;
        min-width: 0;
    }

    .item-title {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .item-meta {
        font-size: 10px;
        color: var(--theme-text-secondary);
    }

    .urgency {
        font-size: 9px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
    }

    .urgency.high { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .urgency.medium { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .urgency.low { background: var(--theme-border-light); color: var(--theme-text-secondary); }

    .type-badge {
        font-size: 9px;
        padding: 2px 6px;
        background: var(--theme-border-light);
        border-radius: 4px;
        color: var(--theme-text-secondary);
    }

    .alert-item {
        background: rgba(255, 59, 48, 0.05);
        color: var(--apple-red);
    }

    .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
        font-size: 12px;
        color: var(--theme-text-secondary);
    }

    .empty.success {
        color: var(--apple-green);
    }

    .view-all {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px;
        border-top: 1px solid var(--theme-border-light);
        font-size: 11px;
        font-weight: 500;
        color: var(--apple-accent);
        text-decoration: none;
    }

    .view-all:hover {
        background: var(--theme-border-light);
    }

    @media (max-width: 768px) {
        .tabs button span:not(.badge) {
            display: none;
        }

        .tabs button {
            padding: 8px;
        }
    }
</style>
