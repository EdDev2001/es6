<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { 
        getSmartSuggestions, 
        dismissSuggestion, 
        logSuggestionAction,
        SuggestionPriority 
    } from '$lib/ai/smartLeaveSuggestions.js';

    // Props
    export let userId = null;
    export let attendanceRecords = [];
    export let workConfig = {};
    export let maxSuggestions = 3;
    export let compact = false;

    // State
    let suggestions = [];
    let loading = true;
    let expandedId = null;

    // Load suggestions
    async function loadSuggestions() {
        if (!browser || !userId) {
            loading = false;
            return;
        }

        try {
            suggestions = await getSmartSuggestions(userId, attendanceRecords, workConfig);
            suggestions = suggestions.slice(0, maxSuggestions);
        } catch (error) {
            console.error('Error loading suggestions:', error);
            suggestions = [];
        }
        loading = false;
    }

    // Handle dismiss
    async function handleDismiss(suggestion, index) {
        await dismissSuggestion(userId, suggestion.type);
        await logSuggestionAction(userId, suggestion, 'dismissed');
        suggestions = suggestions.filter((_, i) => i !== index);
    }

    // Handle action click
    async function handleAction(suggestion) {
        await logSuggestionAction(userId, suggestion, suggestion.action?.type || 'clicked');
        
        // Dispatch event for parent to handle
        const event = new CustomEvent('suggestion-action', {
            detail: { suggestion, action: suggestion.action }
        });
        document.dispatchEvent(event);
    }

    // Toggle expanded state
    function toggleExpand(id) {
        expandedId = expandedId === id ? null : id;
    }

    onMount(() => {
        loadSuggestions();
    });

    // Reload when records change
    $: if (attendanceRecords.length > 0 && userId) {
        loadSuggestions();
    }

    // Priority colors
    const priorityColors = {
        [SuggestionPriority.URGENT]: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
        [SuggestionPriority.HIGH]: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
        [SuggestionPriority.MEDIUM]: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
        [SuggestionPriority.LOW]: { bg: '#f0fdf4', border: '#86efac', text: '#166534' }
    };
</script>

{#if loading}
    <div class="suggestions-loading" class:compact>
        <div class="loading-shimmer"></div>
        <div class="loading-shimmer short"></div>
    </div>
{:else if suggestions.length > 0}
    <div class="smart-suggestions" class:compact>
        <div class="suggestions-header">
            <div class="header-icon">💡</div>
            <h3>Smart Suggestions</h3>
            <span class="badge">{suggestions.length}</span>
        </div>

        <div class="suggestions-list">
            {#each suggestions as suggestion, index (suggestion.type + index)}
                {@const colors = priorityColors[suggestion.priority] || priorityColors.medium}
                <div 
                    class="suggestion-card"
                    class:urgent={suggestion.priority === SuggestionPriority.URGENT}
                    class:expanded={expandedId === index}
                    style="--bg-color: {colors.bg}; --border-color: {colors.border}; --text-color: {colors.text}"
                >
                    <div class="card-main" on:click={() => toggleExpand(index)}>
                        <div class="suggestion-icon">{suggestion.icon || '💡'}</div>
                        
                        <div class="suggestion-content">
                            <div class="suggestion-header">
                                <span class="priority-badge {suggestion.priority}">
                                    {suggestion.priority}
                                </span>
                                {#if suggestion.requiresAttention}
                                    <span class="attention-badge">Needs Attention</span>
                                {/if}
                            </div>
                            
                            <h4 class="suggestion-title">{suggestion.title}</h4>
                            <p class="suggestion-message">{suggestion.message}</p>
                        </div>

                        <button 
                            class="dismiss-btn" 
                            on:click|stopPropagation={() => handleDismiss(suggestion, index)}
                            title="Dismiss"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {#if expandedId === index}
                        <div class="card-expanded">
                            {#if suggestion.insights?.length > 0}
                                <div class="insights">
                                    <span class="insights-label">💭 Insights:</span>
                                    <ul>
                                        {#each suggestion.insights as insight}
                                            <li>{insight}</li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}

                            {#if suggestion.action}
                                <button 
                                    class="action-btn"
                                    on:click={() => handleAction(suggestion)}
                                >
                                    {suggestion.action.label || 'Take Action'}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </button>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .smart-suggestions {
        font-family: system-ui, -apple-system, sans-serif;
    }

    .suggestions-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .header-icon {
        font-size: 1.25rem;
    }

    .suggestions-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.375rem;
        background: #4f46e5;
        color: white;
        border-radius: 50px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .suggestions-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .suggestion-card {
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s ease;
    }

    .suggestion-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .suggestion-card.urgent {
        animation: pulse-border 2s ease-in-out infinite;
    }

    @keyframes pulse-border {
        0%, 100% { border-color: var(--border-color); }
        50% { border-color: #ef4444; }
    }

    .card-main {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        cursor: pointer;
    }

    .suggestion-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .suggestion-content {
        flex: 1;
        min-width: 0;
    }

    .suggestion-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.375rem;
    }

    .priority-badge {
        display: inline-block;
        padding: 0.125rem 0.5rem;
        border-radius: 50px;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .priority-badge.urgent {
        background: #fecaca;
        color: #991b1b;
    }

    .priority-badge.high {
        background: #fde68a;
        color: #92400e;
    }

    .priority-badge.medium {
        background: #bfdbfe;
        color: #1e40af;
    }

    .priority-badge.low {
        background: #bbf7d0;
        color: #166534;
    }

    .attention-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.5rem;
        background: #ef4444;
        color: white;
        border-radius: 50px;
        font-size: 0.625rem;
        font-weight: 600;
    }

    .suggestion-title {
        margin: 0 0 0.25rem;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-color);
    }

    .suggestion-message {
        margin: 0;
        font-size: 0.8125rem;
        color: #6b7280;
        line-height: 1.4;
    }

    .dismiss-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .dismiss-btn:hover {
        background: rgba(0, 0, 0, 0.1);
        color: #6b7280;
    }

    .card-expanded {
        padding: 0 1rem 1rem;
        padding-left: 3.25rem;
        animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .insights {
        margin-bottom: 0.75rem;
    }

    .insights-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 0.375rem;
    }

    .insights ul {
        margin: 0;
        padding-left: 1.25rem;
    }

    .insights li {
        font-size: 0.8125rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--text-color);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .action-btn:hover {
        opacity: 0.9;
        transform: translateX(2px);
    }

    /* Loading state */
    .suggestions-loading {
        padding: 1rem;
    }

    .loading-shimmer {
        height: 80px;
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 12px;
        margin-bottom: 0.75rem;
    }

    .loading-shimmer.short {
        height: 60px;
        width: 80%;
    }

    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* Compact mode */
    .compact .suggestions-header {
        margin-bottom: 0.75rem;
    }

    .compact .suggestions-header h3 {
        font-size: 0.875rem;
    }

    .compact .card-main {
        padding: 0.75rem;
    }

    .compact .suggestion-icon {
        font-size: 1.25rem;
    }

    .compact .suggestion-title {
        font-size: 0.875rem;
    }

    .compact .suggestion-message {
        font-size: 0.75rem;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
        .card-main {
            padding: 0.875rem;
        }

        .suggestion-icon {
            font-size: 1.25rem;
        }

        .suggestion-message {
            font-size: 0.75rem;
        }

        .card-expanded {
            padding-left: 1rem;
        }
    }
</style>
