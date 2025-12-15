<!-- src/lib/components/ToastContainer.svelte -->
<!-- Global toast notification container for real-time announcements -->
<script>
    import { toastStore } from '$lib/stores/toastStore';
    import { fly, fade } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    
    function handleClick(toast) {
        if (toast.onClick) {
            toast.onClick();
        }
        toastStore.dismiss(toast.id);
    }
    
    function getIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'urgent': return '🚨';
            case 'announcement': return '📢';
            default: return 'ℹ️';
        }
    }
</script>

<div class="toast-container" role="region" aria-label="Notifications">
    {#each $toastStore as toast (toast.id)}
        <div 
            class="toast toast-{toast.type}"
            role="alert"
            in:fly={{ x: 300, duration: 300 }}
            out:fade={{ duration: 200 }}
            animate:flip={{ duration: 300 }}
        >
            <div class="toast-icon">{getIcon(toast.type)}</div>
            <div 
                class="toast-content"
                class:clickable={toast.onClick}
                on:click={() => handleClick(toast)}
                on:keydown={(e) => e.key === 'Enter' && handleClick(toast)}
                role={toast.onClick ? 'button' : 'status'}
                tabindex={toast.onClick ? 0 : -1}
            >
                <strong class="toast-title">{toast.title}</strong>
                {#if toast.body}
                    <p class="toast-body">{toast.body}</p>
                {/if}
            </div>
            <button 
                class="toast-close" 
                on:click|stopPropagation={() => toastStore.dismiss(toast.id)}
                aria-label="Dismiss notification"
            >
                ×
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 400px;
        pointer-events: none;
    }
    
    .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        background: var(--theme-card-bg, white);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        border-left: 4px solid var(--apple-accent, #007AFF);
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .toast-success {
        border-left-color: #34C759;
        background: linear-gradient(135deg, rgba(52, 199, 89, 0.1), var(--theme-card-bg, white));
    }
    
    .toast-error {
        border-left-color: #FF3B30;
        background: linear-gradient(135deg, rgba(255, 59, 48, 0.1), var(--theme-card-bg, white));
    }
    
    .toast-warning {
        border-left-color: #FF9500;
        background: linear-gradient(135deg, rgba(255, 149, 0, 0.1), var(--theme-card-bg, white));
    }
    
    .toast-urgent {
        border-left-color: #FF3B30;
        background: linear-gradient(135deg, rgba(255, 59, 48, 0.15), var(--theme-card-bg, white));
        animation: slideIn 0.3s ease-out, pulse 2s infinite;
    }
    
    .toast-announcement {
        border-left-color: #5856D6;
        background: linear-gradient(135deg, rgba(88, 86, 214, 0.1), var(--theme-card-bg, white));
    }
    
    @keyframes pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(255, 59, 48, 0.2); }
        50% { box-shadow: 0 4px 30px rgba(255, 59, 48, 0.4); }
    }
    
    .toast-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
    }
    
    .toast-content {
        flex: 1;
        min-width: 0;
    }
    
    .toast-content.clickable {
        cursor: pointer;
    }
    
    .toast-content.clickable:hover .toast-title {
        text-decoration: underline;
    }
    
    .toast-title {
        display: block;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--theme-text, #1d1d1f);
        margin-bottom: 0.25rem;
    }
    
    .toast-body {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--theme-text-secondary, #86868b);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .toast-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: var(--theme-text-secondary, #86868b);
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.6;
        transition: opacity 0.2s;
    }
    
    .toast-close:hover {
        opacity: 1;
    }
    
    /* Mobile responsive */
    @media (max-width: 480px) {
        .toast-container {
            left: 1rem;
            right: 1rem;
            max-width: none;
        }
    }
</style>
