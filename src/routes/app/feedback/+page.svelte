<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { auth, getUserProfile } from '$lib/firebase';
    import { feedbackStore } from '$lib/stores/feedbackStore';
    import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS, QUICK_FEEDBACK_OPTIONS } from '$lib/services/feedbackService';
    import FeedbackCenter from '$lib/components/FeedbackCenter.svelte';
    import { IconMessagePlus, IconRefresh, IconStar, IconStarFilled } from '@tabler/icons-svelte';

    let user = null;
    let userProfile = null;
    let showFeedbackModal = false;
    let isRefreshing = false;

    onMount(() => {
        if (!browser || !auth) return;
        
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                user = u;
                userProfile = await getUserProfile(u.uid);
                feedbackStore.loadFeedback(u.uid);
            }
        });
        
        return unsubscribe;
    });

    async function refreshFeedback() {
        if (!user || isRefreshing) return;
        isRefreshing = true;
        await feedbackStore.loadFeedback(user.uid);
        setTimeout(() => isRefreshing = false, 500);
    }

    function getCategoryInfo(categoryId) {
        return FEEDBACK_CATEGORIES.find(c => c.id === categoryId) || FEEDBACK_CATEGORIES[0];
    }

    function getStatusInfo(status) {
        return FEEDBACK_STATUS[status] || FEEDBACK_STATUS.pending;
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    $: feedbackList = $feedbackStore.feedbackList;
</script>

<svelte:head>
    <title>Feedback Center | Student Attendance</title>
</svelte:head>

<div class="feedback-page">
    <!-- Header -->
    <header class="page-header">
        <div class="header-content">
            <div class="header-text">
                <h1 class="page-title">Feedback Center</h1>
                <p class="page-subtitle">We'd love to hear from you</p>
            </div>
            <button class="refresh-btn" on:click={refreshFeedback} class:spinning={isRefreshing}>
                <IconRefresh size={20} stroke={1.5} />
            </button>
        </div>
    </header>

    <!-- Quick Actions -->
    <section class="quick-actions">
        <button class="new-feedback-btn" on:click={() => showFeedbackModal = true}>
            <IconMessagePlus size={22} stroke={1.5} />
            <span>New Feedback</span>
        </button>
        
        <div class="quick-options">
            {#each QUICK_FEEDBACK_OPTIONS as option}
                <button class="quick-option" on:click={() => showFeedbackModal = true}>
                    <span class="option-icon">{option.icon}</span>
                    <span class="option-label">{option.label}</span>
                </button>
            {/each}
        </div>
    </section>

    <!-- Feedback List -->
    <section class="feedback-section">
        <div class="section-header">
            <h2 class="section-title">My Feedback</h2>
            <span class="section-count">{feedbackList.length} items</span>
        </div>

        {#if $feedbackStore.isLoading}
            <div class="loading-state">
                <div class="apple-spinner"></div>
                <p>Loading feedback...</p>
            </div>
        {:else if feedbackList.length === 0}
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p class="empty-title">No feedback yet</p>
                <p class="empty-text">Your submitted feedback will appear here</p>
                <button class="empty-btn" on:click={() => showFeedbackModal = true}>
                    Submit Your First Feedback
                </button>
            </div>
        {:else}
            <div class="feedback-list">
                {#each feedbackList as feedback}
                    {@const category = getCategoryInfo(feedback.category)}
                    {@const status = getStatusInfo(feedback.status)}
                    <div class="feedback-card">
                        <div class="card-header">
                            <span class="card-icon" style="background: {category.color}15; color: {category.color}">
                                {category.icon}
                            </span>
                            <div class="card-info">
                                <h3 class="card-title">{feedback.title}</h3>
                                <p class="card-id">{feedback.ticketId}</p>
                            </div>
                            <span class="card-status" style="background: {status.color}15; color: {status.color}">
                                {status.label}
                            </span>
                        </div>
                        
                        <!-- Star Rating Display -->
                        {#if feedback.rating}
                            <div class="card-rating">
                                {#each [1, 2, 3, 4, 5] as star}
                                    {#if star <= feedback.rating}
                                        <IconStarFilled size={16} class="star-filled" />
                                    {:else}
                                        <IconStar size={16} class="star-empty" />
                                    {/if}
                                {/each}
                                <span class="rating-text">{feedback.rating}/5</span>
                            </div>
                        {/if}
                        
                        <p class="card-description">{feedback.description}</p>
                        
                        <div class="card-footer">
                            <div class="card-meta">
                                <span class="meta-category">{category.label}</span>
                                <span class="meta-dot">•</span>
                                <span class="meta-date">{formatDate(feedback.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </section>
</div>

<!-- Feedback Modal -->
<FeedbackCenter 
    bind:show={showFeedbackModal} 
    userId={user?.uid}
    on:close={() => showFeedbackModal = false}
/>


<style>
    .feedback-page {
        padding: clamp(16px, 4vw, 40px);
        max-width: 900px;
        margin: 0 auto;
    }

    .page-header {
        margin-bottom: 24px;
    }

    .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .page-title {
        font-size: clamp(24px, 5vw, 32px);
        font-weight: 700;
        color: var(--theme-text, #0A0A0A);
        margin-bottom: 4px;
    }

    .page-subtitle {
        font-size: 14px;
        color: var(--theme-text-secondary, #8E8E93);
    }

    .refresh-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: var(--theme-card-bg, #fff);
        border: 1px solid var(--theme-border-light, #E5E5EA);
        border-radius: 12px;
        color: var(--theme-text-secondary, #8E8E93);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .refresh-btn:hover {
        border-color: var(--apple-accent, #007AFF);
        color: var(--apple-accent, #007AFF);
    }

    .refresh-btn.spinning {
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Quick Actions */
    .quick-actions {
        margin-bottom: 24px;
    }

    .new-feedback-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 16px;
        background: var(--apple-accent, #007AFF);
        border: none;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 16px;
    }

    .new-feedback-btn:hover {
        background: var(--apple-accent-hover, #0056CC);
        transform: scale(1.01);
    }

    .quick-options {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
    }

    .quick-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 8px;
        background: var(--theme-card-bg, #fff);
        border: 1px solid var(--theme-border-light, #E5E5EA);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .quick-option:hover {
        border-color: var(--apple-accent, #007AFF);
        background: rgba(0, 122, 255, 0.05);
    }

    .option-icon {
        font-size: 24px;
    }

    .option-label {
        font-size: 11px;
        font-weight: 500;
        color: var(--theme-text, #0A0A0A);
        text-align: center;
    }

    /* Feedback Section */
    .feedback-section {
        background: var(--theme-card-bg, #fff);
        border-radius: 18px;
        padding: 20px;
        box-shadow: var(--apple-shadow-sm);
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
    }

    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text, #0A0A0A);
    }

    .section-count {
        font-size: 13px;
        color: var(--theme-text-secondary, #8E8E93);
    }

    /* Loading & Empty States */
    .loading-state, .empty-state {
        text-align: center;
        padding: 40px 20px;
    }

    .loading-state p {
        margin-top: 16px;
        color: var(--theme-text-secondary, #8E8E93);
    }

    .empty-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 16px;
    }

    .empty-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text, #0A0A0A);
        margin-bottom: 4px;
    }

    .empty-text {
        font-size: 14px;
        color: var(--theme-text-secondary, #8E8E93);
        margin-bottom: 20px;
    }

    .empty-btn {
        padding: 12px 24px;
        background: var(--apple-accent, #007AFF);
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .empty-btn:hover {
        background: var(--apple-accent-hover, #0056CC);
    }

    /* Feedback List */
    .feedback-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .feedback-card {
        background: var(--theme-border-light, #F2F2F7);
        border-radius: 14px;
        padding: 16px;
        transition: all 0.2s ease;
    }

    .feedback-card:hover {
        background: var(--theme-border, #E5E5EA);
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
    }

    .card-icon {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
    }

    .card-info {
        flex: 1;
        min-width: 0;
    }

    .card-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--theme-text, #0A0A0A);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
    }

    .card-id {
        font-size: 12px;
        color: var(--theme-text-secondary, #8E8E93);
    }

    .card-status {
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        flex-shrink: 0;
    }

    /* Star Rating */
    .card-rating {
        display: flex;
        align-items: center;
        gap: 2px;
        margin-bottom: 10px;
    }

    .card-rating :global(.star-filled) {
        color: #FFCC00;
    }

    .card-rating :global(.star-empty) {
        color: var(--theme-border, #D1D1D6);
    }

    .rating-text {
        margin-left: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-text-secondary, #8E8E93);
    }

    .card-description {
        font-size: 14px;
        color: var(--theme-text-secondary, #6E6E73);
        line-height: 1.4;
        margin-bottom: 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .card-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--theme-text-secondary, #8E8E93);
    }

    .meta-dot {
        opacity: 0.5;
    }
</style>
