<script>
    import { IconBell, IconMessage, IconCheck, IconChevronRight } from '@tabler/icons-svelte';

    export let unreadSystem = 0;
    export let unreadFeedback = 0;
    export let pendingApprovals = 0;

    $: totalUnread = unreadSystem + unreadFeedback + pendingApprovals;
</script>

<div class="notification-preview">
    <div class="preview-header">
        <h3>
            <IconBell size={18} stroke={1.5} />
            Notification Center
        </h3>
        {#if totalUnread > 0}
            <span class="total-badge">{totalUnread} unread</span>
        {/if}
    </div>

    <div class="preview-items">
        <div class="preview-item" class:has-count={unreadSystem > 0}>
            <div class="item-icon blue">
                <IconBell size={16} stroke={1.5} />
            </div>
            <span class="item-label">System Notifications</span>
            {#if unreadSystem > 0}
                <span class="item-count">{unreadSystem}</span>
            {:else}
                <span class="item-status">All read</span>
            {/if}
        </div>

        <div class="preview-item" class:has-count={unreadFeedback > 0}>
            <div class="item-icon orange">
                <IconMessage size={16} stroke={1.5} />
            </div>
            <span class="item-label">Unread Feedback</span>
            {#if unreadFeedback > 0}
                <span class="item-count">{unreadFeedback}</span>
            {:else}
                <span class="item-status">All read</span>
            {/if}
        </div>

        <div class="preview-item" class:has-count={pendingApprovals > 0}>
            <div class="item-icon purple">
                <IconCheck size={16} stroke={1.5} />
            </div>
            <span class="item-label">Pending Approvals</span>
            {#if pendingApprovals > 0}
                <span class="item-count">{pendingApprovals}</span>
            {:else}
                <span class="item-status">None</span>
            {/if}
        </div>
    </div>

    <a href="/admin/notifications" class="view-all-link">
        View All Notifications
        <IconChevronRight size={14} stroke={2} />
    </a>
</div>

<style>
    .notification-preview {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-xl);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
    }

    .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .preview-header h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .total-badge {
        font-size: 12px;
        font-weight: 600;
        color: var(--apple-red);
        background: rgba(255, 59, 48, 0.1);
        padding: 4px 10px;
        border-radius: 12px;
    }

    .preview-items {
        padding: 12px 16px;
    }

    .preview-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 12px;
        border-radius: var(--apple-radius-md);
        transition: var(--apple-transition);
    }

    .preview-item:hover {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .preview-item.has-count {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .item-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .item-icon.blue {
        background: rgba(0, 122, 255, 0.1);
        color: var(--apple-accent);
    }

    .item-icon.orange {
        background: rgba(255, 149, 0, 0.1);
        color: var(--apple-orange);
    }

    .item-icon.purple {
        background: rgba(175, 82, 222, 0.1);
        color: var(--apple-purple);
    }

    .item-label {
        flex: 1;
        font-size: 14px;
        color: var(--theme-text, var(--apple-black));
    }

    .item-count {
        font-size: 13px;
        font-weight: 700;
        color: var(--apple-red);
        background: rgba(255, 59, 48, 0.1);
        padding: 4px 10px;
        border-radius: 10px;
        min-width: 28px;
        text-align: center;
    }

    .item-status {
        font-size: 12px;
        color: var(--apple-green);
    }

    .view-all-link {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 16px;
        border-top: 1px solid var(--theme-border-light, var(--apple-gray-5));
        font-size: 13px;
        font-weight: 500;
        color: var(--apple-accent);
        text-decoration: none;
        transition: var(--apple-transition);
    }

    .view-all-link:hover {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    @media (max-width: 768px) {
        .preview-header {
            padding: 16px 18px;
        }

        .preview-header h3 {
            font-size: 15px;
        }

        .total-badge {
            font-size: 11px;
            padding: 3px 8px;
        }

        .preview-items {
            padding: 10px 14px;
        }

        .preview-item {
            padding: 12px 10px;
            gap: 10px;
        }

        .item-icon {
            width: 28px;
            height: 28px;
        }

        .item-label {
            font-size: 13px;
        }

        .item-count {
            font-size: 12px;
            padding: 3px 8px;
            min-width: 24px;
        }

        .item-status {
            font-size: 11px;
        }

        .view-all-link {
            padding: 14px;
            font-size: 12px;
        }
    }

    @media (max-width: 480px) {
        .preview-item {
            flex-wrap: wrap;
        }

        .item-label {
            flex: 1;
            min-width: 120px;
        }
    }
</style>
