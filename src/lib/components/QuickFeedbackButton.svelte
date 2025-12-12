<script>
    import { createEventDispatcher } from 'svelte';
    import { IconMessageCircle } from '@tabler/icons-svelte';
    
    const dispatch = createEventDispatcher();
    
    function openFeedback() {
        dispatch('open');
    }
</script>

<button class="quick-feedback-fab" on:click={openFeedback} aria-label="Send Feedback">
    <IconMessageCircle size={24} stroke={1.5} />
</button>

<style>
    .quick-feedback-fab {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 56px;
        height: 56px;
        background: var(--apple-accent, #007AFF);
        border: none;
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 122, 255, 0.4);
        transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
        z-index: 50;
    }

    .quick-feedback-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 24px rgba(0, 122, 255, 0.5);
    }

    .quick-feedback-fab:active {
        transform: scale(0.95);
    }

    @media (min-width: 1024px) {
        .quick-feedback-fab {
            bottom: 30px;
            right: 30px;
        }
    }
</style>
