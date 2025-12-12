<script>
    import { IconCalendar, IconTrendingUp, IconTrendingDown, IconMaximize, IconX } from '@tabler/icons-svelte';

    export let analytics = {
        totalDaysTracked: 0,
        avgDailyAttendance: 0,
        mostAbsentDay: '',
        bestAttendanceDay: '',
        dailyData: [],
        patterns: []
    };

    let showModal = false;

    // Calculate max value for bar scaling
    $: maxValue = Math.max(...analytics.dailyData.flatMap(d => [d.present || 0, d.absent || 0]), 1);

    // Get bar height percentage
    function getBarHeight(value) {
        return (value / maxValue) * 100;
    }

    // Limit displayed data for small chart
    $: displayData = analytics.dailyData.slice(-10);
    $: modalDisplayData = analytics.dailyData.slice(-20);

    function openModal() {
        showModal = true;
    }

    function closeModal() {
        showModal = false;
    }
</script>

<div class="analytics">
    <div class="header">
        <div class="title">
            <IconCalendar size={14} stroke={1.5} />
            <span>Monthly Analytics</span>
        </div>
        <div class="header-right">
            <div class="legend">
                <span class="legend-item present">Present</span>
                <span class="legend-item absent">Absent</span>
            </div>
            <button class="expand-btn" on:click={openModal} title="Expand">
                <IconMaximize size={14} stroke={1.5} />
            </button>
        </div>
    </div>

    <div class="stats-row">
        <div class="stat">
            <span class="stat-value">{analytics.totalDaysTracked}</span>
            <span class="stat-label">Days</span>
        </div>
        <div class="stat">
            <span class="stat-value">{analytics.avgDailyAttendance}%</span>
            <span class="stat-label">Avg Rate</span>
        </div>
        <div class="stat best">
            <span class="stat-value">{analytics.bestAttendanceDay || 'N/A'}</span>
            <span class="stat-label">Best Day</span>
        </div>
        <div class="stat worst">
            <span class="stat-value">{analytics.mostAbsentDay || 'N/A'}</span>
            <span class="stat-label">Most Absent</span>
        </div>
    </div>

    <div class="chart-container">
        <div class="bar-chart">
            {#if displayData.length > 0}
                {#each displayData as day, i}
                    <div class="bar-group" title="{day.date || `Day ${i + 1}`}">
                        <div class="bars">
                            <div class="bar present" style="height: {getBarHeight(day.present || 0)}%">
                                <span class="bar-tooltip">{day.present || 0}</span>
                            </div>
                            <div class="bar absent" style="height: {getBarHeight(day.absent || 0)}%">
                                <span class="bar-tooltip">{day.absent || 0}</span>
                            </div>
                        </div>
                        <span class="bar-label">{day.label || (i + 1)}</span>
                    </div>
                {/each}
            {:else}
                <div class="no-data">No data available</div>
            {/if}
        </div>
    </div>

    {#if analytics.patterns.length > 0}
        <div class="patterns">
            {#each analytics.patterns.slice(0, 2) as pattern}
                <div class="pattern {pattern.type}">
                    {#if pattern.type === 'positive'}
                        <IconTrendingUp size={12} stroke={2} />
                    {:else}
                        <IconTrendingDown size={12} stroke={2} />
                    {/if}
                    <span>{pattern.message}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Expanded Modal -->
{#if showModal}
    <div class="modal-overlay" on:click={closeModal} role="dialog" aria-modal="true">
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <div class="modal-title">
                    <IconCalendar size={20} stroke={1.5} />
                    <h2>Monthly Analytics</h2>
                </div>
                <button class="close-btn" on:click={closeModal}>
                    <IconX size={20} stroke={2} />
                </button>
            </div>

            <div class="modal-body">
                <!-- Stats Grid -->
                <div class="modal-stats-grid">
                    <div class="modal-stat">
                        <span class="modal-stat-value">{analytics.totalDaysTracked}</span>
                        <span class="modal-stat-label">Total Days Tracked</span>
                    </div>
                    <div class="modal-stat">
                        <span class="modal-stat-value">{analytics.avgDailyAttendance}%</span>
                        <span class="modal-stat-label">Average Attendance Rate</span>
                    </div>
                    <div class="modal-stat best">
                        <span class="modal-stat-value">{analytics.bestAttendanceDay || 'N/A'}</span>
                        <span class="modal-stat-label">Best Attendance Day</span>
                    </div>
                    <div class="modal-stat worst">
                        <span class="modal-stat-value">{analytics.mostAbsentDay || 'N/A'}</span>
                        <span class="modal-stat-label">Most Absent Day</span>
                    </div>
                </div>

                <!-- Large Bar Chart -->
                <div class="modal-chart-section">
                    <div class="chart-header">
                        <h4>Daily Attendance Overview</h4>
                        <div class="legend-large">
                            <span class="legend-item present">Present</span>
                            <span class="legend-item absent">Absent</span>
                        </div>
                    </div>
                    <div class="modal-chart-container">
                        <div class="bar-chart modal-bar-chart">
                            {#if modalDisplayData.length > 0}
                                {#each modalDisplayData as day, i}
                                    <div class="bar-group" title="{day.date || `Day ${i + 1}`}">
                                        <div class="bars modal-bars">
                                            <div class="bar present" style="height: {getBarHeight(day.present || 0)}%">
                                                <span class="bar-tooltip">{day.present || 0}</span>
                                            </div>
                                            <div class="bar absent" style="height: {getBarHeight(day.absent || 0)}%">
                                                <span class="bar-tooltip">{day.absent || 0}</span>
                                            </div>
                                        </div>
                                        <span class="bar-label">{day.label || (i + 1)}</span>
                                    </div>
                                {/each}
                            {:else}
                                <div class="no-data">No data available</div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- All Patterns -->
                {#if analytics.patterns.length > 0}
                    <div class="modal-patterns">
                        <h4>Insights & Patterns</h4>
                        <div class="patterns-grid">
                            {#each analytics.patterns as pattern}
                                <div class="pattern-card {pattern.type}">
                                    {#if pattern.type === 'positive'}
                                        <IconTrendingUp size={18} stroke={2} />
                                    {:else}
                                        <IconTrendingDown size={18} stroke={2} />
                                    {/if}
                                    <span>{pattern.message}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .analytics {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-md);
        box-shadow: var(--apple-shadow-sm);
        padding: 14px;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .legend {
        display: flex;
        gap: 12px;
    }

    .expand-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        border-radius: 6px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .expand-btn:hover {
        background: var(--apple-accent);
        color: white;
    }

    .legend-item {
        font-size: 10px;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .legend-item::before {
        content: '';
        width: 12px;
        height: 3px;
        border-radius: 2px;
    }

    .legend-item.present::before { background: var(--apple-green); }
    .legend-item.absent::before { background: var(--apple-red); }

    .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 12px;
    }

    .stat {
        text-align: center;
        padding: 8px;
        background: var(--theme-border-light);
        border-radius: 8px;
    }

    .stat.best { background: rgba(52, 199, 89, 0.1); }
    .stat.worst { background: rgba(255, 59, 48, 0.1); }

    .stat-value {
        display: block;
        font-size: 14px;
        font-weight: 700;
        color: var(--theme-text);
    }

    .stat.best .stat-value { color: var(--apple-green); }
    .stat.worst .stat-value { color: var(--apple-red); }

    .stat-label {
        font-size: 9px;
        color: var(--theme-text-secondary);
        text-transform: uppercase;
    }

    .chart-container {
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
    }

    /* Bar Chart Styles */
    .bar-chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 80px;
        gap: 4px;
    }

    .bar-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        max-width: 40px;
    }

    .bars {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: 60px;
        width: 100%;
    }

    .bar {
        flex: 1;
        min-height: 4px;
        border-radius: 3px 3px 0 0;
        transition: height 0.3s ease;
        position: relative;
        cursor: pointer;
    }

    .bar.present {
        background: linear-gradient(180deg, var(--apple-green), rgba(52, 199, 89, 0.7));
    }

    .bar.absent {
        background: linear-gradient(180deg, var(--apple-red), rgba(255, 59, 48, 0.7));
    }

    .bar:hover {
        opacity: 0.85;
    }

    .bar-tooltip {
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--apple-black);
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
    }

    .bar:hover .bar-tooltip {
        opacity: 1;
    }

    .bar-label {
        font-size: 9px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        margin-top: 4px;
        text-align: center;
    }

    .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 60px;
        color: var(--theme-text-secondary);
        font-size: 12px;
    }

    .patterns {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .pattern {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 6px 10px;
        border-radius: 6px;
    }

    .pattern.positive {
        background: rgba(52, 199, 89, 0.1);
        color: var(--apple-green);
    }

    .pattern.negative {
        background: rgba(255, 149, 0, 0.1);
        color: var(--apple-orange);
    }

    @media (max-width: 768px) {
        .stats-row {
            grid-template-columns: repeat(2, 1fr);
        }

        .stat-value {
            font-size: 12px;
        }
    }

    @media (max-width: 480px) {
        .legend {
            display: none;
        }
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .modal-content {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-xl);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 800px;
        max-height: 90vh;
        overflow: hidden;
        animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .modal-title {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--apple-accent);
    }

    .modal-title h2 {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        border-radius: 50%;
        color: var(--theme-text-secondary);
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .close-btn:hover {
        background: var(--apple-red);
        color: white;
    }

    .modal-body {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(90vh - 80px);
    }

    .modal-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 24px;
    }

    .modal-stat {
        text-align: center;
        padding: 20px 16px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
    }

    .modal-stat.best {
        background: rgba(52, 199, 89, 0.1);
    }

    .modal-stat.worst {
        background: rgba(255, 59, 48, 0.1);
    }

    .modal-stat-value {
        display: block;
        font-size: 28px;
        font-weight: 700;
        color: var(--theme-text);
        margin-bottom: 4px;
    }

    .modal-stat.best .modal-stat-value {
        color: var(--apple-green);
    }

    .modal-stat.worst .modal-stat-value {
        color: var(--apple-red);
    }

    .modal-stat-label {
        font-size: 12px;
        color: var(--theme-text-secondary);
    }

    .modal-chart-section {
        margin-bottom: 24px;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .chart-header h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text);
        margin: 0;
    }

    .legend-large {
        display: flex;
        gap: 16px;
    }

    .modal-chart-container {
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
        padding: 20px;
    }

    .modal-bar-chart {
        height: 180px;
        gap: 6px;
    }

    .modal-bar-chart .bar-group {
        max-width: 50px;
    }

    .modal-bar-chart .bars {
        height: 150px;
        gap: 3px;
    }

    .modal-bar-chart .bar {
        border-radius: 4px 4px 0 0;
    }

    .modal-bar-chart .bar-label {
        font-size: 10px;
        margin-top: 6px;
    }

    .modal-bar-chart .bar-tooltip {
        font-size: 11px;
        padding: 4px 8px;
        top: -28px;
    }

    .modal-patterns {
        margin-top: 24px;
    }

    .modal-patterns h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text);
        margin: 0 0 12px;
    }

    .patterns-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .pattern-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: var(--apple-radius-md);
        font-size: 13px;
    }

    .pattern-card.positive {
        background: rgba(52, 199, 89, 0.1);
        color: var(--apple-green);
    }

    .pattern-card.negative {
        background: rgba(255, 149, 0, 0.1);
        color: var(--apple-orange);
    }

    /* Modal Responsive */
    @media (max-width: 700px) {
        .modal-content {
            max-width: 100%;
            margin: 10px;
        }

        .modal-stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .modal-stat-value {
            font-size: 22px;
        }

        .patterns-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 480px) {
        .modal-header {
            padding: 16px;
        }

        .modal-body {
            padding: 16px;
        }

        .modal-stats-grid {
            gap: 10px;
        }

        .modal-stat {
            padding: 14px 10px;
        }

        .modal-stat-value {
            font-size: 18px;
        }

        .modal-stat-label {
            font-size: 10px;
        }
    }
</style>
