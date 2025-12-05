<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { ref, get, query, orderByChild } from 'firebase/database';
    import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
    import AnalyticsChart from '$lib/components/AnalyticsChart.svelte';
    import {
        calculateAttendancePercentage,
        calculateLateStats,
        findMostLateDay,
        calculatePeakCheckInTime,
        calculateOvertimeStats,
        generateTrendData,
        generateWeeklySummary,
        getDayOfWeekStats
    } from '$lib/utils/attendanceAnalytics.js';
    import {
        IconChartBar, IconClock, IconCalendarStats, IconTrendingUp, IconAlertCircle,
        IconFlame, IconTarget, IconChevronDown, IconSun, IconMoon
    } from "@tabler/icons-svelte";

    let isLoading = true;
    let records = [];
    let selectedPeriod = '30';

    // Analytics data
    let attendancePercentage = 0;
    let lateStats = { lateCount: 0, latePercentage: 0, avgLateMinutes: 0 };
    let mostLateDay = null;
    let peakCheckIn = null;
    let overtimeStats = { totalHours: 0, overtimeDays: 0, avgOvertimePerDay: 0 };
    let trendData = [];
    let weeklySummary = [];
    let dayOfWeekStats = [];

    onMount(async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const attendanceRef = ref(db, `attendance/${user.uid}`);
                const attendanceQuery = query(attendanceRef, orderByChild('date'));
                const snapshot = await get(attendanceQuery);
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        records.push({ id: child.key, ...child.val() });
                    });
                    records.sort((a, b) => new Date(b.date) - new Date(a.date));
                    calculateAnalytics();
                }
            } catch (error) {
                console.error('Error loading attendance data:', error);
            }
        }
        isLoading = false;
    });

    function calculateAnalytics() {
        const days = parseInt(selectedPeriod);
        const endDate = new Date();
        const startDate = subDays(endDate, days);
        const filteredRecords = records.filter(r => new Date(r.date) >= startDate);

        // Calculate all metrics
        attendancePercentage = calculateAttendancePercentage(filteredRecords, startDate, endDate);
        lateStats = calculateLateStats(filteredRecords);
        mostLateDay = findMostLateDay(filteredRecords);
        peakCheckIn = calculatePeakCheckInTime(filteredRecords);
        overtimeStats = calculateOvertimeStats(filteredRecords);
        trendData = generateTrendData(records, days);
        weeklySummary = generateWeeklySummary(records, 8);
        dayOfWeekStats = getDayOfWeekStats(filteredRecords);
    }

    function formatMinutes(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    $: if (selectedPeriod && records.length > 0) calculateAnalytics();
</script>

<svelte:head><title>Analytics | Attendance System</title></svelte:head>

<div class="analytics-page">
    {#if isLoading}
        <div class="loading-container apple-animate-in">
            <div class="apple-spinner"></div>
            <p class="loading-text">Analyzing your attendance...</p>
        </div>
    {:else}
        <div class="analytics-content apple-animate-in">
            <!-- Header -->
            <header class="page-header">
                <div class="header-text">
                    <h1 class="page-title">Analytics</h1>
                    <p class="page-subtitle">Your attendance insights at a glance</p>
                </div>
                <div class="period-selector">
                    <select bind:value={selectedPeriod} class="period-select">
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                    <IconChevronDown size={16} stroke={2} class="select-icon" />
                </div>
            </header>

            <!-- Summary Cards - Apple Health Style -->
            <section class="summary-section">
                <div class="summary-grid">
                    <!-- Attendance Ring -->
                    <div class="summary-card summary-card-large">
                        <div class="card-header">
                            <IconTarget size={20} stroke={1.5} class="card-icon icon-blue" />
                            <span class="card-label">Attendance Rate</span>
                        </div>
                        <div class="ring-container">
                            <AnalyticsChart 
                                type="ring" 
                                ringValue={attendancePercentage} 
                                ringMax={100}
                                ringLabel="{attendancePercentage}%"
                                ringSubLabel="Present"
                                color="blue"
                            />
                        </div>
                        <p class="card-insight">
                            {#if attendancePercentage >= 95}
                                Excellent attendance!
                            {:else if attendancePercentage >= 80}
                                Good consistency
                            {:else}
                                Room for improvement
                            {/if}
                        </p>
                    </div>

                    <!-- Late Frequency -->
                    <div class="summary-card">
                        <div class="card-header">
                            <IconAlertCircle size={20} stroke={1.5} class="card-icon icon-orange" />
                            <span class="card-label">Late Arrivals</span>
                        </div>
                        <div class="stat-display">
                            <span class="stat-value">{lateStats.lateCount}</span>
                            <span class="stat-unit">times</span>
                        </div>
                        <div class="stat-meta">
                            <span class="meta-badge meta-orange">{lateStats.latePercentage}% of days</span>
                        </div>
                        {#if lateStats.avgLateMinutes > 0}
                            <p class="card-detail">Avg. {formatMinutes(lateStats.avgLateMinutes)} late</p>
                        {/if}
                    </div>

                    <!-- Most Late Day -->
                    <div class="summary-card">
                        <div class="card-header">
                            <IconCalendarStats size={20} stroke={1.5} class="card-icon icon-purple" />
                            <span class="card-label">Most Late Day</span>
                        </div>
                        {#if mostLateDay}
                            <div class="stat-display">
                                <span class="stat-value stat-text">{mostLateDay.day}</span>
                            </div>
                            <p class="card-detail">{mostLateDay.count} late arrivals</p>
                        {:else}
                            <div class="stat-display">
                                <span class="stat-value stat-text">None</span>
                            </div>
                            <p class="card-detail">No late arrivals recorded</p>
                        {/if}
                    </div>

                    <!-- Peak Check-in -->
                    <div class="summary-card">
                        <div class="card-header">
                            <IconSun size={20} stroke={1.5} class="card-icon icon-green" />
                            <span class="card-label">Peak Check-in</span>
                        </div>
                        {#if peakCheckIn}
                            <div class="stat-display">
                                <span class="stat-value stat-text">{peakCheckIn.time}</span>
                            </div>
                            <p class="card-detail">{peakCheckIn.count} check-ins at this hour</p>
                        {:else}
                            <div class="stat-display">
                                <span class="stat-value stat-text">--</span>
                            </div>
                        {/if}
                    </div>

                    <!-- Overtime -->
                    <div class="summary-card">
                        <div class="card-header">
                            <IconFlame size={20} stroke={1.5} class="card-icon icon-red" />
                            <span class="card-label">Overtime</span>
                        </div>
                        <div class="stat-display">
                            <span class="stat-value">{overtimeStats.totalHours}</span>
                            <span class="stat-unit">hours</span>
                        </div>
                        <div class="stat-meta">
                            <span class="meta-badge meta-red">{overtimeStats.overtimeDays} days</span>
                        </div>
                        {#if overtimeStats.avgOvertimePerDay > 0}
                            <p class="card-detail">Avg. {formatMinutes(overtimeStats.avgOvertimePerDay)}/day</p>
                        {/if}
                    </div>
                </div>
            </section>

            <!-- Daily Hours Trend Chart -->
            <section class="chart-section">
                <div class="chart-card">
                    <div class="chart-header">
                        <div>
                            <h3 class="chart-title">Daily Hours</h3>
                            <p class="chart-subtitle">Your work hours over time</p>
                        </div>
                        <IconTrendingUp size={20} stroke={1.5} class="chart-icon" />
                    </div>
                    <div class="chart-container">
                        <AnalyticsChart 
                            data={trendData} 
                            type="bar" 
                            height={140}
                            color="blue"
                            maxValue={12}
                        />
                    </div>
                    <div class="chart-legend">
                        <span class="legend-item"><span class="legend-dot legend-blue"></span> Work days</span>
                        <span class="legend-item"><span class="legend-dot legend-gray"></span> Weekends</span>
                    </div>
                </div>
            </section>

            <!-- Weekly Summary -->
            <section class="chart-section">
                <div class="chart-card">
                    <div class="chart-header">
                        <div>
                            <h3 class="chart-title">Weekly Summary</h3>
                            <p class="chart-subtitle">Hours worked per week</p>
                        </div>
                        <IconChartBar size={20} stroke={1.5} class="chart-icon" />
                    </div>
                    <div class="weekly-bars">
                        {#each weeklySummary as week}
                            {@const percent = Math.min((week.totalHours / week.target) * 100, 100)}
                            <div class="week-bar-item">
                                <div class="week-bar-track">
                                    <div class="week-bar-fill" style="width: {percent}%"></div>
                                </div>
                                <div class="week-bar-info">
                                    <span class="week-label">{week.weekLabel}</span>
                                    <span class="week-hours">{week.totalHours}h</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </section>

            <!-- Day of Week Performance -->
            <section class="chart-section">
                <div class="chart-card">
                    <div class="chart-header">
                        <div>
                            <h3 class="chart-title">Day Performance</h3>
                            <p class="chart-subtitle">Average hours by day of week</p>
                        </div>
                        <IconClock size={20} stroke={1.5} class="chart-icon" />
                    </div>
                    <div class="day-stats-grid">
                        {#each dayOfWeekStats.filter(d => d.totalDays > 0) as day}
                            <div class="day-stat-card">
                                <span class="day-name">{day.day}</span>
                                <span class="day-hours">{day.avgHours}h</span>
                                <span class="day-count">{day.totalDays} days</span>
                                {#if day.lateCount > 0}
                                    <span class="day-late">{day.lateCount} late</span>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </section>
        </div>
    {/if}
</div>


<style>
    .analytics-page {
        min-height: 100%;
        padding: clamp(16px, 4vw, 40px);
        background: linear-gradient(180deg, #f0f2ff 0%, #f5f5f7 50%, #f0fff4 100%);
    }

    .analytics-content { max-width: 1000px; margin: 0 auto; }

    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
    }
    .loading-text { margin-top: 16px; font-size: 15px; color: var(--apple-gray-1); }

    /* Header */
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: clamp(20px, 4vw, 32px);
        flex-wrap: wrap;
        gap: 16px;
    }
    .page-title {
        font-size: clamp(28px, 5vw, 36px);
        font-weight: 700;
        color: var(--apple-black);
        letter-spacing: -0.5px;
        margin-bottom: 4px;
    }
    .page-subtitle { font-size: clamp(14px, 2vw, 16px); color: var(--apple-gray-1); }

    .period-selector {
        position: relative;
        display: flex;
        align-items: center;
    }
    .period-select {
        appearance: none;
        background: var(--apple-white);
        border: 1px solid var(--apple-gray-4);
        border-radius: var(--apple-radius-md);
        padding: 10px 36px 10px 14px;
        font-size: 14px;
        font-weight: 500;
        color: var(--apple-black);
        cursor: pointer;
        transition: var(--apple-transition);
    }
    .period-select:focus {
        outline: none;
        border-color: var(--apple-accent);
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    :global(.select-icon) {
        position: absolute;
        right: 12px;
        pointer-events: none;
        color: var(--apple-gray-2);
    }

    /* Summary Section */
    .summary-section { margin-bottom: 24px; }
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
    }

    .summary-card {
        background: var(--apple-white);
        border-radius: var(--apple-radius-lg);
        padding: 16px;
        box-shadow: var(--apple-shadow-sm);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--apple-shadow-md);
    }
    .summary-card-large {
        grid-column: span 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        width: 100%;
    }
    .card-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--apple-gray-1);
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    :global(.card-icon) { flex-shrink: 0; }
    :global(.icon-blue) { color: var(--apple-accent); }
    :global(.icon-green) { color: var(--apple-green); }
    :global(.icon-orange) { color: var(--apple-orange); }
    :global(.icon-purple) { color: var(--apple-purple); }
    :global(.icon-red) { color: #FF3B30; }

    .ring-container { margin: 8px 0 12px; }

    .stat-display {
        display: flex;
        align-items: baseline;
        gap: 4px;
        margin-bottom: 8px;
    }
    .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: var(--apple-black);
        line-height: 1;
    }
    .stat-value.stat-text { font-size: 22px; }
    .stat-unit {
        font-size: 14px;
        font-weight: 500;
        color: var(--apple-gray-1);
    }

    .stat-meta { margin-bottom: 8px; }
    .meta-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    .meta-orange { background: rgba(255, 149, 0, 0.12); color: var(--apple-orange); }
    .meta-red { background: rgba(255, 59, 48, 0.12); color: #FF3B30; }

    .card-detail {
        font-size: 12px;
        color: var(--apple-gray-2);
    }
    .card-insight {
        font-size: 13px;
        color: var(--apple-gray-1);
        font-weight: 500;
    }

    /* Chart Section */
    .chart-section { margin-bottom: 20px; }
    .chart-card {
        background: var(--apple-white);
        border-radius: var(--apple-radius-xl);
        padding: clamp(16px, 3vw, 24px);
        box-shadow: var(--apple-shadow-sm);
    }
    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
    }
    .chart-title {
        font-size: 17px;
        font-weight: 600;
        color: var(--apple-black);
        margin-bottom: 4px;
    }
    .chart-subtitle { font-size: 13px; color: var(--apple-gray-1); }
    :global(.chart-icon) { color: var(--apple-gray-3); }

    .chart-container { margin-bottom: 16px; }
    .chart-legend {
        display: flex;
        gap: 16px;
        justify-content: center;
    }
    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--apple-gray-1);
    }
    .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    .legend-blue { background: var(--apple-accent); }
    .legend-gray { background: var(--apple-gray-4); }

    /* Weekly Bars */
    .weekly-bars {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .week-bar-item { display: flex; flex-direction: column; gap: 6px; }
    .week-bar-track {
        height: 8px;
        background: var(--apple-gray-5);
        border-radius: 4px;
        overflow: hidden;
    }
    .week-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--apple-accent), #5856D6);
        border-radius: 4px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .week-bar-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .week-label { font-size: 12px; color: var(--apple-gray-1); }
    .week-hours { font-size: 13px; font-weight: 600; color: var(--apple-black); }

    /* Day Stats Grid */
    .day-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 10px;
    }
    .day-stat-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 14px 10px;
        background: var(--apple-gray-6);
        border-radius: var(--apple-radius-md);
        text-align: center;
        transition: var(--apple-transition);
    }
    .day-stat-card:hover {
        background: rgba(0, 122, 255, 0.08);
    }
    .day-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--apple-gray-1);
        margin-bottom: 6px;
    }
    .day-hours {
        font-size: 20px;
        font-weight: 700;
        color: var(--apple-black);
        line-height: 1;
    }
    .day-count {
        font-size: 10px;
        color: var(--apple-gray-2);
        margin-top: 4px;
    }
    .day-late {
        font-size: 10px;
        color: var(--apple-orange);
        font-weight: 500;
        margin-top: 4px;
    }

    /* Responsive */
    @media (min-width: 640px) {
        .summary-card-large { grid-column: span 2; }
        .summary-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (min-width: 768px) {
        .summary-grid { grid-template-columns: repeat(5, 1fr); }
        .summary-card-large { grid-column: span 1; }
    }
</style>
