<script>
    import { IconBuilding, IconMaximize, IconX, IconChartBar, IconClock } from '@tabler/icons-svelte';

    export let departments = [];
    export let hourlyData = [];

    let showModal = false;

    $: sortedDepartments = [...departments].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 6);
    $: allDepartments = [...departments].sort((a, b) => b.attendanceRate - a.attendanceRate);
    $: maxHourlyCount = Math.max(...hourlyData.map(h => h.count), 1);

    function getBarColor(rate) {
        if (rate >= 90) return 'var(--apple-green)';
        if (rate >= 80) return 'var(--apple-accent)';
        if (rate >= 70) return 'var(--apple-orange)';
        return 'var(--apple-red)';
    }

    function getHeatColor(count, max) {
        const intensity = count / max;
        if (intensity >= 0.7) return 'var(--apple-red)';
        if (intensity >= 0.4) return 'var(--apple-orange)';
        return 'var(--apple-green)';
    }

    function openModal() {
        showModal = true;
    }

    function closeModal() {
        showModal = false;
    }
</script>

<div class="insights">
    <div class="card-header">
        <div class="header-title">
            <IconBuilding size={16} stroke={1.5} />
            <span>Department Attendance</span>
        </div>
        <button class="expand-btn" on:click={openModal} title="Expand">
            <IconMaximize size={14} stroke={1.5} />
        </button>
    </div>

    <div class="section">
        <div class="dept-list">
            {#each sortedDepartments as dept}
                <div class="dept-row">
                    <span class="dept-name">{dept.name}</span>
                    <div class="dept-bar">
                        <div class="bar-fill" style="width: {dept.attendanceRate}%; background: {getBarColor(dept.attendanceRate)}"></div>
                    </div>
                    <span class="dept-rate" style="color: {getBarColor(dept.attendanceRate)}">{dept.attendanceRate}%</span>
                </div>
            {/each}
            {#if departments.length === 0}
                <div class="no-data">No department data</div>
            {/if}
        </div>
    </div>

    <div class="section hourly-section">
        <div class="section-header">
            <IconClock size={14} stroke={1.5} />
            <span>Hourly Traffic</span>
        </div>
        <div class="hourly-chart">
            {#each hourlyData.slice(0, 10) as hour}
                <div class="hour-bar">
                    <div 
                        class="bar" 
                        style="height: {(hour.count / maxHourlyCount) * 100}%; background: {getHeatColor(hour.count, maxHourlyCount)}"
                        title="{hour.count} check-ins"
                    ></div>
                    <span class="hour-label">{hour.time.split(' ')[0]}</span>
                </div>
            {/each}
            {#if hourlyData.length === 0}
                <div class="no-data">No hourly data</div>
            {/if}
        </div>
    </div>
</div>

<!-- Expanded Modal -->
{#if showModal}
    <div class="modal-overlay" on:click={closeModal} role="dialog" aria-modal="true">
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <div class="modal-title">
                    <IconBuilding size={20} stroke={1.5} />
                    <h2>Department Attendance & Traffic</h2>
                </div>
                <button class="close-btn" on:click={closeModal}>
                    <IconX size={20} stroke={2} />
                </button>
            </div>

            <div class="modal-body">
                <!-- All Departments -->
                <div class="modal-section">
                    <div class="modal-section-header">
                        <IconChartBar size={16} stroke={1.5} />
                        <h4>All Departments</h4>
                        <span class="dept-count">{allDepartments.length} departments</span>
                    </div>
                    <div class="modal-dept-grid">
                        {#each allDepartments as dept}
                            <div class="modal-dept-card">
                                <div class="dept-info">
                                    <span class="dept-name-lg">{dept.name}</span>
                                    <span class="dept-stats">{dept.present || 0} present / {dept.total || 0} total</span>
                                </div>
                                <div class="dept-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: {dept.attendanceRate}%; background: {getBarColor(dept.attendanceRate)}"></div>
                                    </div>
                                    <span class="dept-rate-lg" style="color: {getBarColor(dept.attendanceRate)}">{dept.attendanceRate}%</span>
                                </div>
                            </div>
                        {/each}
                        {#if allDepartments.length === 0}
                            <div class="no-data-lg">No department data available</div>
                        {/if}
                    </div>
                </div>

                <!-- Hourly Traffic Full -->
                <div class="modal-section">
                    <div class="modal-section-header">
                        <IconClock size={16} stroke={1.5} />
                        <h4>Hourly Check-in Traffic</h4>
                    </div>
                    <div class="modal-hourly-chart">
                        {#each hourlyData as hour}
                            <div class="modal-hour-bar">
                                <div class="hour-value">{hour.count}</div>
                                <div 
                                    class="bar-lg" 
                                    style="height: {(hour.count / maxHourlyCount) * 100}%; background: {getHeatColor(hour.count, maxHourlyCount)}"
                                ></div>
                                <span class="hour-label-lg">{hour.time}</span>
                            </div>
                        {/each}
                        {#if hourlyData.length === 0}
                            <div class="no-data-lg">No hourly data available</div>
                        {/if}
                    </div>
                    <div class="traffic-legend">
                        <span class="legend-item"><span class="dot green"></span> Low Traffic</span>
                        <span class="legend-item"><span class="dot orange"></span> Medium Traffic</span>
                        <span class="legend-item"><span class="dot red"></span> High Traffic</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .insights {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-md);
        box-shadow: var(--apple-shadow-sm);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-height: 380px;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-text);
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

    .section {
        flex: 1;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-text);
        margin-bottom: 12px;
    }

    .dept-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .dept-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .dept-name {
        width: 100px;
        font-size: 12px;
        color: var(--theme-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .dept-bar {
        flex: 1;
        height: 8px;
        background: var(--theme-border-light);
        border-radius: 4px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .dept-rate {
        width: 40px;
        font-size: 12px;
        font-weight: 600;
        text-align: right;
    }

    .hourly-section {
        padding-top: 16px;
        border-top: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .hourly-chart {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 80px;
    }

    .hour-bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
    }

    .bar {
        width: 100%;
        border-radius: 4px 4px 0 0;
        min-height: 4px;
        transition: height 0.3s ease;
        cursor: pointer;
    }

    .bar:hover {
        opacity: 0.8;
    }

    .hour-label {
        font-size: 9px;
        color: var(--theme-text-secondary);
        margin-top: 6px;
    }

    .no-data {
        text-align: center;
        color: var(--theme-text-secondary);
        font-size: 12px;
        padding: 20px;
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
        max-width: 900px;
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

    .modal-section {
        margin-bottom: 28px;
    }

    .modal-section:last-child {
        margin-bottom: 0;
    }

    .modal-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        color: var(--apple-accent);
    }

    .modal-section-header h4 {
        font-size: 15px;
        font-weight: 600;
        color: var(--theme-text);
        margin: 0;
    }

    .dept-count {
        font-size: 12px;
        color: var(--theme-text-secondary);
        margin-left: auto;
    }

    .modal-dept-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .modal-dept-card {
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
        padding: 16px;
    }

    .dept-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .dept-name-lg {
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-text);
    }

    .dept-stats {
        font-size: 11px;
        color: var(--theme-text-secondary);
    }

    .dept-progress {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .progress-bar {
        flex: 1;
        height: 10px;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: 5px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.3s ease;
    }

    .dept-rate-lg {
        font-size: 16px;
        font-weight: 700;
        min-width: 50px;
        text-align: right;
    }

    .modal-hourly-chart {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 160px;
        padding: 0 10px;
    }

    .modal-hour-bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
    }

    .hour-value {
        font-size: 11px;
        font-weight: 600;
        color: var(--theme-text);
        margin-bottom: 4px;
    }

    .bar-lg {
        width: 100%;
        border-radius: 6px 6px 0 0;
        min-height: 4px;
        transition: height 0.3s ease;
    }

    .hour-label-lg {
        font-size: 10px;
        color: var(--theme-text-secondary);
        margin-top: 8px;
        white-space: nowrap;
    }

    .traffic-legend {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--theme-border-light);
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--theme-text-secondary);
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .dot.green { background: var(--apple-green); }
    .dot.orange { background: var(--apple-orange); }
    .dot.red { background: var(--apple-red); }

    .no-data-lg {
        text-align: center;
        color: var(--theme-text-secondary);
        font-size: 14px;
        padding: 40px;
        grid-column: span 2;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .insights {
            padding: 14px;
            min-height: 320px;
        }

        .dept-name {
            width: 80px;
            font-size: 11px;
        }

        .hourly-chart {
            height: 60px;
        }

        .modal-dept-grid {
            grid-template-columns: 1fr;
        }

        .modal-hourly-chart {
            height: 120px;
            overflow-x: auto;
            padding-bottom: 10px;
        }

        .modal-hour-bar {
            min-width: 40px;
        }
    }

    @media (max-width: 480px) {
        .insights {
            min-height: 280px;
            gap: 16px;
        }

        .dept-name {
            width: 70px;
            font-size: 10px;
        }

        .dept-bar {
            height: 6px;
        }

        .dept-rate {
            font-size: 11px;
        }

        .modal-header {
            padding: 16px;
        }

        .modal-body {
            padding: 16px;
        }

        .traffic-legend {
            flex-wrap: wrap;
            gap: 12px;
        }
    }
</style>
