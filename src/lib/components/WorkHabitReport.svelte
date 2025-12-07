<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { 
        WorkHabitReportGenerator, 
        ReportType,
        downloadReportAsPDF,
        saveReport,
        queueReportEmail
    } from '$lib/reports/workHabitReports.js';

    // Props
    export let userId = null;
    export let userName = 'Employee';
    export let department = '';
    export let attendanceRecords = [];
    export let workConfig = {};
    export let reportType = ReportType.WEEKLY;

    // State
    let report = null;
    let loading = true;
    let activeTab = 'summary';
    let saving = false;
    let emailSending = false;
    let showEmailModal = false;
    let emailAddress = '';

    const tabs = [
        { id: 'summary', label: 'Summary', icon: '📊' },
        { id: 'attendance', label: 'Attendance', icon: '📅' },
        { id: 'trends', label: 'Trends', icon: '📈' },
        { id: 'workload', label: 'Workload', icon: '⚖️' },
        { id: 'suggestions', label: 'Suggestions', icon: '💡' }
    ];

    async function generateReport() {
        if (!userId || attendanceRecords.length === 0) {
            loading = false;
            return;
        }

        try {
            const generator = new WorkHabitReportGenerator(userId, {
                userName,
                department,
                workConfig
            });
            report = await generator.generateReport(attendanceRecords, reportType);
        } catch (error) {
            console.error('Error generating report:', error);
        }
        loading = false;
    }

    async function handleDownloadPDF() {
        if (report) {
            downloadReportAsPDF(report);
        }
    }

    async function handleSaveReport() {
        if (!report) return;
        saving = true;
        await saveReport(userId, report);
        saving = false;
    }

    let emailStatus = null;

    async function handleSendEmail() {
        if (!report || !emailAddress) return;
        emailSending = true;
        emailStatus = null;

        try {
            // Send via API for real email delivery
            const response = await fetch('/api/send-report-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailAddress,
                    report,
                    userId
                })
            });

            const result = await response.json();

            if (result.success) {
                emailStatus = { type: 'success', message: 'Report sent successfully!' };
                setTimeout(() => {
                    showEmailModal = false;
                    emailAddress = '';
                    emailStatus = null;
                }, 2000);
            } else {
                emailStatus = { type: 'error', message: result.error || 'Failed to send email' };
            }
        } catch (error) {
            console.error('Error sending email:', error);
            emailStatus = { type: 'error', message: 'Failed to send email. Please try again.' };
        }

        emailSending = false;
    }

    function getScoreColor(score) {
        if (score >= 80) return '#059669';
        if (score >= 60) return '#d97706';
        return '#dc2626';
    }

    function getStatusClass(status) {
        return status === 'on-time' ? 'on-time' : status === 'late' ? 'late' : 'absent';
    }

    onMount(() => {
        generateReport();
    });

    $: if (attendanceRecords.length > 0 && userId) {
        generateReport();
    }
</script>

