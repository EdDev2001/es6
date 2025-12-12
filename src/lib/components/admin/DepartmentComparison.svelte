<script>
    import { IconBuilding, IconTrendingUp, IconTrendingDown, IconMinus, IconChartBar } from '@tabler/icons-svelte';
    
    export let data = [];
    export let isLoading = false;

    // Get color based on percentage
    function getPercentColor(value, thresholds = { good: 80, warning: 60 }) {
        if (value >= thresholds.good) return '#34C759';
        if (value >= thresholds.warning) return '#FF9500';
        return '#FF3B30';
    }

    // Get rank badge color
    function getRankColor(index) {
        if (index === 0) return 'gold';
        if (index === 1) return 'silver';
        if (index === 2) return 'bronze';
        return 'default';
    }

    $: maxAttendance = Math.max(...data.map(d => d.attendanceRate || 0), 100);
</script>

<div class="department-comparison" class:loading={isLoading}>
    <div class="section-header">
        <div class="header-left">
            <IconChartBar size={20} stroke={1.5} />
            <h3>Department Comparison</h3>
        </div>
        <span class="dept-count">{data.length} Departments</span>
    </div>

    {#if data.length === 0}
        <div class="empty-state">
            <IconBuilding size={48} stroke={1} />
            <p>No department data available</p>
        </div>
    {:else}
        <div class="comparison-table">
            <div class="table-header">
                <span class="col-rank">#</span>
                <span class="col-dept">Department</span>
                <span class="col-stat">Attendance</span>
                <span class="col-stat">Punctuality</span>
                <span class="col-stat">Avg Hours</span>
                <span class="col-chart">Performance</span>
            </div>

            <div class="table-body">
                {#each data as dept, index}
                    <div class="table-row">
                        <span class="col-rank">
                            <span class="rank-badge rank-{getRankColor(index)}">{index + 1}</span>
                        </span>
                        <span class="col-dept">
                            <IconBuilding size={16} stroke={1.5} />
                            <span class="dept-name">{dept.department || 'Unknown'}</span>
                        </span>
                        <span class="col-stat">
                            <span class="stat-value" style="color: {getPercentColor(dept.attendanceRate)}">
                                {dept.attendanceRate || 0}%
                            </span>
                        </span>
                        <span class="col-stat">
                            <span class="stat-value" style="color: {getPercentColor(dept.punctualityRate)}">
                                {dept.punctualityRate || 0}%
                            </span>
                        </span>
                        <span class="col-stat">
                            <span class="stat-value">{dept.avgHours || 0}h</span>
                        </span>
                        <span class="col-chart">
                            <div class="mini-bar">
                                <div 
                                    class="mini-bar-fill" 
                                    style="width: {(dept.attendanceRate / maxAttendance) * 100}%; background: {getPercentColor(dept.attendanceRate)}"
                                ></div>
                            </div>
                        </span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Visual Chart -->
        <div class="visual-chart">
            <h4>Attendance Rate by Department</h4>
            <div class="chart-bars">
                {#each data.slice(0, 8) as dept, index}
                    <div class="chart-bar-item">
                        <div class="bar-container">
                            <div 
                                class="bar" 
                                style="height: {dept.attendanceRate}%; background: {getPercentColor(dept.attendanceRate)}"
                            >
                                <span class="bar-value">{dept.attendanceRate}%</span>
                            </div>
                        </div>
                        <span class="bar-label" title={dept.department}>
                            {dept.department?.substring(0, 8) || 'Dept'}
                        </span>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .department-comparison {
        background: var(--theme-card-bg, var(--apple-white));
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
        border-radius: var(--apple-radius-xl);
        padding: 24px;
    }

    .department-comparison.loading {
        opacity: 0.6;
        pointer-events: none;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--theme-text, var(--apple-black));
    }

    .header-left h3 {
        font-size: 18px;
        font-weight: 600;
    }

    .dept-count {
        font-size: 13px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        background: var(--theme-border-light, var(--apple-gray-6));
        padding: 6px 12px;
        border-radius: 20px;
    }

    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .empty-state p {
        margin-top: 12px;
        font-size: 14px;
    }

    /* Table Styles */
    .comparison-table {
        margin-bottom: 24px;
    }

    .table-header {
        display: grid;
        grid-template-columns: 50px 1.5fr 1fr 1fr 1fr 1.5fr;
        gap: 12px;
        padding: 12px 16px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .table-body {
        display: flex;
        flex-direction: column;
    }

    .table-row {
        display: grid;
        grid-template-columns: 50px 1.5fr 1fr 1fr 1fr 1.5fr;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
        align-items: center;
        transition: var(--apple-transition);
    }

    .table-row:hover {
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .table-row:last-child {
        border-bottom: none;
    }

    .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 700;
    }

    .rank-gold {
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: white;
    }

    .rank-silver {
        background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
        color: white;
    }

    .rank-bronze {
        background: linear-gradient(135deg, #CD7F32, #B87333);
        color: white;
    }

    .rank-default {
        background: var(--theme-border-light, var(--apple-gray-5));
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .col-dept {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .dept-name {
        font-weight: 500;
        color: var(--theme-text, var(--apple-black));
    }

    .stat-value {
        font-weight: 600;
        font-size: 14px;
    }

    .mini-bar {
        height: 8px;
        background: var(--theme-border-light, var(--apple-gray-5));
        border-radius: 4px;
        overflow: hidden;
    }

    .mini-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.6s ease;
    }

    /* Visual Chart */
    .visual-chart {
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-lg);
        padding: 20px;
    }

    .visual-chart h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin-bottom: 20px;
    }

    .chart-bars {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        height: 180px;
        gap: 12px;
    }

    .chart-bar-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
    }

    .bar-container {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
    }

    .bar {
        width: 100%;
        max-width: 40px;
        border-radius: 6px 6px 0 0;
        position: relative;
        transition: height 0.6s ease;
        min-height: 20px;
    }

    .bar-value {
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        white-space: nowrap;
    }

    .bar-label {
        font-size: 10px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        margin-top: 8px;
        text-align: center;
        max-width: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Responsive */
    @media (max-width: 900px) {
        .table-header,
        .table-row {
            grid-template-columns: 40px 1fr 80px 80px;
        }

        .col-stat:nth-child(5),
        .col-chart {
            display: none;
        }

        .chart-bars {
            height: 140px;
        }
    }

    @media (max-width: 600px) {
        .department-comparison {
            padding: 16px;
        }

        .table-header,
        .table-row {
            grid-template-columns: 36px 1fr 70px;
            gap: 8px;
            padding: 10px 12px;
        }

        .col-stat:nth-child(4) {
            display: none;
        }

        .chart-bars {
            height: 120px;
            gap: 8px;
        }

        .bar {
            max-width: 30px;
        }

        .bar-value {
            font-size: 9px;
            top: -20px;
        }
    }
</style>
