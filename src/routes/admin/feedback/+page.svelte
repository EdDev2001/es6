<script>
    import { onMount } from "svelte";
    import { adminAuthStore } from "$lib/stores/adminAuth.js";
    import { 
        IconMessageCircle, IconSearch, IconFilter, IconCheck, IconX, IconLoader2, 
        IconBug, IconBulb, IconPalette, IconRocket, IconStar, IconChevronDown,
        IconUser, IconDeviceMobile, IconPhoto, IconSend, IconDownload, IconClock,
        IconAlertTriangle, IconArrowUp, IconArrowDown, IconMinus
    } from "@tabler/icons-svelte";

    let feedback = [];
    let admins = [];
    let stats = {};
    let isLoading = true;
    let searchQuery = '';
    let statusFilter = 'all';
    let typeFilter = 'all';
    let priorityFilter = 'all';
    let selectedFeedback = null;
    let replyText = '';
    let isSubmitting = false;

    const typeOptions = [
        { value: 'bug', label: 'Bug Report', icon: IconBug, color: 'red' },
        { value: 'request', label: 'Feature Request', icon: IconBulb, color: 'yellow' },
        { value: 'ui', label: 'UI/UX Issue', icon: IconPalette, color: 'purple' },
        { value: 'performance', label: 'Performance', icon: IconRocket, color: 'orange' },
        { value: 'suggestion', label: 'Suggestion', icon: IconStar, color: 'blue' }
    ];

    const priorityOptions = [
        { value: 'high', label: 'High', icon: IconArrowUp, color: 'red' },
        { value: 'medium', label: 'Medium', icon: IconMinus, color: 'yellow' },
        { value: 'low', label: 'Low', icon: IconArrowDown, color: 'gray' }
    ];

    const statusOptions = [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' }
    ];

    onMount(async () => {
        await loadFeedback();
    });

    async function loadFeedback() {
        isLoading = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const response = await fetch('/api/admin/feedback', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                feedback = data.feedback || [];
                admins = data.admins || [];
                stats = data.stats || {};
            }
        } catch (error) {
            console.error('Failed to load feedback:', error);
        } finally {
            isLoading = false;
        }
    }

    async function updateFeedback(id, updates) {
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const response = await fetch(`/api/admin/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (response.ok) {
                await loadFeedback();
                if (selectedFeedback?.id === id) {
                    selectedFeedback = feedback.find(f => f.id === id);
                }
            }
        } catch (error) {
            console.error('Failed to update feedback:', error);
        }
    }

    async function sendReply() {
        if (!replyText.trim() || !selectedFeedback) return;
        isSubmitting = true;
        try {
            await updateFeedback(selectedFeedback.id, { reply: replyText });
            replyText = '';
        } finally {
            isSubmitting = false;
        }
    }

    async function exportFeedback() {
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const response = await fetch('/api/admin/feedback?export=csv', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function getTypeInfo(type) {
        return typeOptions.find(t => t.value === type) || typeOptions[4];
    }

    function getPriorityInfo(priority) {
        return priorityOptions.find(p => p.value === priority) || priorityOptions[1];
    }

    $: filteredFeedback = feedback.filter(f => {
        const matchesSearch = !searchQuery || 
            f.message?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            f.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.subject?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
        const matchesType = typeFilter === 'all' || f.type === typeFilter;
        const matchesPriority = priorityFilter === 'all' || f.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
</script>

<svelte:head>
    <title>Feedback Management | Admin Panel</title>
</svelte:head>

<div class="feedback-page">
    <header class="page-header">
        <div class="header-content">
            <h1><IconMessageCircle size={28} stroke={1.5} /> Feedback Management</h1>
            <p class="header-subtitle">Review, respond, and manage user feedback</p>
        </div>
        <button class="apple-btn-secondary" on:click={exportFeedback}>
            <IconDownload size={18} stroke={1.5} /> Export CSV
        </button>
    </header>

    <!-- Stats Cards -->
    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-value">{stats.total || 0}</span>
            <span class="stat-label">Total</span>
        </div>
        <div class="stat-card pending">
            <span class="stat-value">{stats.pending || 0}</span>
            <span class="stat-label">Pending</span>
        </div>
        <div class="stat-card progress">
            <span class="stat-value">{stats.inProgress || 0}</span>
            <span class="stat-label">In Progress</span>
        </div>
        <div class="stat-card resolved">
            <span class="stat-value">{stats.resolved || 0}</span>
            <span class="stat-label">Resolved</span>
        </div>
    </div>

    <!-- Filters -->
    <div class="toolbar">
        <div class="search-box">
            <IconSearch size={18} stroke={1.5} />
            <input type="text" placeholder="Search feedback..." bind:value={searchQuery} />
        </div>
        <div class="filters">
            <select class="filter-select" bind:value={statusFilter}>
                <option value="all">All Status</option>
                {#each statusOptions as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
            <select class="filter-select" bind:value={typeFilter}>
                <option value="all">All Types</option>
                {#each typeOptions as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
            <select class="filter-select" bind:value={priorityFilter}>
                <option value="all">All Priority</option>
                {#each priorityOptions as opt}
                    <option value={opt.value}>{opt.label}</option>
                {/each}
            </select>
        </div>
    </div>

    <div class="content-layout">
        <!-- Feedback List -->
        <div class="feedback-list">
            {#if isLoading}
                <div class="loading-state apple-card"><IconLoader2 size={32} stroke={1.5} class="spin" /><p>Loading feedback...</p></div>
            {:else if filteredFeedback.length === 0}
                <div class="empty-state apple-card"><IconMessageCircle size={48} stroke={1.5} /><p>No feedback found</p></div>
            {:else}
                {#each filteredFeedback as item}
                    {@const typeInfo = getTypeInfo(item.type)}
                    {@const priorityInfo = getPriorityInfo(item.priority)}
                    <button class="feedback-card apple-card" class:selected={selectedFeedback?.id === item.id} on:click={() => selectedFeedback = item}>
                        <div class="card-top">
                            <div class="badges">
                                <span class="type-badge {typeInfo.color}">
                                    <svelte:component this={typeInfo.icon} size={12} /> {typeInfo.label}
                                </span>
                                <span class="priority-badge {priorityInfo.color}">
                                    <svelte:component this={priorityInfo.icon} size={12} /> {priorityInfo.label}
                                </span>
                                <span class="status-badge {item.status}">{item.status?.replace('_', ' ') || 'pending'}</span>
                            </div>
                            {#if item.screenshotUrl}
                                <IconPhoto size={16} class="has-screenshot" />
                            {/if}
                        </div>
                        <div class="card-body">
                            <div class="user-row">
                                <div class="user-avatar">{item.userName?.charAt(0) || 'U'}</div>
                                <div class="user-info">
                                    <span class="user-name">{item.userName || 'Anonymous'}</span>
                                    <span class="feedback-date">{formatDate(item.createdAt)}</span>
                                </div>
                            </div>
                            {#if item.subject}
                                <p class="feedback-subject">{item.subject}</p>
                            {/if}
                            <p class="feedback-preview">{item.message?.substring(0, 120)}{item.message?.length > 120 ? '...' : ''}</p>
                        </div>
                        {#if item.assignedToName}
                            <div class="assigned-tag"><IconUser size={12} /> {item.assignedToName}</div>
                        {/if}
                    </button>
                {/each}
            {/if}
        </div>

        <!-- Detail Panel -->
        {#if selectedFeedback}
            {@const typeInfo = getTypeInfo(selectedFeedback.type)}
            {@const priorityInfo = getPriorityInfo(selectedFeedback.priority)}
            <div class="detail-panel apple-card">
                <div class="detail-header">
                    <h2>Feedback Details</h2>
                    <button class="close-btn" on:click={() => selectedFeedback = null}><IconX size={20} /></button>
                </div>

                <div class="detail-content">
                    <!-- User Info -->
                    <div class="detail-section">
                        <div class="user-detail">
                            <div class="user-avatar large">{selectedFeedback.userName?.charAt(0) || 'U'}</div>
                            <div>
                                <p class="user-name">{selectedFeedback.userName || 'Anonymous'}</p>
                                <p class="user-email">{selectedFeedback.userEmail || 'No email'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Badges -->
                    <div class="detail-badges">
                        <span class="type-badge large {typeInfo.color}">
                            <svelte:component this={typeInfo.icon} size={14} /> {typeInfo.label}
                        </span>
                        <span class="priority-badge large {priorityInfo.color}">
                            <svelte:component this={priorityInfo.icon} size={14} /> {priorityInfo.label}
                        </span>
                    </div>

                    <!-- Message -->
                    <div class="detail-section">
                        <label class="section-label">Message</label>
                        {#if selectedFeedback.subject}
                            <p class="message-subject">{selectedFeedback.subject}</p>
                        {/if}
                        <p class="message-content">{selectedFeedback.message}</p>
                    </div>

                    <!-- Screenshot -->
                    {#if selectedFeedback.screenshotUrl}
                        <div class="detail-section">
                            <label class="section-label">Screenshot</label>
                            <a href={selectedFeedback.screenshotUrl} target="_blank" class="screenshot-preview">
                                <img src={selectedFeedback.screenshotUrl} alt="Screenshot" />
                            </a>
                        </div>
                    {/if}

                    <!-- Device Info -->
                    {#if selectedFeedback.deviceInfo}
                        <div class="detail-section">
                            <label class="section-label"><IconDeviceMobile size={14} /> Device Info</label>
                            <div class="device-info">
                                {#if selectedFeedback.deviceInfo.platform}
                                    <span>Platform: {selectedFeedback.deviceInfo.platform}</span>
                                {/if}
                                {#if selectedFeedback.deviceInfo.browser}
                                    <span>Browser: {selectedFeedback.deviceInfo.browser}</span>
                                {/if}
                                {#if selectedFeedback.deviceInfo.screenSize}
                                    <span>Screen: {selectedFeedback.deviceInfo.screenSize}</span>
                                {/if}
                                {#if selectedFeedback.deviceInfo.userAgent}
                                    <span class="user-agent">{selectedFeedback.deviceInfo.userAgent}</span>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <!-- Actions -->
                    <div class="detail-section">
                        <label class="section-label">Actions</label>
                        <div class="action-row">
                            <select class="apple-input" value={selectedFeedback.status} on:change={(e) => updateFeedback(selectedFeedback.id, { status: e.target.value })}>
                                {#each statusOptions as opt}
                                    <option value={opt.value}>{opt.label}</option>
                                {/each}
                            </select>
                            <select class="apple-input" value={selectedFeedback.priority} on:change={(e) => updateFeedback(selectedFeedback.id, { priority: e.target.value })}>
                                {#each priorityOptions as opt}
                                    <option value={opt.value}>{opt.label}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="action-row">
                            <label class="section-label">Assign to Developer</label>
                            <select class="apple-input" value={selectedFeedback.assignedTo || ''} on:change={(e) => updateFeedback(selectedFeedback.id, { assignedTo: e.target.value || null })}>
                                <option value="">Unassigned</option>
                                {#each admins as admin}
                                    <option value={admin.id}>{admin.name}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <!-- Replies -->
                    <div class="detail-section">
                        <label class="section-label">Replies ({selectedFeedback.replies?.length || 0})</label>
                        <div class="replies-list">
                            {#each selectedFeedback.replies || [] as reply}
                                <div class="reply-item">
                                    <div class="reply-header">
                                        <span class="reply-author">{reply.adminName}</span>
                                        <span class="reply-date">{formatDate(reply.createdAt)}</span>
                                    </div>
                                    <p class="reply-message">{reply.message}</p>
                                </div>
                            {/each}
                        </div>
                        <div class="reply-input">
                            <textarea class="apple-input" rows="3" placeholder="Write a reply..." bind:value={replyText}></textarea>
                            <button class="apple-btn-primary" on:click={sendReply} disabled={isSubmitting || !replyText.trim()}>
                                <IconSend size={16} /> {isSubmitting ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </div>

                    <!-- Timeline -->
                    <div class="detail-section">
                        <label class="section-label"><IconClock size={14} /> Timeline</label>
                        <div class="timeline">
                            <div class="timeline-item">
                                <span class="timeline-date">{formatDate(selectedFeedback.createdAt)}</span>
                                <span>Submitted</span>
                            </div>
                            {#if selectedFeedback.assignedAt}
                                <div class="timeline-item">
                                    <span class="timeline-date">{formatDate(selectedFeedback.assignedAt)}</span>
                                    <span>Assigned to {selectedFeedback.assignedToName}</span>
                                </div>
                            {/if}
                            {#if selectedFeedback.resolvedAt}
                                <div class="timeline-item resolved">
                                    <span class="timeline-date">{formatDate(selectedFeedback.resolvedAt)}</span>
                                    <span>Resolved</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>


<style>
    .feedback-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 28px; font-weight: 700; color: var(--theme-text, var(--apple-black)); display: flex; align-items: center; gap: 10px; }
    .header-subtitle { font-size: 15px; color: var(--theme-text-secondary, var(--apple-gray-1)); margin-top: 4px; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-lg); padding: 16px; text-align: center; }
    .stat-value { display: block; font-size: 28px; font-weight: 700; color: var(--theme-text); }
    .stat-label { font-size: 12px; color: var(--theme-text-secondary); text-transform: uppercase; }
    .stat-card.pending .stat-value { color: var(--apple-orange); }
    .stat-card.progress .stat-value { color: var(--apple-accent); }
    .stat-card.resolved .stat-value { color: var(--apple-green); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 10px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); padding: 10px 14px; flex: 1; max-width: 300px; }
    .search-box input { border: none; background: none; outline: none; flex: 1; font-size: 14px; color: var(--theme-text); }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-select { padding: 8px 12px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); font-size: 13px; color: var(--theme-text); cursor: pointer; }

    .content-layout { display: grid; grid-template-columns: 1fr 400px; gap: 24px; }
    .feedback-list { display: flex; flex-direction: column; gap: 12px; max-height: calc(100vh - 320px); overflow-y: auto; }
    .loading-state, .empty-state { text-align: center; padding: 60px 20px; color: var(--theme-text-secondary); }

    .feedback-card { padding: 16px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; text-align: left; width: 100%; }
    .feedback-card:hover { border-color: var(--apple-accent); }
    .feedback-card.selected { border-color: var(--apple-accent); background: rgba(0, 122, 255, 0.05); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }

    .type-badge, .priority-badge, .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: capitalize; }
    .type-badge.red { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .type-badge.yellow { background: rgba(255, 204, 0, 0.15); color: #B8860B; }
    .type-badge.purple { background: rgba(88, 86, 214, 0.1); color: #5856D6; }
    .type-badge.orange { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .type-badge.blue { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .type-badge.large, .priority-badge.large { padding: 5px 12px; font-size: 12px; }

    .priority-badge.red { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .priority-badge.yellow { background: rgba(255, 204, 0, 0.15); color: #B8860B; }
    .priority-badge.gray { background: rgba(142, 142, 147, 0.1); color: var(--apple-gray-1); }

    .status-badge { background: rgba(142, 142, 147, 0.1); color: var(--apple-gray-1); }
    .status-badge.pending { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .status-badge.in_progress { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .status-badge.resolved { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }

    .card-body { margin-bottom: 8px; }
    .user-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--apple-accent), #5856D6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; flex-shrink: 0; }
    .user-avatar.large { width: 48px; height: 48px; font-size: 18px; }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 13px; font-weight: 600; color: var(--theme-text); }
    .user-email { font-size: 12px; color: var(--theme-text-secondary); }
    .feedback-date { font-size: 11px; color: var(--theme-text-secondary); }
    .feedback-subject { font-size: 14px; font-weight: 600; color: var(--theme-text); margin-bottom: 4px; }
    .feedback-preview { font-size: 13px; color: var(--theme-text-secondary); line-height: 1.4; }
    .assigned-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--apple-accent); background: rgba(0, 122, 255, 0.1); padding: 3px 8px; border-radius: 8px; }
    :global(.has-screenshot) { color: var(--apple-accent); }

    .detail-panel { position: sticky; top: 24px; max-height: calc(100vh - 320px); overflow-y: auto; padding: 20px; }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--theme-border-light); }
    .detail-header h2 { font-size: 18px; font-weight: 600; }
    .close-btn { background: none; border: none; color: var(--theme-text-secondary); cursor: pointer; }
    .detail-content { display: flex; flex-direction: column; gap: 20px; }
    .detail-section { display: flex; flex-direction: column; gap: 8px; }
    .section-label { font-size: 12px; font-weight: 600; color: var(--theme-text-secondary); text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
    .user-detail { display: flex; align-items: center; gap: 12px; }
    .detail-badges { display: flex; gap: 8px; }
    .message-subject { font-size: 15px; font-weight: 600; color: var(--theme-text); }
    .message-content { font-size: 14px; color: var(--theme-text); line-height: 1.6; white-space: pre-wrap; }

    .screenshot-preview { display: block; border-radius: var(--apple-radius-md); overflow: hidden; border: 1px solid var(--theme-border); }
    .screenshot-preview img { width: 100%; max-height: 200px; object-fit: cover; }

    .device-info { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--theme-text-secondary); background: var(--theme-border-light); padding: 12px; border-radius: var(--apple-radius-sm); }
    .user-agent { font-size: 10px; word-break: break-all; opacity: 0.7; }

    .action-row { display: flex; gap: 8px; }
    .action-row .apple-input { flex: 1; }

    .replies-list { display: flex; flex-direction: column; gap: 12px; max-height: 200px; overflow-y: auto; }
    .reply-item { background: var(--theme-border-light); padding: 12px; border-radius: var(--apple-radius-sm); }
    .reply-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .reply-author { font-size: 12px; font-weight: 600; color: var(--apple-accent); }
    .reply-date { font-size: 11px; color: var(--theme-text-secondary); }
    .reply-message { font-size: 13px; color: var(--theme-text); line-height: 1.5; }
    .reply-input { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .reply-input textarea { resize: none; }
    .reply-input button { align-self: flex-end; }

    .timeline { display: flex; flex-direction: column; gap: 8px; }
    .timeline-item { display: flex; gap: 12px; font-size: 12px; color: var(--theme-text-secondary); padding-left: 16px; border-left: 2px solid var(--theme-border); }
    .timeline-item.resolved { border-color: var(--apple-green); }
    .timeline-date { color: var(--theme-text-secondary); min-width: 120px; }

    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    @media (max-width: 900px) {
        .content-layout { grid-template-columns: 1fr; }
        .detail-panel { position: fixed; inset: 0; max-height: none; z-index: 100; border-radius: 0; }
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
</style>
