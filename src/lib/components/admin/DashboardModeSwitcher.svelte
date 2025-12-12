<script>
    import { dashboardPrefs, DASHBOARD_MODES } from '$lib/stores/adminDashboard.js';
    import { IconLayoutDashboard, IconApple, IconLayoutList } from '@tabler/icons-svelte';

    $: currentMode = $dashboardPrefs.viewMode;

    function setMode(mode) {
        dashboardPrefs.setViewMode(mode);
    }

    const modes = [
        { id: DASHBOARD_MODES.CLASSIC, label: 'Classic', icon: IconLayoutDashboard },
        { id: DASHBOARD_MODES.APPLE, label: 'Apple', icon: IconApple },
        { id: DASHBOARD_MODES.COMPACT, label: 'Compact', icon: IconLayoutList }
    ];
</script>

<div class="mode-switcher">
    <span class="switcher-label">View Mode</span>
    <div class="mode-buttons">
        {#each modes as mode}
            <button 
                class="mode-btn" 
                class:active={currentMode === mode.id}
                on:click={() => setMode(mode.id)}
                title={mode.label}
            >
                <svelte:component this={mode.icon} size={16} stroke={1.5} />
                <span class="mode-label">{mode.label}</span>
            </button>
        {/each}
    </div>
</div>

<style>
    .mode-switcher {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 8px 14px;
        border-radius: var(--apple-radius-md);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .switcher-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--apple-gray-1);
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    .mode-buttons {
        display: flex;
        background: var(--apple-gray-6);
        border-radius: var(--apple-radius-sm);
        padding: 2px;
    }

    .mode-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 10px;
        background: none;
        border: none;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        color: var(--apple-gray-1);
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .mode-btn:hover {
        color: var(--apple-black);
    }

    .mode-btn.active {
        background: var(--apple-white);
        color: var(--apple-accent);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .mode-label {
        display: none;
    }

    @media (min-width: 640px) {
        .mode-label {
            display: inline;
        }
    }

    @media (max-width: 768px) {
        .mode-switcher {
            padding: 6px 12px;
            gap: 10px;
            background: var(--theme-card-bg, var(--apple-white));
            backdrop-filter: none;
            border: none;
            box-shadow: var(--apple-shadow-sm);
        }

        .switcher-label {
            font-size: 10px;
        }

        .mode-btn {
            padding: 6px 10px;
        }
    }

    @media (max-width: 480px) {
        .mode-switcher {
            width: 100%;
            justify-content: center;
            padding: 6px 10px;
        }

        .switcher-label {
            display: none;
        }

        .mode-buttons {
            justify-content: center;
        }

        .mode-btn {
            padding: 6px 12px;
        }

        .mode-label {
            display: inline;
            font-size: 10px;
        }
    }
</style>
