<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { IconCalendar, IconBuilding, IconFileAnalytics, IconDownload, IconLoader2, IconFilter, IconX, IconCheck, IconFileTypePdf, IconFileSpreadsheet, IconFileTypeCsv, IconPrinter, IconChevronDown, IconEye } from '@tabler/icons-svelte';
    import { ExportService } from '$lib/reports/exportService.js';
    import { AttendanceAnalytics, ReportPeriod, AttendanceReportType } from '$lib/reports/attendanceReports.js';

    const dispatch = createEventDispatcher();

    // Props
    export let attendanceRecords = [];
    export let departments = [];
    export let users = [];

    // State
    let generating = false;
    let previewData = null;
    let showPreview = false;

    // Report Configuration
    let config = {
        dateRange: { type: 'preset', preset: 'monthly', startDate: '', endDate: '' },
        department: 'all',
        reportType: 'summary',
        outputFormat: 'pdf',
        includeCharts: true,
        includeDepartmentComparison: true
    };

    const datePresets = [
        { id: 'daily', label: 'Today', icon: '📅' },
        { id: 'weekly', label: 'Last 7 Days', icon: '📆' },
        { id: 'monthly', label: 'Last 30 Days', icon: '🗓️' },
        { id: 'quarterly', label: 'Last 90 Days', icon: '📊' }
    ];

    const reportTypes = [
        { id: 'summary', label: 'Summary Report', desc: 'High-level overview with key metrics', icon: IconFileAnalytics },
        { id: 'detailed', label: 'Detailed Report', desc: 'Full breakdown with individual records', icon: IconFileSpreadsheet }
    ];

    const outputFormats = [
        { id: 'pdf', label: 'PDF', icon: IconFileTypePdf, desc: 'Print-ready document' },
        { id: 'excel', label: 'Excel', icon: IconFileSpreadsheet, desc: 'Spreadsheet format' },
        { id: 'csv', label: 'CSV', icon: IconFileTypeCsv, desc: 'Raw data export' },
        { id: 'print', label: 'Print', icon: IconPrinter, desc: 'Direct print' }
    ];

    const analytics = new AttendanceAnalytics();

    function getDateRange() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let startDate, endDate = today;

        if (config.dateRange.type === 'custom' && config.dateRange.startDate && config.dateRange.endDate) {
            startDate = new Date(config.dateRange.startDate);
            endDate = new Date(config.dateRange.endDate);
        } else {
            const days = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 }[config.dateRange.preset] || 30;
            startDate = new Date(today);
            startDate.setDate(today.getDate() - days);
        }
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
    }

    function filterRecords() {
        const { startDate, endDate } = getDateRange();
        let filtered = attendanceRecords.filter(r => {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
        });

        if (config.department !== 'all') {
            filtered = filtered.filter(r => r.department === config.department || r.departmentOrCourse === config.department);
        }
        return filtered;
    }

    async function generatePreview() {
        generating = true;
        try {
            const records = filterRecords();
            const { startDate, endDate } = getDateRange();
            const stats = await analytics.getOverviewStats(records, ReportPeriod.CUSTOM);
            
            let deptComparison = [];
            if (config.includeDepartmentComparison && config.department === 'all') {
                deptComparison = await analytics.getDepartmentComparison(records, departments);
            }

            const details = config.reportType === 'detailed' ? records.map(r => ({
                date: r.date,
                name: users.find(u => u.uid === r.userId)?.name || r.userName || 'Unknown',
                department: r.department || r.departmentOrCourse || '-',
                checkIn: r.checkIn?.timestamp ? new Date(r.checkIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
                checkOut: r.checkOut?.timestamp ? new Date(r.checkOut.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
                hours: analytics.calculateHours ? Math.round(analytics.calculateHours(r) * 10) / 10 : '-',
                status: r.checkIn?.timestamp ? (analytics.isLate && analytics.isLate(r) ? 'Late' : 'Present') : 'Absent'
            })).slice(0, 100) : [];

            previewData = {
                summary: stats.summary,
                details,
                departments: deptComparison,
                period: { start: startDate.toLocaleDateString(), end: endDate.toLocaleDateString() },
                generatedAt: new Date().toLocaleString(),
                config: { ...config }
            };
            showPreview = true;
        } catch (error) {
            console.error('Error generating preview:', error);
        }
        generating = false;
    }

    async function exportReport() {
        if (!previewData) await generatePreview();
        if (!previewData) return;

        generating = true;
        const filename = `attendance-report-${config.department === 'all' ? 'all-depts' : config.department}-${new Date().toISOString().split('T')[0]}`;
        const title = `Attendance Report${config.department !== 'all' ? ` - ${config.department}` : ''}`;

        try {
            if (config.outputFormat === 'pdf' || config.outputFormat === 'print') {
                ExportService.exportToPDF(previewData, { title, period: `${previewData.period.start} - ${previewData.period.end}`, generatedBy: 'Admin' });
            } else if (config.outputFormat === 'excel') {
                const data = config.reportType === 'detailed' ? previewData.details : [previewData.summary];
                ExportService.exportToExcel(data, filename, 'Attendance Report');
            } else if (config.outputFormat === 'csv') {
                const data = config.reportType === 'detailed' ? previewData.details : [previewData.summary];
                ExportService.exportToCSV(data, filename);
            }
            dispatch('exported', { format: config.outputFormat, config });
        } catch (error) {
            console.error('Export error:', error);
        }
        generating = false;
    }

    onMount(() => {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        config.dateRange.endDate = today.toISOString().split('T')[0];
        config.dateRange.startDate = monthAgo.toISOString().split('T')[0];
    });
</script>

<div class="report-builder">
    <div class="builder-header">
        <div class="header-info">
            <IconFileAnalytics size={24} stroke={1.5} />
            <div>
                <h2>Custom Report Builder</h2>
                <p>Generate attendance reports with custom parameters</p>
            </div>
        </div>
    </div>

    <div class="builder-content">
        <div class="config-panel">
            <!-- Date Range -->
            <div class="config-section">
                <h3><IconCalendar size={16} stroke={1.5} /> Date Range</h3>
                <div class="date-toggle">
                    <button class:active={config.dateRange.type === 'preset'} on:click={() => config.dateRange.type = 'preset'}>Preset</button>
                    <button class:active={config.dateRange.type === 'custom'} on:click={() => config.dateRange.type = 'custom'}>Custom</button>
                </div>
                {#if config.dateRange.type === 'preset'}
                    <div class="preset-grid">
                        {#each datePresets as preset}
                            <button class="preset-btn" class:active={config.dateRange.preset === preset.id} on:click={() => config.dateRange.preset = preset.id}>
                                <span>{preset.icon}</span> {preset.label}
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="date-inputs">
                        <div class="date-field">
                            <label>Start Date</label>
                            <input type="date" bind:value={config.dateRange.startDate} />
                        </div>
                        <div class="date-field">
                            <label>End Date</label>
                            <input type="date" bind:value={config.dateRange.endDate} />
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Department Selection -->
            <div class="config-section">
                <h3><IconBuilding size={16} stroke={1.5} /> Department</h3>
                <div class="select-wrapper">
                    <select bind:value={config.department}>
                        <option value="all">All Departments</option>
                        {#each departments as dept}
                            <option value={dept.name || dept.id}>{dept.name || dept.id}</option>
                        {/each}
                    </select>
                    <IconChevronDown size={16} stroke={2} />
                </div>
            </div>

            <!-- Report Type -->
            <div class="config-section">
                <h3><IconFilter size={16} stroke={1.5} /> Report Type</h3>
                <div class="type-options">
                    {#each reportTypes as type}
                        <button class="type-btn" class:active={config.reportType === type.id} on:click={() => config.reportType = type.id}>
                            <svelte:component this={type.icon} size={20} stroke={1.5} />
                            <div class="type-info">
                                <span class="type-label">{type.label}</span>
                                <span class="type-desc">{type.desc}</span>
                            </div>
                            {#if config.reportType === type.id}<IconCheck size={16} stroke={2} class="check-icon" />{/if}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Output Format -->
            <div class="config-section">
                <h3><IconDownload size={16} stroke={1.5} /> Output Format</h3>
                <div class="format-grid">
                    {#each outputFormats as format}
                        <button class="format-btn" class:active={config.outputFormat === format.id} on:click={() => config.outputFormat = format.id}>
                            <svelte:component this={format.icon} size={20} stroke={1.5} />
                            <span>{format.label}</span>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Options -->
            <div class="config-section">
                <h3>Options</h3>
                <label class="checkbox-item">
                    <input type="checkbox" bind:checked={config.includeCharts} />
                    <span>Include visual charts</span>
                </label>
                <label class="checkbox-item">
                    <input type="checkbox" bind:checked={config.includeDepartmentComparison} />
                    <span>Include department comparison</span>
                </label>
            </div>

            <!-- Actions -->
            <div class="action-buttons">
                <button class="btn-secondary" on:click={generatePreview} disabled={generating}>
                    {#if generating}<IconLoader2 size={16} stroke={2} class="spin" />{:else}<IconEye size={16} stroke={2} />{/if}
                    Preview
                </button>
                <button class="btn-primary" on:click={exportReport} disabled={generating}>
                    {#if generating}<IconLoader2 size={16} stroke={2} class="spin" />{:else}<IconDownload size={16} stroke={2} />{/if}
                    Generate Report
                </button>
            </div>
        </div>

        <!-- Preview Panel -->
        {#if showPreview && previewData}
            <div class="preview-panel">
                <div class="preview-header">
                    <h3>Report Preview</h3>
                    <button class="close-btn" on:click={() => showPreview = false}><IconX size={18} stroke={2} /></button>
                </div>

                <div class="preview-meta">
                    <span>📅 {previewData.period.start} - {previewData.period.end}</span>
                    <span>🏢 {config.department === 'all' ? 'All Departments' : config.department}</span>
                </div>

                <div class="preview-stats">
                    <div class="stat-card highlight">
                        <span class="stat-value">{previewData.summary.attendanceRate}%</span>
                        <span class="stat-label">Attendance</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">{previewData.summary.presentDays}</span>
                        <span class="stat-label">Present</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">{previewData.summary.absentDays}</span>
                        <span class="stat-label">Absent</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">{previewData.summary.lateDays}</span>
                        <span class="stat-label">Late</span>
                    </div>
                </div>

                {#if config.reportType === 'detailed' && previewData.details.length > 0}
                    <div class="preview-table">
                        <table>
                            <thead><tr><th>Date</th><th>Name</th><th>In</th><th>Out</th><th>Status</th></tr></thead>
                            <tbody>
                                {#each previewData.details.slice(0, 10) as row}
                                    <tr>
                                        <td>{row.date}</td>
                                        <td>{row.name}</td>
                                        <td>{row.checkIn}</td>
                                        <td>{row.checkOut}</td>
                                        <td><span class="status-badge {row.status.toLowerCase()}">{row.status}</span></td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                        {#if previewData.details.length > 10}
                            <p class="more-rows">+ {previewData.details.length - 10} more records</p>
                        {/if}
                    </div>
                {/if}

                {#if previewData.departments.length > 0}
                    <div class="preview-depts">
                        <h4>Department Comparison</h4>
                        {#each previewData.departments.slice(0, 5) as dept, i}
                            <div class="dept-row">
                                <span class="dept-rank">#{i + 1}</span>
                                <span class="dept-name">{dept.department}</span>
                                <span class="dept-rate">{dept.attendanceRate}%</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>


<style>
    .report-builder { font-family: system-ui, -apple-system, sans-serif; }
    .builder-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .header-info { display: flex; align-items: center; gap: 12px; color: var(--theme-text, #1f2937); }
    .header-info h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .header-info p { margin: 0; font-size: 0.8125rem; color: var(--theme-text-secondary, #6b7280); }
    .builder-content { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .config-panel { background: var(--theme-card-bg, white); border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 16px; padding: 24px; }
    .config-section { margin-bottom: 24px; }
    .config-section:last-of-type { margin-bottom: 0; }
    .config-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 0.875rem; font-weight: 600; color: var(--theme-text, #374151); }
    .date-toggle { display: flex; gap: 4px; background: var(--theme-bg, #f3f4f6); padding: 4px; border-radius: 10px; margin-bottom: 12px; }
    .date-toggle button { flex: 1; padding: 8px 16px; border: none; border-radius: 8px; background: transparent; color: var(--theme-text-secondary, #6b7280); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .date-toggle button.active { background: var(--theme-card-bg, white); color: var(--apple-accent, #007AFF); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .preset-btn { display: flex; align-items: center; gap: 8px; padding: 12px; border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 10px; background: var(--theme-bg, #f9fafb); color: var(--theme-text, #374151); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .preset-btn:hover { border-color: var(--theme-border, #d1d5db); }
    .preset-btn.active { border-color: var(--apple-accent, #007AFF); background: rgba(0, 122, 255, 0.05); color: var(--apple-accent, #007AFF); }
    .date-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .date-field label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--theme-text-secondary, #6b7280); margin-bottom: 6px; }
    .date-field input { width: 100%; padding: 10px 12px; border: 1px solid var(--theme-border, #d1d5db); border-radius: 10px; font-size: 0.875rem; background: var(--theme-bg, #f9fafb); }
    .date-field input:focus { outline: none; border-color: var(--apple-accent, #007AFF); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); }
    .select-wrapper { position: relative; }
    .select-wrapper select { width: 100%; padding: 12px 40px 12px 14px; border: 1px solid var(--theme-border, #d1d5db); border-radius: 10px; font-size: 0.875rem; background: var(--theme-bg, #f9fafb); appearance: none; cursor: pointer; }
    .select-wrapper select:focus { outline: none; border-color: var(--apple-accent, #007AFF); }
    .select-wrapper :global(svg) { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--theme-text-secondary, #6b7280); }
    .type-options { display: flex; flex-direction: column; gap: 8px; }
    .type-btn { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 12px; background: var(--theme-bg, #f9fafb); cursor: pointer; transition: all 0.2s; text-align: left; }
    .type-btn:hover { border-color: var(--theme-border, #d1d5db); }
    .type-btn.active { border-color: var(--apple-accent, #007AFF); background: rgba(0, 122, 255, 0.05); }
    .type-info { flex: 1; }
    .type-label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--theme-text, #374151); }
    .type-desc { display: block; font-size: 0.75rem; color: var(--theme-text-secondary, #9ca3af); margin-top: 2px; }
    :global(.check-icon) { color: var(--apple-accent, #007AFF); }
    .format-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .format-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 10px; background: var(--theme-bg, #f9fafb); color: var(--theme-text, #374151); font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .format-btn:hover { border-color: var(--theme-border, #d1d5db); }
    .format-btn.active { border-color: var(--apple-accent, #007AFF); background: rgba(0, 122, 255, 0.05); color: var(--apple-accent, #007AFF); }
    .checkbox-item { display: flex; align-items: center; gap: 10px; font-size: 0.875rem; color: var(--theme-text, #374151); cursor: pointer; margin-bottom: 10px; }
    .checkbox-item input { width: 18px; height: 18px; accent-color: var(--apple-accent, #007AFF); }
    .action-buttons { display: flex; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--theme-border-light, #e5e7eb); }
    .btn-primary, .btn-secondary { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border: none; border-radius: 12px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: var(--apple-accent, #007AFF); color: white; }
    .btn-primary:hover:not(:disabled) { background: #0066d6; }
    .btn-secondary { background: var(--theme-bg, #f3f4f6); color: var(--theme-text, #374151); }
    .btn-secondary:hover:not(:disabled) { background: var(--theme-border-light, #e5e7eb); }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .preview-panel { background: var(--theme-card-bg, white); border: 1px solid var(--theme-border-light, #e5e7eb); border-radius: 16px; padding: 24px; height: fit-content; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .preview-header h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--theme-text, #374151); }
    .close-btn { width: 32px; height: 32px; border: none; border-radius: 50%; background: var(--theme-bg, #f3f4f6); color: var(--theme-text-secondary, #6b7280); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .close-btn:hover { background: var(--theme-border-light, #e5e7eb); }
    .preview-meta { display: flex; gap: 16px; font-size: 0.8125rem; color: var(--theme-text-secondary, #6b7280); margin-bottom: 16px; }
    .preview-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { padding: 16px; background: var(--theme-bg, #f9fafb); border-radius: 12px; text-align: center; }
    .stat-card.highlight { background: linear-gradient(135deg, var(--apple-accent, #007AFF), #5856D6); color: white; }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; }
    .stat-label { font-size: 0.6875rem; text-transform: uppercase; opacity: 0.8; }
    .stat-card.highlight .stat-value, .stat-card.highlight .stat-label { color: white; }
    .preview-table { margin-bottom: 20px; }
    .preview-table table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
    .preview-table th, .preview-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--theme-border-light, #e5e7eb); }
    .preview-table th { font-weight: 600; color: var(--theme-text-secondary, #6b7280); background: var(--theme-bg, #f9fafb); }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 50px; font-size: 0.625rem; font-weight: 500; }
    .status-badge.present { background: #d1fae5; color: #065f46; }
    .status-badge.late { background: #fef3c7; color: #92400e; }
    .status-badge.absent { background: #fee2e2; color: #991b1b; }
    .more-rows { margin: 12px 0 0; font-size: 0.75rem; color: var(--theme-text-secondary, #9ca3af); text-align: center; }
    .preview-depts h4 { margin: 0 0 12px; font-size: 0.875rem; font-weight: 600; color: var(--theme-text, #374151); }
    .dept-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--theme-border-light, #e5e7eb); }
    .dept-row:last-child { border-bottom: none; }
    .dept-rank { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--theme-bg, #f3f4f6); border-radius: 50%; font-size: 0.75rem; font-weight: 600; color: var(--theme-text-secondary, #6b7280); }
    .dept-name { flex: 1; font-size: 0.875rem; color: var(--theme-text, #374151); }
    .dept-rate { font-size: 0.875rem; font-weight: 600; color: var(--apple-green, #34C759); }

    @media (max-width: 900px) { .builder-content { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .config-panel, .preview-panel { padding: 16px; } .preset-grid, .date-inputs { grid-template-columns: 1fr; } .format-grid { grid-template-columns: repeat(2, 1fr); } .preview-stats { grid-template-columns: repeat(2, 1fr); } .action-buttons { flex-direction: column; } }
</style>
