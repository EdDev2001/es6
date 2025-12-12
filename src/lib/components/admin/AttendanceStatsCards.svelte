<script>
    import { IconUsers, IconUserX, IconClock, IconDevices, IconActivity } from '@tabler/icons-svelte';
    import { calculatePercentChange } from '$lib/stores/adminDashboard.js';

    export let totalPresent = 0;
    export let yesterdayPresent = 0;
    export let totalAbsent = 0;
    export let excusedAbsent = 0;
    export let unexcusedAbsent = 0;
    export let lateArrivals = 0;
    export let avgLateArrivals = 0;
    export let activeScanners = 0;
    export let totalScanners = 0;
    export let liveCheckIns = 0;
    export let compact = false;

    $: presentChange = calculatePercentChange(totalPresent, yesterdayPresent);
    $: isAboveAvgLate = lateArrivals > avgLateArrivals;
</script>

<div class="stats-grid" class:compact>
    <!-- Total Present -->
    <div class="stat-card">
        <div class="stat-row">
            <div class="stat-icon present">
                <IconUsers size={18} stroke={1.5} />
            </div>
            <div class="stat-info">
                <span class="stat-label">Present Today</span>
                <span class="stat-value">{totalPresent.toLocaleString()}</span>
            </div>
            <span class="change" class:positive={presentChange >= 0} class:negative={presentChange < 0}>
                {presentChange >= 0 ? '+' : ''}{presentChange}%
            </span>
        </div>
    </div>

    <!-- Total Absent -->
    <div class="stat-card">
        <div class="stat-row">
            <div class="stat-icon absent">
                <IconUserX size={18} stroke={1.5} />
            </div>
            <div class="stat-info">
                <span class="stat-label">Absent Today</span>
                <span class="stat-value">{totalAbsent}</span>
            </div>
            <div class="breakdown">
                <span class="b-item excused">{excusedAbsent} exc</span>
                <span class="b-item unexcused">{unexcusedAbsent} unx</span>
            </div>
        </div>
    </div>

    <!-- Late Arrivals -->
    <div class="stat-card" class:warning={isAboveAvgLate}>
        <div class="stat-row">
            <div class="stat-icon late">
                <IconClock size={18} stroke={1.5} />
            </div>
            <div class="stat-info">
                <span class="stat-label">Late Arrivals</span>
                <span class="stat-value">{lateArrivals}</span>
            </div>
            {#if isAboveAvgLate}
                <span class="alert-badge">↑ Avg</span>
            {:else}
                <span class="avg-text">Avg: {avgLateArrivals}</span>
            {/if}
        </div>
    </div>

    <!-- Active Scanners -->
    <div class="stat-card">
        <div class="stat-row">
            <div class="stat-icon scanners">
                <IconDevices size={18} stroke={1.5} />
            </div>
            <div class="stat-info">
                <span class="stat-label">Scanners</span>
                <span class="stat-value">{activeScanners}/{totalScanners}</span>
            </div>
            <span class="online-badge">
                <span class="dot"></span>
                {activeScanners} online
            </span>
        </div>
    </div>

    <!-- Live Check-Ins -->
    <div class="stat-card live">
        <div class="stat-row">
            <div class="stat-icon teal">
                <IconActivity size={18} stroke={1.5} />
            </div>
            <div class="stat-info">
                <span class="stat-label">Check-Ins</span>
                <span class="stat-value">{liveCheckIns}</span>
            </div>
            <span class="live-badge">
                <span class="pulse"></span>
                LIVE
            </span>
        </div>
    </div>
</div>

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin-bottom: 16px;
    }

    .stat-card {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-md);
        padding: 12px 14px;
        box-shadow: var(--apple-shadow-sm);
        transition: var(--apple-transition);
    }

    .stat-card:hover {
        box-shadow: var(--apple-shadow-md);
    }

    .stat-card.warning {
        border: 1px solid rgba(255, 149, 0, 0.3);
    }

    .stat-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .stat-icon.present { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .stat-icon.absent { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .stat-icon.late { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .stat-icon.scanners { background: rgba(175, 82, 222, 0.1); color: var(--apple-purple); }
    .stat-icon.teal { background: rgba(90, 200, 250, 0.1); color: var(--apple-teal); }

    .stat-info {
        flex: 1;
        min-width: 0;
    }

    .stat-label {
        display: block;
        font-size: 10px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    .stat-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
        line-height: 1.2;
    }

    .change {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
        flex-shrink: 0;
    }

    .change.positive { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .change.negative { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }

    .breakdown {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
    }

    .b-item {
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 4px;
    }

    .b-item.excused { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .b-item.unexcused { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }

    .alert-badge {
        font-size: 9px;
        font-weight: 600;
        background: rgba(255, 149, 0, 0.15);
        color: var(--apple-orange);
        padding: 3px 6px;
        border-radius: 6px;
    }

    .avg-text {
        font-size: 10px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .online-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        color: var(--apple-green);
        font-weight: 500;
    }

    .online-badge .dot {
        width: 5px;
        height: 5px;
        background: var(--apple-green);
        border-radius: 50%;
    }

    .live-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        font-weight: 700;
        color: var(--apple-red);
    }

    .pulse {
        width: 6px;
        height: 6px;
        background: var(--apple-red);
        border-radius: 50%;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    /* Responsive */
    @media (max-width: 1200px) {
        .stats-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }

        .stat-card {
            padding: 10px 12px;
        }

        .stat-icon {
            width: 32px;
            height: 32px;
        }

        .stat-value {
            font-size: 18px;
        }
    }

    @media (max-width: 480px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .stat-card {
            padding: 8px 10px;
        }

        .stat-row {
            gap: 8px;
        }

        .stat-icon {
            width: 28px;
            height: 28px;
        }

        .stat-value {
            font-size: 16px;
        }

        .breakdown, .online-badge, .avg-text {
            display: none;
        }
    }
</style>
