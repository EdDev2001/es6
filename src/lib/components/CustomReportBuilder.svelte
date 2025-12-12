<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { browser } from '$app/environment';
    import { 
        WorkHabitReportGenerator, 
        ReportType,
        ReportSection,
        downloadReportAsPDF,
        saveReport,
        queueReportEmail
    } from '$lib/reports/workHabitReports.js';

    const dispatch = createEventDispatcher();

    // Props
    export let userId = null;
    export let userName = 'Employee';
    export let department = '';
    export let attendanceRecords = [];
    export let workConfig = {};

    // State
    let report = null;
    let loading = false;
    let generating = false;
    let saving = false;
    let showPreview = false;
    let activePreviewTab = 'summary';

    // Report Configuration
    let reportConfig = {
        name: '',
        dateRange: {
            type: 'preset',
            preset: 'weekly',
            startDate: '',
            endDate: ''
        },
        sections: {
            summary: true,
            attendance: true,
            trends: true,
            workload: true,
            earlyLeave: false,
            suggestions: true
        },
        format: 'pdf',
        includeCharts: true,
        compareWithPrevious: false
    };

    const datePresets = [
        { id: 'weekly', label: 'Last 7 Days', icon: '📅' },
        { id: 'biweekly', label: 'Last 14 Days', icon: '📆' },
        { id: 'monthly', label: 'Last 30 Days', icon: '🗓️' },
        { id: 'quarterly', label: 'Last 90 Days', icon: '📊' }
    ];

    const availableSections = [
        { id: 'summary', label: 'Executive Summary', icon: '📊', description: 'Overall score and key metrics' },
        { id: 'attendance', label: 'Attendance Details', icon: '📅', description: 'Daily breakdown with times' },
        { id: 'trends', label: 'Trends Analysis', icon: '📈', description: 'Weekly patterns and trends' },
        { id: 'workload', label: 'Workload Balance', icon: '⚖️', description: 'Hours distribution' },
        { id: 'earlyLeave', label: 'Early Leave Analysis', icon: '🚪', description: 'Early departure patterns' },
        { id: 'suggestions', label: 'Suggestions', icon: '💡', description: 'AI recommendations' }
    ];

    const exportFormats = [
        { id: 'pdf', label: 'PDF', icon: '📄' },
        { id: 'excel', label: 'Excel', icon: '📊' },
        { id: 'csv', label: 'CSV', icon: '📋' }
    ];

    $: previewTabs = Object.entries(reportConfig.sections)
        .filter(([_, enabled]) => enabled)
        .map(([id]) => availableSections.find(s => s.id === id))
        .filter(Boolean);

    function getDateRange() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let startDate, endDate = today;

        if (reportConfig.dateRange.type === 'custom') {
            startDate = new Date(reportConfig.dateRange.startDate);
            endDate = new Date(reportConfig.dateRange.endDate);
        } else {
            const days = { 'weekly': 7, 'biweekly': 14, 'monthly': 30, 'quarterly': 90 }[reportConfig.dateRange.preset] || 7;
            startDate = new Date(today);
            startDate.setDate(today.getDate() - days);
        }
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
    }

    async function generatePreview() {
        if (!userId || attendanceRecords.length === 0) return;
        generating = true;
        try {
            const { startDate, endDate } = getDateRange();
            const generator = new WorkHabitReportGenerator(userId, { userName, department, workConfig });
            report = await generator.generateReport(attendanceRecords, ReportType.CUSTOM, { start: startDate, end: endDate });
            showPreview = true;
            activePreviewTab = previewTabs[0]?.id || 'summary';
        } catch (error) {
            console.error('Error generating preview:', error);
        }
        generating = false;
    }

    async function handleExport() {
        if (!report) await generatePreview();
        if (!report) return;
        saving = true;
        try {
            if (reportConfig.format === 'pdf') {
                downloadReportAsPDF(report);
            } else {
                exportToSpreadsheet(report, reportConfig.format);
            }
            await saveReport(userId, { ...report, customConfig: reportConfig });
            dispatch('exported', { report, format: reportConfig.format });
        } catch (error) {
            console.error('Error exporting:', error);
        }
        saving = false;
    }

    function exportToSpreadsheet(report, format) {
        const rows = [
            ['Work Habit Report', report.meta.userName],
            ['Period', report.meta.period.label],
            ['Generated', new Date(report.meta.generatedAt).toLocaleString()],
            []
        ];
        if (reportConfig.sections.summary) {
            rows.push(['SUMMARY'], ['Score', report.summary.score], ['Present Days', report.summary.presentDays], []);
        }
        if (reportConfig.sections.attendance) {
            rows.push(['ATTENDANCE'], ['Date', 'Day', 'Check In', 'Check Out', 'Hours', 'Status']);
            report.attendance.dailyBreakdown.forEach(day => {
                rows.push([day.date, day.dayName, day.checkIn || '-', day.checkOut || '-', day.hours, day.status]);
            });
        }
        const csvContent = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `work-report.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function toggleSection(id) {
        reportConfig.sections[id] = !reportConfig.sections[id];
        if (!Object.values(reportConfig.sections).some(v => v)) reportConfig.sections.summary = true;
    }

    function selectAllSections() { Object.keys(reportConfig.sections).forEach(k => reportConfig.sections[k] = true); }
    function clearAllSections() { Object.keys(reportConfig.sections).forEach(k => reportConfig.sections[k] = false); reportConfig.sections.summary = true; }
    function getScoreColor(score) { return score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626'; }
    function getStatusClass(status) { return status === 'on-time' ? 'on-time' : status === 'late' ? 'late' : 'absent'; }

    onMount(() => {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        reportConfig.dateRange.endDate = today.toISOString().split('T')[0];
        reportConfig.dateRange.startDate = weekAgo.toISOString().split('T')[0];
    });

    $: selectedSectionCount = Object.values(reportConfig.sections).filter(v => v).length;
</script>

<div class="report-builder">
    <div class="builder-header">
        <h2>📊 Custom Report Builder</h2>
        <p>Create personalized attendance reports</p>
    </div>

    <div class="builder-content">
        <div class="config-panel">
            <div class="config-section">
                <h3>Report Name</h3>
                <input type="text" class="input-field" bind:value={reportConfig.name} placeholder="e.g., Q4 Review" />
            </div>

            <div class="config-section">
                <h3>📅 Date Range</h3>
                <div class="date-type-toggle">
                    <button class="toggle-btn" class:active={reportConfig.dateRange.type === 'preset'} on:click={() => reportConfig.dateRange.type = 'preset'}>Preset</button>
                    <button class="toggle-btn" class:active={reportConfig.dateRange.type === 'custom'} on:click={() => reportConfig.dateRange.type = 'custom'}>Custom</button>
                </div>
                {#if reportConfig.dateRange.type === 'preset'}
                    <div class="preset-grid">
                        {#each datePresets as preset}
                            <button class="preset-btn" class:active={reportConfig.dateRange.preset === preset.id} on:click={() => reportConfig.dateRange.preset = preset.id}>
                                <span>{preset.icon}</span> {preset.label}
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="custom-date-inputs">
                        <div class="date-input-group">
                            <label>Start</label>
                            <input type="date" class="input-field" bind:value={reportConfig.dateRange.startDate} />
                        </div>
                        <div class="date-input-group">
                            <label>End</label>
                            <input type="date" class="input-field" bind:value={reportConfig.dateRange.endDate} />
                        </div>
                    </div>
                {/if}
            </div>

            <div class="config-section">
                <div class="section-header">
                    <h3>📋 Sections</h3>
                    <div class="section-actions">
                        <button class="text-btn" on:click={selectAllSections}>All</button>
                        <button class="text-btn" on:click={clearAllSections}>Clear</button>
                    </div>
                </div>
                <p class="section-count">{selectedSectionCount}/{availableSections.length} selected</p>
                <div class="sections-list">
                    {#each availableSections as section}
                        <button class="section-item" class:selected={reportConfig.sections[section.id]} on:click={() => toggleSection(section.id)}>
                            <div class="section-checkbox">{#if reportConfig.sections[section.id]}✓{/if}</div>
                            <div class="section-info">
                                <span class="section-title">{section.icon} {section.label}</span>
                                <span class="section-desc">{section.description}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <div class="config-section">
                <h3>📤 Format</h3>
                <div class="format-options">
                    {#each exportFormats as format}
                        <button class="format-btn" class:active={reportConfig.format === format.id} on:click={() => reportConfig.format = format.id}>
                            {format.icon} {format.label}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="config-section">
                <h3>⚙️ Options</h3>
                <label class="option-item"><input type="checkbox" bind:checked={reportConfig.includeCharts} /> Include charts</label>
                <label class="option-item"><input type="checkbox" bind:checked={reportConfig.compareWithPrevious} /> Compare periods</label>
            </div>

            <div class="action-buttons">
                <button class="btn-secondary" on:click={generatePreview} disabled={generating}>{generating ? '⏳...' : '👁️ Preview'}</button>
                <button class="btn-primary" on:click={handleExport} disabled={saving || generating}>{saving ? '💾...' : '📥 Export'}</button>
            </div>
        </div>

        {#if showPreview && report}
            <div class="preview-panel">
                <div class="preview-header">
                    <h3>Preview</h3>
                    <button class="close-preview" on:click={() => showPreview = false}>✕</button>
                </div>

                {#if reportConfig.sections.summary}
                    <div class="preview-score" style="--score-color: {getScoreColor(report.summary.score)}">
                        <div class="score-ring">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--score-color)" stroke-width="8" stroke-linecap="round" stroke-dasharray="{report.summary.score * 2.83} 283" transform="rotate(-90 50 50)"/>
                            </svg>
                            <div class="score-value">{report.summary.score}</div>
                        </div>
                        <div class="score-meta">
                            <span class="score-label">Score</span>
                            <span class="period-label">{report.meta.period.label}</span>
                        </div>
                    </div>
                {/if}

                {#if previewTabs.length > 1}
                    <div class="preview-tabs">
                        {#each previewTabs as tab}
                            <button class="preview-tab" class:active={activePreviewTab === tab.id} on:click={() => activePreviewTab = tab.id}>{tab.icon}</button>
                        {/each}
                    </div>
                {/if}

                <div class="preview-content">
                    {#if activePreviewTab === 'summary' && reportConfig.sections.summary}
                        <div class="summary-grid">
                            <div class="stat-card"><span class="stat-value">{report.summary.presentDays}/{report.summary.totalDays}</span><span class="stat-label">Present</span></div>
                            <div class="stat-card"><span class="stat-value">{report.summary.punctualityRate}%</span><span class="stat-label">Punctual</span></div>
                            <div class="stat-card"><span class="stat-value">{report.summary.totalHours}h</span><span class="stat-label">Hours</span></div>
                            <div class="stat-card"><span class="stat-value">{report.summary.totalOvertime}h</span><span class="stat-label">Overtime</span></div>
                        </div>
                    {/if}

                    {#if activePreviewTab === 'attendance' && reportConfig.sections.attendance}
                        <div class="attendance-preview">
                            <table>
                                <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Status</th></tr></thead>
                                <tbody>
                                    {#each report.attendance.dailyBreakdown.slice(0, 5) as day}
                                        <tr><td>{day.date}</td><td>{day.checkIn || '-'}</td><td>{day.checkOut || '-'}</td><td><span class="status-badge {getStatusClass(day.status)}">{day.status}</span></td></tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}

                    {#if activePreviewTab === 'trends' && reportConfig.sections.trends}
                        <div class="trends-preview">
                            <div class="trend-item"><span>Punctuality</span><span class="trend-value {report.trends.punctualityChange.direction}">{report.trends.punctualityChange.direction === 'improving' ? '↑' : '↓'} {report.trends.punctualityChange.percentage}%</span></div>
                            <div class="trend-item"><span>Hours</span><span class="trend-value">{report.trends.hoursChange.direction === 'increasing' ? '↑' : '↓'} {report.trends.hoursChange.percentage}%</span></div>
                        </div>
                    {/if}

                    {#if activePreviewTab === 'workload' && reportConfig.sections.workload}
                        <div class="workload-preview">
                            <div class="balance-bar"><div class="balance-fill {report.workload.balanceStatus}" style="width: {report.workload.balanceScore}%"></div></div>
                            <span class="balance-label">{report.workload.balanceStatus}</span>
                        </div>
                    {/if}

                    {#if activePreviewTab === 'earlyLeave' && reportConfig.sections.earlyLeave}
                        <div class="el-preview">
                            <span class="el-value">{report.earlyLeave.count}</span>
                            <span class="el-label">Early Leaves ({report.earlyLeave.percentage}%)</span>
                        </div>
                    {/if}

                    {#if activePreviewTab === 'suggestions' && reportConfig.sections.suggestions}
                        <div class="suggestions-preview">
                            {#if report.suggestions.length === 0}
                                <p class="no-suggestions">🎉 No suggestions needed!</p>
                            {:else}
                                {#each report.suggestions.slice(0, 2) as s}
                                    <div class="suggestion-item {s.priority}">{s.title}</div>
                                {/each}
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>


<style>
    .report-builder { font-family: system-ui, -apple-system, sans-serif; max-width: 1100px; margin: 0 auto; }
    .builder-header { margin-bottom: 1.5rem; }
    .builder-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--theme-text, #1f2937); }
    .builder-header p { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--theme-text-secondary, #6b7280); }
    .builder-content { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .config-panel { background: var(--theme-card-bg, white); border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 16px; padding: 1.5rem; }
    .config-section { margin-bottom: 1.5rem; }
    .config-section:last-of-type { margin-bottom: 0; }
    .config-section h3 { margin: 0 0 0.75rem; font-size: 0.9375rem; font-weight: 600; color: var(--theme-text, #374151); }
    .input-field { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--theme-border, #d1d5db); border-radius: 10px; font-size: 0.875rem; color: var(--theme-text, #1f2937); background: var(--theme-bg, #f9fafb); transition: all 0.2s; }
    .input-field:focus { outline: none; border-color: #007AFF; box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); }
    .date-type-toggle { display: flex; gap: 0.25rem; background: var(--theme-bg, #f3f4f6); padding: 0.25rem; border-radius: 10px; margin-bottom: 1rem; }
    .toggle-btn { flex: 1; padding: 0.5rem 1rem; border: none; border-radius: 8px; background: transparent; color: var(--theme-text-secondary, #6b7280); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .toggle-btn.active { background: var(--theme-card-bg, white); color: #007AFF; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .preset-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 10px; background: var(--theme-bg, #f9fafb); color: var(--theme-text, #374151); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .preset-btn:hover { border-color: var(--theme-border, #d1d5db); }
    .preset-btn.active { border-color: #007AFF; background: rgba(0, 122, 255, 0.05); color: #007AFF; }
    .custom-date-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .date-input-group label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--theme-text-secondary, #6b7280); margin-bottom: 0.375rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; }
    .section-header h3 { margin: 0; }
    .section-actions { display: flex; gap: 0.5rem; }
    .text-btn { padding: 0.25rem 0.5rem; border: none; background: transparent; color: #007AFF; font-size: 0.75rem; font-weight: 500; cursor: pointer; }
    .text-btn:hover { text-decoration: underline; }
    .section-count { margin: 0.25rem 0 0.75rem; font-size: 0.75rem; color: var(--theme-text-secondary, #9ca3af); }
    .sections-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .section-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 10px; background: var(--theme-bg, #f9fafb); cursor: pointer; transition: all 0.2s; text-align: left; }
    .section-item:hover { border-color: var(--theme-border, #d1d5db); }
    .section-item.selected { border-color: #007AFF; background: rgba(0, 122, 255, 0.05); }
    .section-checkbox { width: 20px; height: 20px; border: 2px solid var(--theme-border, #d1d5db); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.75rem; font-weight: bold; color: white; transition: all 0.2s; }
    .section-item.selected .section-checkbox { background: #007AFF; border-color: #007AFF; }
    .section-info { flex: 1; }
    .section-title { display: block; font-size: 0.875rem; font-weight: 500; color: var(--theme-text, #374151); }
    .section-desc { display: block; font-size: 0.75rem; color: var(--theme-text-secondary, #9ca3af); margin-top: 0.125rem; }
    .format-options { display: flex; gap: 0.5rem; }
    .format-btn { flex: 1; padding: 0.75rem; border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 10px; background: var(--theme-bg, #f9fafb); color: var(--theme-text, #374151); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .format-btn:hover { border-color: var(--theme-border, #d1d5db); }
    .format-btn.active { border-color: #007AFF; background: rgba(0, 122, 255, 0.05); color: #007AFF; }
    .option-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; color: var(--theme-text, #374151); cursor: pointer; margin-bottom: 0.5rem; }
    .option-item input[type="checkbox"] { width: 18px; height: 18px; accent-color: #007AFF; }
    .action-buttons { display: flex; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--theme-border-light, #e5e7eb); }
    .btn-primary, .btn-secondary { flex: 1; padding: 0.875rem 1.5rem; border: none; border-radius: 12px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #007AFF; color: white; }
    .btn-primary:hover:not(:disabled) { background: #0066d6; }
    .btn-secondary { background: var(--theme-bg, #f3f4f6); color: var(--theme-text, #374151); }
    .btn-secondary:hover:not(:disabled) { background: var(--theme-border-light, #e5e7eb); }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
    .preview-panel { background: var(--theme-card-bg, white); border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 16px; padding: 1.5rem; height: fit-content; position: sticky; top: 1rem; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .preview-header h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--theme-text, #374151); }
    .close-preview { width: 28px; height: 28px; border: none; border-radius: 50%; background: var(--theme-bg, #f3f4f6); color: var(--theme-text-secondary, #6b7280); font-size: 0.875rem; cursor: pointer; }
    .close-preview:hover { background: var(--theme-border-light, #e5e7eb); }
    .preview-score { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; margin-bottom: 1rem; }
    .score-ring { position: relative; width: 70px; height: 70px; }
    .score-ring svg { width: 100%; height: 100%; }
    .score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.25rem; font-weight: bold; color: var(--score-color); }
    .score-meta { display: flex; flex-direction: column; }
    .score-label { font-size: 0.875rem; font-weight: 600; color: var(--theme-text, #374151); }
    .period-label { font-size: 0.75rem; color: var(--theme-text-secondary, #6b7280); }
    .preview-tabs { display: flex; gap: 0.25rem; background: var(--theme-bg, #f3f4f6); padding: 0.25rem; border-radius: 10px; margin-bottom: 1rem; }
    .preview-tab { padding: 0.5rem 0.75rem; border: none; border-radius: 8px; background: transparent; color: var(--theme-text-secondary, #6b7280); font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
    .preview-tab.active { background: var(--theme-card-bg, white); color: #007AFF; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .preview-content { min-height: 150px; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .stat-card { padding: 1rem; background: var(--theme-bg, #f9fafb); border-radius: 10px; text-align: center; }
    .stat-value { display: block; font-size: 1.25rem; font-weight: 700; color: var(--theme-text, #1f2937); }
    .stat-label { font-size: 0.6875rem; color: var(--theme-text-secondary, #6b7280); text-transform: uppercase; }
    .attendance-preview table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
    .attendance-preview th, .attendance-preview td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--theme-border-light, #e5e7eb); }
    .attendance-preview th { font-weight: 600; color: var(--theme-text-secondary, #6b7280); }
    .status-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 50px; font-size: 0.625rem; font-weight: 500; text-transform: capitalize; }
    .status-badge.on-time { background: #d1fae5; color: #065f46; }
    .status-badge.late { background: #fee2e2; color: #991b1b; }
    .status-badge.absent { background: #f3f4f6; color: #6b7280; }
    .trends-preview { display: flex; flex-direction: column; gap: 0.75rem; }
    .trend-item { display: flex; justify-content: space-between; padding: 0.75rem; background: var(--theme-bg, #f9fafb); border-radius: 8px; font-size: 0.8125rem; }
    .trend-value { font-weight: 600; }
    .trend-value.improving { color: #059669; }
    .trend-value.declining { color: #dc2626; }
    .workload-preview { text-align: center; }
    .balance-bar { height: 8px; background: var(--theme-border-light, #e5e7eb); border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }
    .balance-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .balance-fill.healthy { background: #059669; }
    .balance-fill.moderate { background: #d97706; }
    .balance-fill.concerning { background: #dc2626; }
    .balance-label { font-size: 0.75rem; color: var(--theme-text-secondary, #6b7280); text-transform: capitalize; }
    .el-preview { text-align: center; padding: 1rem; }
    .el-value { display: block; font-size: 2rem; font-weight: 700; color: var(--theme-text, #1f2937); }
    .el-label { font-size: 0.75rem; color: var(--theme-text-secondary, #6b7280); }
    .suggestions-preview { display: flex; flex-direction: column; gap: 0.5rem; }
    .no-suggestions { text-align: center; padding: 1rem; color: var(--theme-text-secondary, #6b7280); }
    .suggestion-item { padding: 0.75rem; background: var(--theme-bg, #f9fafb); border-radius: 8px; border-left: 3px solid; font-size: 0.8125rem; }
    .suggestion-item.urgent { border-color: #dc2626; }
    .suggestion-item.high { border-color: #d97706; }
    .suggestion-item.medium { border-color: #007AFF; }
    .suggestion-item.low { border-color: #6b7280; }
    .suggestion-item.info { border-color: #059669; }

    @media (max-width: 900px) { .builder-content { grid-template-columns: 1fr; } .preview-panel { position: static; } }
    @media (max-width: 480px) { .config-panel, .preview-panel { padding: 1rem; border-radius: 12px; } .preset-grid, .custom-date-inputs { grid-template-columns: 1fr; } .format-options, .action-buttons { flex-direction: column; } .summary-grid { grid-template-columns: 1fr; } }
</style>
