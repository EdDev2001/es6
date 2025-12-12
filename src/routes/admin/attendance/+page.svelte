<script>
    import { onMount } from "svelte";
    import { adminAuthStore } from "$lib/stores/adminAuth.js";
    import { IconClockHour4, IconSearch, IconFilter, IconDownload, IconCalendar, IconLoader2, IconCheck, IconX, IconChevronLeft, IconChevronRight, IconRefresh, IconMapPin } from "@tabler/icons-svelte";

    let attendance = [];
    let stats = { total: 0, present: 0, late: 0, absent: 0 };
    let isLoading = true;
    let searchQuery = '';
    let selectedDate = new Date().toISOString().split('T')[0];
    let showAllDates = true; // Default to showing all dates so user can see all records
    let currentPage = 1;
    let itemsPerPage = 20;
    let statusFilter = 'all';

    onMount(async () => {
        await loadAttendance();
    });

    async function loadAttendance() {
        isLoading = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            // When showAllDates is true, don't send date param at all
            const url = showAllDates 
                ? '/api/admin/attendance' 
                : `/api/admin/attendance?date=${selectedDate}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                attendance = data.attendance || [];
                stats = data.stats || { total: 0, present: 0, late: 0, absent: 0 };
                currentPage = 1;
            } else {
                const errorData = await response.json();
                console.error('Attendance API error:', errorData);
            }
        } catch (error) {
            console.error('Failed to load attendance:', error);
        } finally {
            isLoading = false;
        }
    }

    function formatTime(timestamp) {
        if (!timestamp) return '-';
        try {
            return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '-';
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    }

    function getStatusClass(status) {
        if (!status) return 'present';
        const s = status.toLowerCase();
        if (s === 'late') return 'late';
        if (s === 'absent') return 'absent';
        if (s === 'onbreak' || s === 'break') return 'break';
        return 'present';
    }

    function getStatusLabel(status) {
        if (!status) return 'Present';
        const s = status.toLowerCase();
        if (s === 'late') return 'Late';
        if (s === 'absent') return 'Absent';
        if (s === 'present') return 'Present';
        if (s === 'onbreak' || s === 'break') return 'On Break';
        // Fallback for raw status values
        if (s === 'checkedin') return 'Working';
        if (s === 'checkedout') return 'Completed';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    async function exportCSV() {
        const headers = ['Name', 'Email', 'Date', 'Check In', 'Check Out', 'Status', 'Duration', 'Location'];
        const rows = filteredAttendance.map(r => [
            r.userName || '',
            r.userEmail || '',
            r.date || '',
            formatTime(r.checkIn),
            formatTime(r.checkOut),
            getStatusLabel(r.status),
            r.duration || '',
            r.location || ''
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${selectedDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    $: filteredAttendance = attendance.filter(a => {
        const matchesSearch = !searchQuery || 
            a.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.userEmail?.toLowerCase().includes(searchQuery.toLowerCase());
        // Direct status comparison since API now returns normalized status
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    $: totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
    $: paginatedAttendance = filteredAttendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
</script>

<svelte:head>
    <title>Attendance | Admin Panel</title>
</svelte:head>

<div class="attendance-page">
    <header class="page-header">
        <div class="header-content">
            <h1>Attendance</h1>
            <p class="header-subtitle">Monitor and manage attendance records</p>
        </div>
        <button class="refresh-btn" on:click={loadAttendance} disabled={isLoading}>
            <IconRefresh size={18} stroke={1.5} class={isLoading ? 'spin' : ''} />
            Refresh
        </button>
    </header>

    <!-- Stats Cards -->
    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-value">{stats.total}</span>
            <span class="stat-label">Total Records</span>
        </div>
        <div class="stat-card present">
            <span class="stat-value">{stats.present}</span>
            <span class="stat-label">Present</span>
        </div>
        <div class="stat-card late">
            <span class="stat-value">{stats.late}</span>
            <span class="stat-label">Late</span>
        </div>
        <div class="stat-card absent">
            <span class="stat-value">{stats.absent}</span>
            <span class="stat-label">Absent</span>
        </div>
    </div>

    <div class="toolbar">
        <div class="search-box">
            <IconSearch size={18} stroke={1.5} />
            <input type="text" placeholder="Search by name or email..." bind:value={searchQuery} />
        </div>
        <div class="toolbar-actions">
            <label class="toggle-label">
                <input type="checkbox" bind:checked={showAllDates} on:change={loadAttendance} />
                <span>All Dates</span>
            </label>
            {#if !showAllDates}
                <div class="date-picker">
                    <IconCalendar size={18} stroke={1.5} />
                    <input type="date" bind:value={selectedDate} on:change={loadAttendance} />
                </div>
            {/if}
            <select class="filter-select" bind:value={statusFilter}>
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
            </select>
            <button class="toolbar-btn" on:click={exportCSV}>
                <IconDownload size={18} stroke={1.5} />
                Export
            </button>
        </div>
    </div>

    <div class="table-container apple-card">
        {#if isLoading}
            <div class="loading-state">
                <IconLoader2 size={32} stroke={1.5} class="spin" />
                <p>Loading attendance...</p>
            </div>
        {:else if paginatedAttendance.length === 0}
            <div class="empty-state">
                <IconClockHour4 size={48} stroke={1.5} />
                <p>No attendance records found for {showAllDates ? 'any date' : formatDate(selectedDate)}</p>
                <p class="empty-hint">Try selecting a different date or check if users have checked in.</p>
            </div>
        {:else}
            <table class="apple-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Date</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    {#each paginatedAttendance as record}
                        <tr>
                            <td>
                                <div class="user-cell">
                                    <div class="user-avatar">{record.userName?.charAt(0) || 'U'}</div>
                                    <div class="user-info">
                                        <span class="user-name">{record.userName || 'Unknown'}</span>
                                        {#if record.department}
                                            <span class="user-dept">{record.department}</span>
                                        {/if}
                                    </div>
                                </div>
                            </td>
                            <td>{formatDate(record.date)}</td>
                            <td class="time-cell">{formatTime(record.checkIn)}</td>
                            <td class="time-cell">{formatTime(record.checkOut)}</td>
                            <td>
                                <span class="status-badge {getStatusClass(record.status)}">
                                    {getStatusLabel(record.status)}
                                </span>
                            </td>
                            <td>{record.duration || '-'}</td>
                            <td>
                                {#if record.location}
                                    <span class="location-cell">
                                        <IconMapPin size={14} stroke={1.5} />
                                        {typeof record.location === 'string' ? record.location.split(',')[0] : record.location}
                                    </span>
                                {:else}
                                    -
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>

            {#if totalPages > 1}
                <div class="pagination">
                    <span class="pagination-info">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAttendance.length)} of {filteredAttendance.length}
                    </span>
                    <div class="pagination-controls">
                        <button class="page-btn" disabled={currentPage === 1} on:click={() => currentPage--}>
                            <IconChevronLeft size={18} stroke={2} />
                        </button>
                        <span class="page-number">{currentPage} / {totalPages}</span>
                        <button class="page-btn" disabled={currentPage >= totalPages} on:click={() => currentPage++}>
                            <IconChevronRight size={18} stroke={2} />
                        </button>
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .attendance-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 32px; font-weight: 700; color: var(--theme-text, var(--apple-black)); margin-bottom: 4px; }
    .header-subtitle { font-size: 15px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    
    .refresh-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); font-size: 14px; color: var(--theme-text-secondary); cursor: pointer; }
    .refresh-btn:hover { background: var(--theme-border-light); }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--theme-card-bg, var(--apple-white)); border-radius: var(--apple-radius-lg); padding: 20px; text-align: center; box-shadow: var(--apple-shadow-sm); }
    .stat-value { display: block; font-size: 32px; font-weight: 700; color: var(--theme-text); }
    .stat-label { font-size: 13px; color: var(--theme-text-secondary); }
    .stat-card.present .stat-value { color: var(--apple-green); }
    .stat-card.late .stat-value { color: var(--apple-orange); }
    .stat-card.absent .stat-value { color: var(--apple-red); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 10px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); padding: 10px 14px; flex: 1; max-width: 400px; }
    .search-box input { border: none; background: none; outline: none; flex: 1; font-size: 14px; color: var(--theme-text, var(--apple-black)); }
    
    .toolbar-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    
    .toggle-label { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); font-size: 14px; cursor: pointer; }
    .toggle-label input { width: 16px; height: 16px; }
    
    .date-picker { display: flex; align-items: center; gap: 8px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); padding: 8px 12px; }
    .date-picker input { border: none; background: none; outline: none; font-size: 14px; color: var(--theme-text, var(--apple-black)); }
    
    .filter-select { padding: 10px 14px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); font-size: 14px; color: var(--theme-text); cursor: pointer; }
    
    .toolbar-btn { display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); font-size: 14px; color: var(--theme-text-secondary, var(--apple-gray-1)); cursor: pointer; }
    .toolbar-btn:hover { background: var(--theme-border-light); }
    
    .table-container { overflow: hidden; }
    .loading-state, .empty-state { text-align: center; padding: 60px 20px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .loading-state p, .empty-state p { margin-top: 12px; font-size: 14px; }
    .empty-hint { font-size: 13px; margin-top: 8px; opacity: 0.7; }
    
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--apple-accent), #5856D6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; flex-shrink: 0; }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 14px; font-weight: 500; color: var(--theme-text); }
    .user-dept { font-size: 12px; color: var(--theme-text-secondary); }
    
    .time-cell { font-family: 'SF Mono', monospace; font-size: 13px; }
    
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .status-badge.present { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .status-badge.late { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .status-badge.absent { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .status-badge.break { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    
    .location-cell { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--theme-text-secondary); }
    
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid var(--theme-border-light); }
    .pagination-info { font-size: 13px; color: var(--theme-text-secondary); }
    .pagination-controls { display: flex; align-items: center; gap: 12px; }
    .page-btn { width: 32px; height: 32px; border-radius: var(--apple-radius-sm); background: var(--theme-border-light); border: none; display: flex; align-items: center; justify-content: center; color: var(--theme-text-secondary); cursor: pointer; }
    .page-btn:hover:not(:disabled) { background: var(--theme-border); }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .page-number { font-size: 13px; color: var(--theme-text); font-weight: 500; }
    
    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
        .toolbar { flex-direction: column; align-items: stretch; }
        .search-box { max-width: none; }
        .toolbar-actions { justify-content: flex-start; }
    }
</style>
