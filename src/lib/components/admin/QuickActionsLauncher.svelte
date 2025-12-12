<script>
    import { createEventDispatcher } from 'svelte';
    import { IconSpeakerphone, IconUserPlus, IconDownload, IconQrcode, IconChevronDown } from '@tabler/icons-svelte';

    const dispatch = createEventDispatcher();
    let showExportMenu = false;

    function handleAction(action) {
        dispatch('action', { type: action });
    }

    function handleExport(format) {
        dispatch('action', { type: 'export', format });
        showExportMenu = false;
    }

    function closeExportMenu(e) {
        if (!e.target.closest('.export-dropdown')) showExportMenu = false;
    }
</script>

<svelte:window on:click={closeExportMenu} />

<div class="quick-actions">
    <div class="actions-row">
        <button class="action-btn blue" on:click={() => handleAction('announcement')} title="Create Announcement">
            <IconSpeakerphone size={18} stroke={1.5} />
            <span>Announce</span>
        </button>

        <button class="action-btn green" on:click={() => handleAction('addUser')} title="Add User">
            <IconUserPlus size={18} stroke={1.5} />
            <span>Add User</span>
        </button>

        <div class="export-dropdown">
            <button class="action-btn purple" on:click|stopPropagation={() => showExportMenu = !showExportMenu} title="Export">
                <IconDownload size={18} stroke={1.5} />
                <span>Export</span>
                <span class="chevron" class:rotated={showExportMenu}>
                    <IconChevronDown size={12} stroke={2} />
                </span>
            </button>
            {#if showExportMenu}
                <div class="export-menu">
                    <button on:click={() => handleExport('csv')}>CSV</button>
                    <button on:click={() => handleExport('excel')}>Excel</button>
                    <button on:click={() => handleExport('pdf')}>PDF</button>
                </div>
            {/if}
        </div>

        <button class="action-btn orange" on:click={() => handleAction('manualScan')} title="Manual Scan">
            <IconQrcode size={18} stroke={1.5} />
            <span>Scan</span>
        </button>
    </div>
</div>

<style>
    .quick-actions {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-md);
        padding: 12px;
        box-shadow: var(--apple-shadow-sm);
    }

    .actions-row {
        display: flex;
        gap: 8px;
    }

    .action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 12px;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
    }

    .action-btn.blue { background: var(--apple-accent); }
    .action-btn.green { background: var(--apple-green); }
    .action-btn.purple { background: var(--apple-purple); }
    .action-btn.orange { background: var(--apple-orange); }

    .action-btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
    }

    .export-dropdown {
        flex: 1;
        position: relative;
    }

    .export-dropdown .action-btn {
        width: 100%;
    }

    .chevron {
        transition: transform 0.2s ease;
    }

    .chevron.rotated {
        transform: rotate(180deg);
    }

    .export-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: 8px;
        box-shadow: var(--apple-shadow-lg);
        padding: 4px;
        z-index: 100;
        margin-top: 4px;
    }

    .export-menu button {
        display: block;
        width: 100%;
        padding: 8px 12px;
        background: none;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        text-align: left;
        cursor: pointer;
        color: var(--theme-text);
    }

    .export-menu button:hover {
        background: var(--theme-border-light);
    }

    @media (max-width: 768px) {
        .action-btn span:not(.chevron) {
            display: none;
        }

        .action-btn {
            padding: 10px;
        }
    }

    @media (max-width: 480px) {
        .actions-row {
            gap: 6px;
        }

        .action-btn {
            padding: 8px;
        }
    }
</style>
