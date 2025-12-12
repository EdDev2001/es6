<script>
    import { onMount } from "svelte";
    import { adminAuthStore } from "$lib/stores/adminAuth.js";
    import { IconFileAnalytics, IconDownload, IconCalendar, IconLoader2, IconChartBar, IconUsers, IconClockHour4 } from "@tabler/icons-svelte";

    let isLoading = false;
    let reportType = 'attendance';
    let dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let dateTo = new Date().toISOString().split('T')[0];
    let reportData = null;

    const reportTypes = [
        { id: 'attendance', label: 'Attendance Report', icon: IconClockHour4 },
        { id: 'users', label: 'User Activity Report', icon: IconUsers },
        { id: 'summary', label: 'Summary Report', icon: IconChartBar }
    ];

    async function generateReport() {
        isLoading = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const response = await fetch(`/api/admin/reports?type=${reportType}&from=${dateFrom}&to=${dateTo}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                reportData = await response.json();
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            isLoading = false;
        }
    }

    async function downloadReport(format) {
        const { accessToken } = adminAuthStore.getStoredTokens();
        window.open(`/api/admin/reports/download?type=${reportType}&from=${dateFrom}&to=${dateTo}&format=${format}&token=${accessToken}`, '_blank');
    }
</script>

<svelte:head>
    <title>Reports | Admin Panel</title>
</svelte:head>

<div class="reports-page">
    <header class="page-header">
        <div class="header-content">
            <h1>Reports</h1>
            <p class="header-subtitle">Generate and export attendance reports</p>
        </div>
    </header>

    <div class="reports-grid">
        <!-- Report Configuration -->
        <div class="config-card apple-card">
            <h2>Report Configuration</h2>
            
            <div class="form-group">
                <label class="apple-label">Report Type</label>
                <div class="report-types">
                    {#each reportTypes as type}
                        <button class="type-btn" class:active={reportType === type.id} on:click={() => reportType = type.id}>
                            <svelte:component this={type.icon} size={20} stroke={1.5} />
                            <span>{type.label}</span>
                        </button>
                    {/each}
                </div>
            </div>

            <div class="date-range">
                <div class="form-group">
                    <label class="apple-label">From Date</label>
                    <div class="date-input">
                        <IconCalendar size={18} stroke={1.5} />
                        <input type="date" bind:value={dateFrom} />
                    </div>
                </div>
                <div class="form-group">
                    <label class="apple-label">To Date</label>
                    <div class="date-input">
                        <IconCalendar size={18} stroke={1.5} />
                        <input type="date" bind:value={dateTo} />
                    </div>
                </div>
            </div>

            <button class="apple-btn-primary" on:click={generateReport} disabled={isLoading}>
                {#if isLoading}
                    <IconLoader2 size={18} stroke={2} class="spin" />
                    Generating...
                {:else}
                    <IconFileAnalytics size={18} stroke={2} />
                    Generate Report
                {/if}
            </button>
        </div>

        <!-- Report Preview -->
        <div class="preview-card apple-card">
            <div class="preview-header">
                <h2>Report Preview</h2>
                {#if reportData}
                    <div class="download-btns">
                        <button class="download-btn" on:click={() => downloadReport('csv')}>
                            <IconDownload size={16} stroke={2} /> CSV
                        </button>
                        <button class="download-btn" on:click={() => downloadReport('pdf')}>
                            <IconDownload size={16} stroke={2} /> PDF
                        </button>
                    </div>
                {/if}
            </div>
            
            {#if !reportData}
                <div class="empty-state">
                    <IconFileAnalytics size={48} stroke={1.5} />
                    <p>Configure and generate a report to see preview</p>
                </div>
            {:else}
                <div class="report-summary">
                    <div class="summary-stat">
                        <span class="stat-value">{reportData.totalRecords || 0}</span>
                        <span class="stat-label">Total Records</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-value">{reportData.averageAttendance || 0}%</span>
                        <span class="stat-label">Avg Attendance</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-value">{reportData.uniqueUsers || 0}</span>
                        <span class="stat-label">Unique Users</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .reports-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 32px; font-weight: 700; color: var(--theme-text, var(--apple-black)); margin-bottom: 4px; }
    .header-subtitle { font-size: 15px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    
    .reports-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; }
    .config-card, .preview-card { padding: 24px; }
    .config-card h2, .preview-card h2 { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: var(--theme-text, var(--apple-black)); }
    
    .form-group { margin-bottom: 20px; }
    .report-types { display: flex; flex-direction: column; gap: 8px; }
    .type-btn { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--theme-border-light, var(--apple-gray-6)); border: 1px solid transparent; border-radius: var(--apple-radius-md); font-size: 14px; color: var(--theme-text-secondary, var(--apple-gray-1)); cursor: pointer; transition: var(--apple-transition); text-align: left; }
    .type-btn:hover { background: var(--theme-border, var(--apple-gray-5)); }
    .type-btn.active { background: rgba(0, 122, 255, 0.1); border-color: var(--apple-accent); color: var(--apple-accent); }
    
    .date-range { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .date-input { display: flex; align-items: center; gap: 8px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); padding: 10px 12px; }
    .date-input input { border: none; background: none; outline: none; font-size: 14px; color: var(--theme-text, var(--apple-black)); flex: 1; }
    
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .download-btns { display: flex; gap: 8px; }
    .download-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--theme-border-light, var(--apple-gray-6)); border: none; border-radius: var(--apple-radius-sm); font-size: 13px; color: var(--theme-text-secondary, var(--apple-gray-1)); cursor: pointer; }
    .download-btn:hover { background: var(--theme-border, var(--apple-gray-5)); }
    
    .empty-state { text-align: center; padding: 60px 20px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .empty-state p { margin-top: 12px; font-size: 14px; }
    
    .report-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .summary-stat { text-align: center; padding: 20px; background: var(--theme-border-light, var(--apple-gray-6)); border-radius: var(--apple-radius-md); }
    .stat-value { display: block; font-size: 28px; font-weight: 700; color: var(--theme-text, var(--apple-black)); }
    .stat-label { font-size: 13px; color: var(--theme-text-secondary, var(--apple-gray-1)); margin-top: 4px; }
    
    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    @media (max-width: 900px) { .reports-grid { grid-template-columns: 1fr; } }
</style>