<div class="report-container">
    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Generating report...</p>
        </div>
    {:else if !report}
        <div class="empty-state">
            <span class="empty-icon">📊</span>
            <p>No data available for report</p>
        </div>
    {:else}
        <!-- Header -->
        <div class="report-header">
            <div class="header-info">
                <h2>Work Habit Report</h2>
                <p class="period">{report.meta.period.label}</p>
            </div>
            <div class="header-actions">
                <button class="btn-secondary" on:click={handleSaveReport} disabled={saving}>
                    {saving ? '💾 Saving...' : '💾 Save'}
                </button>
                <button class="btn-secondary" on:click={() => showEmailModal = true}>
                    📧 Email
                </button>
                <button class="btn-primary" on:click={handleDownloadPDF}>
                    📄 Download PDF
                </button>
            </div>
        </div>

        <!-- Score Card -->
        <div class="score-section">
            <div class="score-card" style="--score-color: {getScoreColor(report.summary.score)}">
                <div class="score-ring">
                    <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                        <circle 
                            cx="50" cy="50" r="45" 
                            fill="none" 
                            stroke="var(--score-color)" 
                            stroke-width="8"
                            stroke-linecap="round"
                            stroke-dasharray="{report.summary.score * 2.83} 283"
                            transform="rotate(-90 50 50)"
                        />
                    </svg>
                    <div class="score-value">{report.summary.score}</div>
                </div>
                <span class="score-label">Overall Score</span>
            </div>

            <div class="quick-stats">
                <div class="stat">
                    <span class="stat-value">{report.summary.presentDays}/{report.summary.totalDays}</span>
                    <span class="stat-label">Days Present</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{report.summary.punctualityRate}%</span>
                    <span class="stat-label">Punctuality</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{report.summary.totalHours}h</span>
                    <span class="stat-label">Total Hours</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{report.summary.totalOvertime}h</span>
                    <span class="stat-label">Overtime</span>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            {#each tabs as tab}
                <button 
                    class="tab" 
                    class:active={activeTab === tab.id}
                    on:click={() => activeTab = tab.id}
                >
                    <span class="tab-icon">{tab.icon}</span>
                    <span class="tab-label">{tab.label}</span>
                </button>
            {/each}
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
            {#if activeTab === 'summary'}
                <div class="summary-grid">
                    <div class="summary-card">
                        <h4>Attendance</h4>
                        <div class="summary-stats">
                            <div class="summary-stat">
                                <span class="label">Present</span>
                                <span class="value success">{report.summary.presentDays} days</span>
                            </div>
                            <div class="summary-stat">
                                <span class="label">Absent</span>
                                <span class="value danger">{report.summary.absentDays} days</span>
                            </div>
                            <div class="summary-stat">
                                <span class="label">Attendance Rate</span>
                                <span class="value">{report.summary.attendanceRate}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <h4>Punctuality</h4>
                        <div class="summary-stats">
                            <div class="summary-stat">
                                <span class="label">On Time</span>
                                <span class="value success">{report.summary.onTimeDays} days</span>
                            </div>
                            <div class="summary-stat">
                                <span class="label">Late</span>
                                <span class="value warning">{report.summary.lateDays} days</span>
                            </div>
                            <div class="summary-stat">
                                <span class="label">Early Leave</span>
                                <span class="value">{report.summary.earlyLeaveDays} days</span>
                            </div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <h4>Work Hours</h4>
                        <div class="summary-stats">
                            <div class="summary-stat">
                                <span class="label">Total</span>
                                <span class="value">{report.summary.totalHours}h</span>
                            </div>
                            <div class="summary-stat">
                                <span class="label">Average/Day</span>
                                <span class="value">{report.summary.avgHoursPerDay}h</span>
                            </div>
                            <div class="summary-stat">
                                <span class="label">Overtime</span>
                                <span class="value warning">{report.summary.totalOvertime}h</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            {#if activeTab === 'attendance'}
                <div class="attendance-table-wrapper">
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each report.attendance.dailyBreakdown as day}
                                <tr>
                                    <td>{day.date}</td>
                                    <td>{day.dayName}</td>
                                    <td>{day.checkIn || '-'}</td>
                                    <td>{day.checkOut || '-'}</td>
                                    <td>{day.hours}h</td>
                                    <td>
                                        <span class="status-badge {getStatusClass(day.status)}">
                                            {day.status}
                                        </span>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                {#if report.attendance.bestDay || report.attendance.worstDay}
                    <div class="day-insights">
                        {#if report.attendance.bestDay}
                            <div class="insight success">
                                🌟 Best day: <strong>{report.attendance.bestDay.name}</strong> 
                                ({report.attendance.bestDay.onTimeRate}% on-time)
                            </div>
                        {/if}
                        {#if report.attendance.worstDay}
                            <div class="insight warning">
                                ⚠️ Needs attention: <strong>{report.attendance.worstDay.name}</strong> 
                                ({report.attendance.worstDay.lateRate}% late)
                            </div>
                        {/if}
                    </div>
                {/if}
            {/if}

            {#if activeTab === 'trends'}
                <div class="trends-section">
                    <div class="trend-cards">
                        <div class="trend-card">
                            <h4>Punctuality Trend</h4>
                            <div class="trend-value {report.trends.punctualityChange.direction}">
                                {#if report.trends.punctualityChange.direction === 'improving'}
                                    ↑ Improving
                                {:else if report.trends.punctualityChange.direction === 'declining'}
                                    ↓ Declining
                                {:else}
                                    → Stable
                                {/if}
                                <span class="percentage">{report.trends.punctualityChange.percentage}%</span>
                            </div>
                        </div>
                        <div class="trend-card">
                            <h4>Hours Trend</h4>
                            <div class="trend-value {report.trends.hoursChange.direction === 'increasing' ? 'warning' : ''}">
                                {#if report.trends.hoursChange.direction === 'increasing'}
                                    ↑ Increasing
                                {:else if report.trends.hoursChange.direction === 'decreasing'}
                                    ↓ Decreasing
                                {:else}
                                    → Stable
                                {/if}
                                <span class="percentage">{report.trends.hoursChange.percentage}%</span>
                            </div>
                        </div>
                        <div class="trend-card">
                            <h4>Arrival Time</h4>
                            <div class="trend-value">
                                {report.trends.arrivalTimeTrend.trend === 'earlier' ? '↑ Getting earlier' : '↓ Getting later'}
                            </div>
                        </div>
                    </div>

                    <div class="weekly-breakdown">
                        <h4>Weekly Breakdown</h4>
                        <div class="week-bars">
                            {#each report.trends.weeklyTrends as week}
                                <div class="week-bar">
                                    <div class="bar-container">
                                        <div 
                                            class="bar on-time" 
                                            style="height: {(week.onTimeDays / 5) * 100}%"
                                            title="{week.onTimeDays} on-time"
                                        ></div>
                                        <div 
                                            class="bar late" 
                                            style="height: {(week.lateDays / 5) * 100}%"
                                            title="{week.lateDays} late"
                                        ></div>
                                    </div>
                                    <span class="week-label">{week.label}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            {#if activeTab === 'workload'}
                <div class="workload-section">
                    <div class="balance-meter">
                        <h4>Work-Life Balance Score</h4>
                        <div class="meter">
                            <div 
                                class="meter-fill {report.workload.balanceStatus}"
                                style="width: {report.workload.balanceScore}%"
                            ></div>
                        </div>
                        <div class="meter-labels">
                            <span>Concerning</span>
                            <span>Moderate</span>
                            <span>Healthy</span>
                        </div>
                        <p class="balance-status">{report.workload.balanceStatus}</p>
                    </div>

                    <div class="hours-distribution">
                        <h4>Hours Distribution</h4>
                        <div class="distribution-bars">
                            <div class="dist-item">
                                <span class="dist-label">Under 6h</span>
                                <div class="dist-bar">
                                    <div class="dist-fill warning" style="width: {(report.workload.hoursDistribution.under6 / report.summary.presentDays) * 100}%"></div>
                                </div>
                                <span class="dist-count">{report.workload.hoursDistribution.under6}</span>
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">Normal (6-9h)</span>
                                <div class="dist-bar">
                                    <div class="dist-fill success" style="width: {(report.workload.hoursDistribution.normal / report.summary.presentDays) * 100}%"></div>
                                </div>
                                <span class="dist-count">{report.workload.hoursDistribution.normal}</span>
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">Overtime (9-11h)</span>
                                <div class="dist-bar">
                                    <div class="dist-fill warning" style="width: {(report.workload.hoursDistribution.overtime / report.summary.presentDays) * 100}%"></div>
                                </div>
                                <span class="dist-count">{report.workload.hoursDistribution.overtime}</span>
                            </div>
                            <div class="dist-item">
                                <span class="dist-label">Excessive (11h+)</span>
                                <div class="dist-bar">
                                    <div class="dist-fill danger" style="width: {(report.workload.hoursDistribution.excessive / report.summary.presentDays) * 100}%"></div>
                                </div>
                                <span class="dist-count">{report.workload.hoursDistribution.excessive}</span>
                            </div>
                        </div>
                    </div>

                    {#if report.workload.recommendations.length > 0}
                        <div class="recommendations">
                            <h4>Recommendations</h4>
                            <ul>
                                {#each report.workload.recommendations as rec}
                                    <li>{rec}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if activeTab === 'suggestions'}
                <div class="suggestions-section">
                    {#if report.suggestions.length === 0}
                        <div class="no-suggestions">
                            <span>🎉</span>
                            <p>Great job! No improvement suggestions at this time.</p>
                        </div>
                    {:else}
                        {#each report.suggestions as suggestion}
                            <div class="suggestion-card {suggestion.priority}">
                                <div class="suggestion-header">
                                    <span class="priority-badge">{suggestion.priority}</span>
                                    <span class="category">{suggestion.category}</span>
                                </div>
                                <h4>{suggestion.title}</h4>
                                <p>{suggestion.description}</p>
                                {#if suggestion.actions}
                                    <ul class="actions">
                                        {#each suggestion.actions as action}
                                            <li>{action}</li>
                                        {/each}
                                    </ul>
                                {/if}
                                {#if suggestion.metric}
                                    <div class="metric">
                                        <span>Current: {suggestion.metric.current}{suggestion.metric.unit}</span>
                                        <span>Target: {suggestion.metric.target}{suggestion.metric.unit}</span>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- Email Modal -->
{#if showEmailModal}
    <div class="modal-overlay" on:click={() => showEmailModal = false}>
        <div class="modal" on:click|stopPropagation>
            <h3>📧 Send Report via Email</h3>
            <p class="modal-desc">The report will be sent to the email address below.</p>
            
            <input 
                type="email" 
                bind:value={emailAddress}
                placeholder="Enter email address"
                disabled={emailSending}
            />

            {#if emailStatus}
                <div class="email-status {emailStatus.type}">
                    {emailStatus.type === 'success' ? '✅' : '❌'} {emailStatus.message}
                </div>
            {/if}

            <div class="modal-actions">
                <button class="btn-secondary" on:click={() => showEmailModal = false} disabled={emailSending}>
                    Cancel
                </button>
                <button class="btn-primary" on:click={handleSendEmail} disabled={emailSending || !emailAddress}>
                    {#if emailSending}
                        <span class="btn-spinner"></span> Sending...
                    {:else}
                        Send Report
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}


<style>
    .report-container {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 900px;
        margin: 0 auto;
    }

    /* Loading & Empty States */
    .loading-state, .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        color: #6b7280;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top-color: #4f46e5;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    /* Header */
    .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .header-info h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #1f2937;
    }

    .header-info .period {
        margin: 0.25rem 0 0;
        color: #6b7280;
        font-size: 0.875rem;
    }

    .header-actions {
        display: flex;
        gap: 0.5rem;
    }

    .btn-primary, .btn-secondary {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-primary {
        background: #4f46e5;
        color: white;
    }

    .btn-primary:hover { background: #4338ca; }

    .btn-secondary {
        background: #f3f4f6;
        color: #374151;
    }

    .btn-secondary:hover { background: #e5e7eb; }

    /* Score Section */
    .score-section {
        display: flex;
        align-items: center;
        gap: 2rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 16px;
        margin-bottom: 1.5rem;
    }

    .score-card {
        text-align: center;
    }

    .score-ring {
        position: relative;
        width: 100px;
        height: 100px;
    }

    .score-ring svg {
        width: 100%;
        height: 100%;
    }

    .score-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.75rem;
        font-weight: bold;
        color: var(--score-color);
    }

    .score-label {
        display: block;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .quick-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        flex: 1;
    }

    .stat {
        text-align: center;
    }

    .stat-value {
        display: block;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
    }

    .stat-label {
        font-size: 0.75rem;
        color: #6b7280;
    }

    /* Tabs */
    .tabs {
        display: flex;
        gap: 0.25rem;
        background: #f3f4f6;
        padding: 0.25rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        overflow-x: auto;
    }

    .tab {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.625rem 1rem;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .tab:hover { color: #374151; }

    .tab.active {
        background: white;
        color: #4f46e5;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .tab-icon { font-size: 1rem; }

    /* Tab Content */
    .tab-content {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
    }

    /* Summary Tab */
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .summary-card {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 10px;
    }

    .summary-card h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        color: #374151;
    }

    .summary-stats {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .summary-stat {
        display: flex;
        justify-content: space-between;
        font-size: 0.8125rem;
    }

    .summary-stat .label { color: #6b7280; }
    .summary-stat .value { font-weight: 600; }
    .summary-stat .value.success { color: #059669; }
    .summary-stat .value.warning { color: #d97706; }
    .summary-stat .value.danger { color: #dc2626; }

    /* Attendance Tab */
    .attendance-table-wrapper {
        overflow-x: auto;
    }

    .attendance-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
    }

    .attendance-table th,
    .attendance-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    .attendance-table th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
    }

    .status-badge {
        display: inline-block;
        padding: 0.125rem 0.5rem;
        border-radius: 50px;
        font-size: 0.6875rem;
        font-weight: 500;
        text-transform: capitalize;
    }

    .status-badge.on-time { background: #d1fae5; color: #065f46; }
    .status-badge.late { background: #fee2e2; color: #991b1b; }
    .status-badge.absent { background: #f3f4f6; color: #6b7280; }

    .day-insights {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        flex-wrap: wrap;
    }

    .insight {
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.8125rem;
    }

    .insight.success { background: #ecfdf5; color: #065f46; }
    .insight.warning { background: #fffbeb; color: #92400e; }

    /* Trends Tab */
    .trend-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .trend-card {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
    }

    .trend-card h4 {
        margin: 0 0 0.5rem;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .trend-value {
        font-size: 0.9375rem;
        font-weight: 600;
        color: #374151;
    }

    .trend-value.improving { color: #059669; }
    .trend-value.declining { color: #dc2626; }
    .trend-value.warning { color: #d97706; }

    .trend-value .percentage {
        display: block;
        font-size: 0.75rem;
        opacity: 0.8;
    }

    .weekly-breakdown h4 {
        margin: 0 0 1rem;
        font-size: 0.875rem;
        color: #374151;
    }

    .week-bars {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        height: 120px;
    }

    .week-bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .bar-container {
        width: 100%;
        height: 100px;
        display: flex;
        flex-direction: column-reverse;
        gap: 2px;
    }

    .bar {
        width: 100%;
        border-radius: 4px 4px 0 0;
        min-height: 4px;
    }

    .bar.on-time { background: #10b981; }
    .bar.late { background: #f59e0b; }

    .week-label {
        font-size: 0.6875rem;
        color: #6b7280;
        margin-top: 0.5rem;
    }

    /* Workload Tab */
    .balance-meter {
        margin-bottom: 1.5rem;
    }

    .balance-meter h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
    }

    .meter {
        height: 12px;
        background: #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
    }

    .meter-fill {
        height: 100%;
        border-radius: 6px;
        transition: width 0.5s ease;
    }

    .meter-fill.healthy { background: linear-gradient(90deg, #10b981, #059669); }
    .meter-fill.moderate { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .meter-fill.concerning { background: linear-gradient(90deg, #ef4444, #dc2626); }

    .meter-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.6875rem;
        color: #9ca3af;
        margin-top: 0.25rem;
    }

    .balance-status {
        text-align: center;
        font-weight: 600;
        text-transform: capitalize;
        margin-top: 0.5rem;
        color: #374151;
    }

    .hours-distribution h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
    }

    .distribution-bars {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .dist-item {
        display: grid;
        grid-template-columns: 120px 1fr 40px;
        align-items: center;
        gap: 0.75rem;
    }

    .dist-label {
        font-size: 0.8125rem;
        color: #6b7280;
    }

    .dist-bar {
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
    }

    .dist-fill {
        height: 100%;
        border-radius: 4px;
    }

    .dist-fill.success { background: #10b981; }
    .dist-fill.warning { background: #f59e0b; }
    .dist-fill.danger { background: #ef4444; }

    .dist-count {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #374151;
        text-align: right;
    }

    .recommendations {
        margin-top: 1.5rem;
        padding: 1rem;
        background: #fffbeb;
        border-radius: 10px;
    }

    .recommendations h4 {
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
        color: #92400e;
    }

    .recommendations ul {
        margin: 0;
        padding-left: 1.25rem;
    }

    .recommendations li {
        font-size: 0.8125rem;
        color: #78350f;
        margin-bottom: 0.25rem;
    }

    /* Suggestions Tab */
    .no-suggestions {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }

    .no-suggestions span {
        font-size: 2.5rem;
        display: block;
        margin-bottom: 0.5rem;
    }

    .suggestion-card {
        background: #f9fafb;
        border-left: 4px solid #6b7280;
        padding: 1rem;
        border-radius: 0 10px 10px 0;
        margin-bottom: 1rem;
    }

    .suggestion-card.urgent { border-left-color: #dc2626; background: #fef2f2; }
    .suggestion-card.high { border-left-color: #f59e0b; background: #fffbeb; }
    .suggestion-card.medium { border-left-color: #3b82f6; background: #eff6ff; }
    .suggestion-card.low { border-left-color: #10b981; background: #ecfdf5; }
    .suggestion-card.info { border-left-color: #8b5cf6; background: #f5f3ff; }

    .suggestion-header {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .priority-badge {
        padding: 0.125rem 0.5rem;
        border-radius: 50px;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        background: rgba(0,0,0,0.1);
    }

    .category {
        font-size: 0.6875rem;
        color: #6b7280;
        text-transform: capitalize;
    }

    .suggestion-card h4 {
        margin: 0 0 0.375rem;
        font-size: 0.9375rem;
        color: #1f2937;
    }

    .suggestion-card p {
        margin: 0 0 0.75rem;
        font-size: 0.8125rem;
        color: #6b7280;
    }

    .suggestion-card .actions {
        margin: 0;
        padding-left: 1.25rem;
    }

    .suggestion-card .actions li {
        font-size: 0.8125rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
    }

    .suggestion-card .metric {
        display: flex;
        gap: 1rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid rgba(0,0,0,0.1);
        font-size: 0.75rem;
        color: #6b7280;
    }

    /* Modal */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal {
        background: white;
        padding: 1.5rem;
        border-radius: 16px;
        width: 90%;
        max-width: 400px;
    }

    .modal h3 {
        margin: 0 0 1rem;
        font-size: 1.125rem;
    }

    .modal-desc {
        margin: 0 0 1rem;
        font-size: 0.875rem;
        color: #6b7280;
    }

    .modal input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.9375rem;
        margin-bottom: 1rem;
    }

    .modal input:disabled {
        background: #f9fafb;
        cursor: not-allowed;
    }

    .email-status {
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }

    .email-status.success {
        background: #ecfdf5;
        color: #065f46;
    }

    .email-status.error {
        background: #fef2f2;
        color: #991b1b;
    }

    .btn-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-right: 0.5rem;
        vertical-align: middle;
    }

    .modal-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .score-section {
            flex-direction: column;
        }

        .quick-stats {
            grid-template-columns: repeat(2, 1fr);
        }

        .trend-cards {
            grid-template-columns: 1fr;
        }

        .header-actions {
            width: 100%;
            justify-content: flex-end;
        }

        .tab-label {
            display: none;
        }

        .tab {
            padding: 0.625rem;
        }

        .tab-icon {
            font-size: 1.25rem;
        }
    }
</style>
