<script>
    import { createEventDispatcher } from 'svelte';
    import { IconUsers, IconUserCheck, IconUserX, IconClock, IconClockOff, IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-svelte';
    
    export let stats = null;
    export let period = 'monthly';
    export let isLoading = false;

    const dispatch = createEventDispatcher();

    // Chart colors
    const colors = {
        present: '#34C759',
        absent: '#FF3B30',
        late: '#FF9500',
        onTime: '#007AFF',
        earlyOut: '#AF52DE'
    };

    $: presentPercent = stats?.charts?.presentVsAbsent 
        ? Math.round((stats.charts.presentVsAbsent.present / (stats.charts.presentVsAbsent.present + stats.charts.presentVsAbsent.absent || 1)) * 100)
        : 0;

    $: latePercent = stats?.charts?.lateAnalysis
        ? Math.round((stats.charts.lateAnalysis.late / (stats.charts.lateAnalysis.onTime + stats.charts.lateAnalysis.late || 1)) * 100)
        : 0;

    function getTrendIcon(value, threshold = 0) {
        if (value > threshold) return IconTrendingUp;
        if (value < threshold) return IconTrendingDown;
        return IconMinus;
    }

    function getTrendClass(value, isPositive = true) {
        if (value > 0) return isPositive ? 'trend-up' : 'trend-down';
        if (value < 0) return isPositive ? 'trend-down' : 'trend-up';
        return 'trend-neutral';
    }
</script>

<div class="attendance-overview" class:loading={isLoading}>
    {#if isLoading}
        <div class="loading-overlay">
            <div class="spinner"></div>
            <p>Loading analytics...</p>
        </div>
    {/if}

    <!-- Period Header -->
    <div class="overview-header">
        <h3>Attendance Overview</h3>
        <span class="period-badge">{stats?.period?.label || 'Last 30 Days'}</span>
    </div>

    <!-- Summary Stats Grid -->
    <div class="stats-grid">
        <div class="stat-card highlight">
            <div class="stat-icon" style="background: rgba(0, 122, 255, 0.1); color: #007AFF;">
                <IconUsers size={24} stroke={1.5} />
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats?.summary?.attendanceRate || 0}%</span>
                <span class="stat-label">Attendance Rate</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(52, 199, 89, 0.1); color: #34C759;">
                <IconUserCheck size={24} stroke={1.5} />
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats?.summary?.presentDays || 0}</span>
                <span class="stat-label">Present Days</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(255, 59, 48, 0.1); color: #FF3B30;">
                <IconUserX size={24} stroke={1.5} />
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats?.summary?.absentDays || 0}</span>
                <span class="stat-label">Absent Days</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(255, 149, 0, 0.1); color: #FF9500;">
                <IconClock size={24} stroke={1.5} />
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats?.summary?.lateDays || 0}</span>
                <span class="stat-label">Late Arrivals</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(175, 82, 222, 0.1); color: #AF52DE;">
                <IconClockOff size={24} stroke={1.5} />
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats?.summary?.earlyOutDays || 0}</span>
                <span class="stat-label">Early Departures</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(90, 200, 250, 0.1); color: #5AC8FA;">
                <IconTrendingUp size={24} stroke={1.5} />
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats?.summary?.punctualityRate || 0}%</span>
                <span class="stat-label">Punctuality Rate</span>
            </div>
        </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
        <!-- Present vs Absent Chart -->
        <div class="chart-card">
            <h4>Present vs Absent</h4>
            <div class="donut-chart">
                <svg viewBox="0 0 100 100">
                    <!-- Background circle -->
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E5EA" stroke-width="12"/>
                    <!-- Present arc -->
                    <circle 
                        cx="50" cy="50" r="40" 
                        fill="none" 
                        stroke={colors.present}
                        stroke-width="12"
                        stroke-linecap="round"
                        stroke-dasharray={`${presentPercent * 2.51} 251`}
                        transform="rotate(-90 50 50)"
                        class="chart-arc"
                    />
                </svg>
                <div class="donut-center">
                    <span class="donut-value">{presentPercent}%</span>
                    <span class="donut-label">Present</span>
                </div>
            </div>
            <div class="chart-legend">
                <div class="legend-item">
                    <span class="legend-dot" style="background: {colors.present}"></span>
                    <span>Present ({stats?.charts?.presentVsAbsent?.present || 0})</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: {colors.absent}"></span>
                    <span>Absent ({stats?.charts?.presentVsAbsent?.absent || 0})</span>
                </div>
            </div>
        </div>

        <!-- Late/Early Analysis Chart -->
        <div class="chart-card">
            <h4>Punctuality Analysis</h4>
            <div class="bar-chart">
                {#if stats?.charts?.lateAnalysis}
                    {@const total = stats.charts.lateAnalysis.onTime + stats.charts.lateAnalysis.late + stats.charts.lateAnalysis.earlyOut || 1}
                    <div class="bar-item">
                        <div class="bar-label">
                            <span>On Time</span>
                            <span class="bar-value">{stats.charts.lateAnalysis.onTime}</span>
                        </div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: {(stats.charts.lateAnalysis.onTime / total) * 100}%; background: {colors.onTime}"></div>
                        </div>
                    </div>
                    <div class="bar-item">
                        <div class="bar-label">
                            <span>Late</span>
                            <span class="bar-value">{stats.charts.lateAnalysis.late}</span>
                        </div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: {(stats.charts.lateAnalysis.late / total) * 100}%; background: {colors.late}"></div>
                        </div>
                    </div>
                    <div class="bar-item">
                        <div class="bar-label">
                            <span>Early Out</span>
                            <span class="bar-value">{stats.charts.lateAnalysis.earlyOut}</span>
                        </div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: {(stats.charts.lateAnalysis.earlyOut / total) * 100}%; background: {colors.earlyOut}"></div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- Hours Summary -->
    <div class="hours-section">
        <div class="hours-card">
            <div class="hours-icon">⏱️</div>
            <div class="hours-info">
                <span class="hours-value">{stats?.summary?.totalHours || 0}h</span>
                <span class="hours-label">Total Hours Worked</span>
            </div>
        </div>
        <div class="hours-card">
            <div class="hours-icon">📊</div>
            <div class="hours-info">
                <span class="hours-value">{stats?.summary?.avgHoursPerDay || 0}h</span>
                <span class="hours-label">Average Hours/Day</span>
            </div>
        </div>
        <div class="hours-card">
            <div class="hours-icon">🔥</div>
            <div class="hours-info">
                <span class="hours-value">{stats?.summary?.totalOvertime || 0}h</span>
                <span class="hours-label">Overtime Hours</span>
            </div>
        </div>
    </div>
</div>

<style>
    .attendance-overview {
        position: relative;
    }

    .attendance-overview.loading {
        opacity: 0.6;
        pointer-events: none;
    }

    .loading-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.8);
        border-radius: var(--apple-radius-lg);
        z-index: 10;
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--apple-gray-4);
        border-top-color: var(--apple-accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .loading-overlay p {
        margin-top: 12px;
        font-size: 14px;
        color: var(--apple-gray-1);
    }

    .overview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
    }

    .overview-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
    }

    .period-badge {
        background: var(--apple-accent);
        color: white;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    /* Stats Grid */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
    }

    .stat-card {
        background: var(--theme-card-bg, var(--apple-white));
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
        border-radius: var(--apple-radius-lg);
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: var(--apple-transition);
    }

    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--apple-shadow-md);
    }

    .stat-card.highlight {
        background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(88, 86, 214, 0.1));
        border-color: rgba(0, 122, 255, 0.2);
    }

    .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--apple-radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .stat-content {
        display: flex;
        flex-direction: column;
    }

    .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
    }

    .stat-label {
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    /* Charts Section */
    .charts-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 24px;
    }

    .chart-card {
        background: var(--theme-card-bg, var(--apple-white));
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
        border-radius: var(--apple-radius-lg);
        padding: 20px;
    }

    .chart-card h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin-bottom: 16px;
    }

    /* Donut Chart */
    .donut-chart {
        position: relative;
        width: 140px;
        height: 140px;
        margin: 0 auto 16px;
    }

    .donut-chart svg {
        width: 100%;
        height: 100%;
    }

    .chart-arc {
        transition: stroke-dasharray 0.8s ease;
    }

    .donut-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .donut-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
    }

    .donut-label {
        font-size: 11px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .chart-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    /* Bar Chart */
    .bar-chart {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .bar-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .bar-label {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--theme-text, var(--apple-black));
    }

    .bar-value {
        font-weight: 600;
    }

    .bar-track {
        height: 8px;
        background: var(--theme-border-light, var(--apple-gray-5));
        border-radius: 4px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.6s ease;
    }

    /* Hours Section */
    .hours-section {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
    }

    .hours-card {
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .hours-icon {
        font-size: 24px;
    }

    .hours-info {
        display: flex;
        flex-direction: column;
    }

    .hours-value {
        font-size: 20px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
    }

    .hours-label {
        font-size: 11px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    /* Responsive */
    @media (max-width: 900px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .charts-section {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 600px) {
        .stats-grid {
            grid-template-columns: 1fr;
        }

        .hours-section {
            grid-template-columns: 1fr;
        }

        .stat-card {
            padding: 14px;
        }

        .stat-value {
            font-size: 20px;
        }
    }
</style>
