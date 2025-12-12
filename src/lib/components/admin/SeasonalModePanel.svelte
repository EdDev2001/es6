<script>
    import { seasonalPrefs, activeHoliday, holidays } from '$lib/stores/seasonalTheme.js';
    import { dashboardPrefs } from '$lib/stores/adminDashboard.js';
    import { IconSnowflake, IconPumpkinScary, IconSparkles, IconCalendarEvent, IconToggleLeft, IconToggleRight } from '@tabler/icons-svelte';

    $: currentHoliday = $activeHoliday;
    $: isEnabled = $dashboardPrefs.holidayModeEnabled;
    $: isScheduled = $dashboardPrefs.holidayModeScheduled;

    function toggleHolidayMode() {
        dashboardPrefs.toggleHolidayMode();
        if ($dashboardPrefs.holidayModeEnabled) {
            seasonalPrefs.toggle();
        }
    }

    function setScheduled(value) {
        dashboardPrefs.setHolidayScheduled(value);
    }

    function getHolidayIcon(id) {
        switch (id) {
            case 'christmas': return IconSnowflake;
            case 'halloween': return IconPumpkinScary;
            case 'newYear': return IconSparkles;
            default: return IconCalendarEvent;
        }
    }
</script>

{#if currentHoliday || Object.keys(holidays).length > 0}
    <div class="seasonal-panel" style="--seasonal-primary: {currentHoliday?.colors?.primary || 'var(--apple-accent)'}">
        <div class="panel-content">
            <div class="seasonal-info">
                {#if currentHoliday}
                    <span class="seasonal-emoji">{currentHoliday.emoji}</span>
                    <div class="seasonal-text">
                        <span class="seasonal-title">
                            {currentHoliday.name} Mode {isEnabled ? 'Active' : 'Available'}
                        </span>
                        <span class="seasonal-desc">
                            {isEnabled ? 'Themed visuals and animations enabled' : 'Enable to activate holiday decorations'}
                        </span>
                    </div>
                {:else}
                    <span class="seasonal-emoji">🎉</span>
                    <div class="seasonal-text">
                        <span class="seasonal-title">Holiday Mode</span>
                        <span class="seasonal-desc">No active holiday theme</span>
                    </div>
                {/if}
            </div>

            <div class="seasonal-controls">
                <div class="control-group">
                    <span class="control-label">Theme</span>
                    <button class="toggle-btn" class:active={isEnabled} on:click={toggleHolidayMode}>
                        {#if isEnabled}
                            <IconToggleRight size={24} stroke={1.5} />
                            <span>ON</span>
                        {:else}
                            <IconToggleLeft size={24} stroke={1.5} />
                            <span>OFF</span>
                        {/if}
                    </button>
                </div>

                <div class="control-group">
                    <span class="control-label">Schedule</span>
                    <div class="schedule-options">
                        <button 
                            class="schedule-btn" 
                            class:active={!isScheduled}
                            on:click={() => setScheduled(false)}
                        >
                            Manual
                        </button>
                        <button 
                            class="schedule-btn" 
                            class:active={isScheduled}
                            on:click={() => setScheduled(true)}
                        >
                            Auto
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {#if isEnabled && currentHoliday}
            <div class="seasonal-effects">
                <span class="effect-label">Active Effects:</span>
                <div class="effects-list">
                    {#each currentHoliday.effects.slice(0, 3) as effect}
                        <span class="effect-tag">{effect}</span>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    .seasonal-panel {
        background: linear-gradient(135deg, 
            color-mix(in srgb, var(--seasonal-primary) 10%, var(--theme-card-bg, var(--apple-white))),
            var(--theme-card-bg, var(--apple-white))
        );
        border: 1px solid color-mix(in srgb, var(--seasonal-primary) 20%, transparent);
        border-radius: var(--apple-radius-xl);
        padding: 20px 24px;
        margin-bottom: 24px;
    }

    .panel-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
    }

    .seasonal-info {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .seasonal-emoji {
        font-size: 32px;
        line-height: 1;
    }

    .seasonal-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .seasonal-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
    }

    .seasonal-desc {
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .seasonal-controls {
        display: flex;
        align-items: center;
        gap: 24px;
    }

    .control-group {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .control-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        text-transform: uppercase;
    }

    .toggle-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--theme-border-light, var(--apple-gray-5));
        border: none;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .toggle-btn.active {
        background: var(--apple-green);
        color: white;
    }

    .schedule-options {
        display: flex;
        background: var(--theme-border-light, var(--apple-gray-5));
        border-radius: 8px;
        padding: 2px;
    }

    .schedule-btn {
        padding: 6px 12px;
        background: none;
        border: none;
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        border-radius: 6px;
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .schedule-btn.active {
        background: var(--theme-card-bg, var(--apple-white));
        color: var(--theme-text, var(--apple-black));
        box-shadow: var(--apple-shadow-sm);
    }

    .seasonal-effects {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .effect-label {
        font-size: 11px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .effects-list {
        display: flex;
        gap: 8px;
    }

    .effect-tag {
        font-size: 11px;
        font-weight: 500;
        padding: 4px 10px;
        background: color-mix(in srgb, var(--seasonal-primary) 15%, transparent);
        color: var(--seasonal-primary);
        border-radius: 12px;
        text-transform: capitalize;
    }

    @media (max-width: 768px) {
        .seasonal-panel {
            padding: 16px 18px;
            margin-bottom: 18px;
        }

        .panel-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
        }

        .seasonal-emoji {
            font-size: 28px;
        }

        .seasonal-title {
            font-size: 14px;
        }

        .seasonal-desc {
            font-size: 11px;
        }

        .seasonal-controls {
            width: 100%;
            justify-content: space-between;
        }

        .control-label {
            font-size: 11px;
        }

        .toggle-btn {
            padding: 5px 10px;
            font-size: 11px;
        }

        .schedule-btn {
            padding: 5px 10px;
            font-size: 11px;
        }

        .seasonal-effects {
            margin-top: 14px;
            padding-top: 14px;
        }

        .effect-tag {
            font-size: 10px;
            padding: 3px 8px;
        }
    }

    @media (max-width: 480px) {
        .seasonal-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
        }

        .control-group {
            width: 100%;
            justify-content: space-between;
        }
    }
</style>
