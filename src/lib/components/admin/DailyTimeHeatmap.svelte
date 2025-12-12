<script>
    import { IconClock } from '@tabler/icons-svelte';

    export let data = [];

    // Generate time slots from 6 AM to 6 PM
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const hour = i + 6;
        return {
            label: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`,
            hour
        };
    });

    // Days of the week
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    $: maxValue = Math.max(...data.flatMap(d => d.values), 1);

    function getCellColor(value) {
        if (!value) return 'var(--theme-border-light, var(--apple-gray-5))';
        const intensity = value / maxValue;
        if (intensity >= 0.8) return 'var(--apple-red)';
        if (intensity >= 0.6) return 'var(--apple-orange)';
        if (intensity >= 0.4) return 'var(--apple-yellow)';
        if (intensity >= 0.2) return 'var(--apple-green)';
        return 'rgba(52, 199, 89, 0.3)';
    }

    function getCellOpacity(value) {
        if (!value) return 0.3;
        return 0.4 + (value / maxValue) * 0.6;
    }

    function getValue(dayIndex, hourIndex) {
        const dayData = data[dayIndex];
        return dayData?.values?.[hourIndex] || 0;
    }
</script>

<div class="time-heatmap">
    <div class="heatmap-header">
        <h3>
            <IconClock size={18} stroke={1.5} />
            Weekly Attendance Heatmap
        </h3>
        <span class="subtitle">Scan density by day and time</span>
    </div>

    <div class="heatmap-container">
        <!-- Time labels (top) -->
        <div class="time-labels">
            <div class="corner-cell"></div>
            {#each timeSlots as slot}
                <div class="time-label">{slot.label}</div>
            {/each}
        </div>

        <!-- Grid rows -->
        {#each days as day, dayIndex}
            <div class="heatmap-row">
                <div class="day-label">{day}</div>
                {#each timeSlots as slot, hourIndex}
                    {@const value = getValue(dayIndex, hourIndex)}
                    <div 
                        class="heatmap-cell"
                        style="background: {getCellColor(value)}; opacity: {getCellOpacity(value)}"
                        title="{day} {slot.label}: {value} scans"
                    >
                        {#if value > 0}
                            <span class="cell-value">{value}</span>
                        {/if}
                    </div>
                {/each}
            </div>
        {/each}
    </div>

    <div class="heatmap-legend">
        <span class="legend-label">Less</span>
        <div class="legend-scale">
            <div class="scale-cell" style="background: rgba(52, 199, 89, 0.3)"></div>
            <div class="scale-cell" style="background: var(--apple-green)"></div>
            <div class="scale-cell" style="background: var(--apple-yellow)"></div>
            <div class="scale-cell" style="background: var(--apple-orange)"></div>
            <div class="scale-cell" style="background: var(--apple-red)"></div>
        </div>
        <span class="legend-label">More</span>
    </div>
</div>

<style>
    .time-heatmap {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-xl);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
    }

    .heatmap-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .heatmap-header h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0 0 4px;
    }

    .subtitle {
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .heatmap-container {
        padding: 16px 20px;
        overflow-x: auto;
    }

    .time-labels {
        display: flex;
        margin-bottom: 4px;
    }

    .corner-cell {
        width: 40px;
        flex-shrink: 0;
    }

    .time-label {
        flex: 1;
        min-width: 40px;
        text-align: center;
        font-size: 10px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        padding: 4px 2px;
    }

    .heatmap-row {
        display: flex;
        margin-bottom: 4px;
    }

    .day-label {
        width: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        font-size: 11px;
        font-weight: 500;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .heatmap-cell {
        flex: 1;
        min-width: 40px;
        height: 32px;
        margin: 1px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .heatmap-cell:hover {
        transform: scale(1.1);
        z-index: 1;
        box-shadow: var(--apple-shadow-md);
    }

    .cell-value {
        font-size: 9px;
        font-weight: 600;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .heatmap-legend {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 16px;
        border-top: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .legend-label {
        font-size: 11px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .legend-scale {
        display: flex;
        gap: 2px;
    }

    .scale-cell {
        width: 20px;
        height: 12px;
        border-radius: 2px;
    }

    @media (max-width: 768px) {
        .heatmap-header {
            padding: 16px 18px;
        }

        .heatmap-header h3 {
            font-size: 15px;
        }

        .heatmap-container {
            padding: 14px 16px;
        }

        .time-label {
            font-size: 9px;
            min-width: 35px;
        }

        .day-label {
            font-size: 10px;
            width: 35px;
        }

        .heatmap-cell {
            min-width: 35px;
            height: 28px;
        }

        .heatmap-legend {
            padding: 14px;
            gap: 8px;
        }

        .legend-label {
            font-size: 10px;
        }

        .scale-cell {
            width: 16px;
            height: 10px;
        }
    }

    @media (max-width: 640px) {
        .time-label {
            font-size: 8px;
            min-width: 28px;
        }

        .day-label {
            width: 30px;
            font-size: 9px;
        }

        .heatmap-cell {
            min-width: 28px;
            height: 24px;
        }

        .cell-value {
            font-size: 7px;
        }
    }

    @media (max-width: 480px) {
        .heatmap-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .time-labels,
        .heatmap-row {
            min-width: 400px;
        }
    }
</style>
