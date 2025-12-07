<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { auth, db } from '$lib/firebase';
    import { ref, get, query, orderByChild } from 'firebase/database';
    import { IconCalendarStats, IconX, IconClock, IconClockExclamation, IconClockPlus, IconClockMinus, IconCalendarOff, IconEdit, IconFilter, IconCalendarWeek, IconCalendarMonth, IconCalendarEvent, IconList, IconFlame, IconCheck, IconPhoto } from "@tabler/icons-svelte";
    import { attendanceRecords, filterState, currentView, filteredRecords, attendanceStats, weeklySummary, monthlyHeatmap, yearlySummary } from '$lib/stores/attendanceHistory.js';

    export let data;
    let isLoading = true, selectedImage = null, showImageModal = false, showFilters = false;
    let selectedMonth = new Date().toISOString().slice(0, 7), selectedYear = new Date().getFullYear();
    let showLate = false, showOvertime = false, showUndertime = false, showMissedDays = false, showManualCorrections = false, dateStart = '', dateEnd = '';

    $: filterState.set({ showLate, showOvertime, showUndertime, showMissedDays, showManualCorrections, dateRange: { start: dateStart || null, end: dateEnd || null }, searchQuery: '' });
    $: activeFiltersCount = [showLate, showOvertime, showUndertime, showMissedDays, showManualCorrections].filter(Boolean).length;

    const openImageModal = (url) => { selectedImage = url; showImageModal = true; };
    const closeImageModal = () => { selectedImage = null; showImageModal = false; };
    const processAction = (rec, name) => { 
        if (!rec?.[name]) return null; 
        const d = rec[name]; 
        return { 
            timestamp: d.timestamp, 
            capturedImage: d.capturedImage || null, 
            device: d.device || null, 
            location: d.location || null 
        }; 
    };
    const formatTime = (ts) => { if (!ts) return 'N/A'; try { return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return '-'; } };
    const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch { return d; } };
    const formatHours = (h) => { if (!h) return '0h 0m'; const hr = Math.floor(h), m = Math.round((h - hr) * 60); return `${hr}h ${m}m`; };
    const formatMinutes = (m) => { if (!m) return '0m'; const h = Math.floor(m / 60), min = Math.round(m % 60); return h > 0 ? `${h}h ${min}m` : `${min}m`; };
    const getHeatmapClass = (h, late, ot, miss) => { if (miss) return 'hm-miss'; if (!h) return 'hm-empty'; if (ot) return 'hm-ot'; if (late) return 'hm-late'; if (h >= 8) return 'hm-full'; if (h >= 6) return 'hm-good'; return 'hm-low'; };
    const getMonthDays = (ym) => { const [y, m] = ym.split('-').map(Number); const f = new Date(y, m-1, 1), l = new Date(y, m, 0), days = []; for (let i = 0; i < f.getDay(); i++) days.push({ empty: true }); for (let d = 1; d <= l.getDate(); d++) days.push({ date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d }); return days; };
    const getMonthName = (i) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i];
    const clearFilters = () => { showLate = showOvertime = showUndertime = showMissedDays = showManualCorrections = false; dateStart = dateEnd = ''; };

    onMount(async () => {
        if (!browser) { isLoading = false; return; }
        
        // Process records from server or fetch from client
        const processRecords = (records) => {
            return records.map(r => ({
                shiftId: r.shiftId,
                date: r.date,
                currentStatus: r.currentStatus,
                checkIn: r.checkIn ? { 
                    timestamp: r.checkIn.timestamp, 
                    capturedImage: r.checkIn.capturedImage || null,
                    device: r.checkIn.device || null,
                    location: r.checkIn.location || null
                } : null,
                breakStart: r.breakStart || r.breakIn ? {
                    timestamp: (r.breakStart || r.breakIn).timestamp,
                    capturedImage: (r.breakStart || r.breakIn).capturedImage || null
                } : null,
                breakEnd: r.breakEnd || r.breakOut ? {
                    timestamp: (r.breakEnd || r.breakOut).timestamp,
                    capturedImage: (r.breakEnd || r.breakOut).capturedImage || null
                } : null,
                checkOut: r.checkOut ? {
                    timestamp: r.checkOut.timestamp,
                    capturedImage: r.checkOut.capturedImage || null,
                    device: r.checkOut.device || null,
                    location: r.checkOut.location || null
                } : null,
                manualCorrection: r.manualCorrection || false
            }));
        };
        
        if (data?.records?.length > 0) {
            attendanceRecords.set(processRecords(data.records));
            isLoading = false;
            return;
        }
        
        const user = auth?.currentUser;
        if (user && db) {
            try {
                const snap = await get(query(ref(db, `attendance/${user.uid}`), orderByChild('date')));
                if (snap.exists()) {
                    const recs = [];
                    snap.forEach(c => {
                        const d = c.val();
                        recs.push({
                            shiftId: c.key,
                            date: d.date,
                            currentStatus: d.currentStatus,
                            checkIn: d.checkIn || null,
                            breakStart: d.breakStart || d.breakIn || null,
                            breakEnd: d.breakEnd || d.breakOut || null,
                            checkOut: d.checkOut || null,
                            manualCorrection: d.manualCorrection || false
                        });
                    });
                    attendanceRecords.set(processRecords(recs).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
                }
            } catch (e) {
                console.error('Error loading attendance:', e);
            }
        }
        isLoading = false;
    });
</script>

<svelte:head><title>Attendance History</title></svelte:head>

<div class="history-page">
    <div class="history-content apple-animate-in">
        <header class="page-header">
            <div class="header-text"><h1 class="page-title">Attendance Summary</h1><p class="page-subtitle">Complete transparency of your attendance records</p></div>
            <button class="filter-btn" class:active={showFilters} on:click={() => showFilters = !showFilters}><IconFilter size={18} stroke={1.5} /><span>Filters</span>{#if activeFiltersCount > 0}<span class="filter-badge">{activeFiltersCount}</span>{/if}</button>
        </header>

        {#if !isLoading}
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon blue"><IconCalendarStats size={22} stroke={1.5} /></div><div class="stat-info"><span class="stat-value">{$attendanceStats.presentDays}</span><span class="stat-label">Days Present</span></div></div>
            <div class="stat-card"><div class="stat-icon green"><IconCheck size={22} stroke={1.5} /></div><div class="stat-info"><span class="stat-value">{$attendanceStats.onTimePercentage.toFixed(0)}%</span><span class="stat-label">On-Time Rate</span></div></div>
            <div class="stat-card"><div class="stat-icon purple"><IconClock size={22} stroke={1.5} /></div><div class="stat-info"><span class="stat-value">{formatHours($attendanceStats.totalHoursWorked)}</span><span class="stat-label">Total Hours</span></div></div>
            <div class="stat-card"><div class="stat-icon orange"><IconFlame size={22} stroke={1.5} /></div><div class="stat-info"><span class="stat-value">{$attendanceStats.averageHoursPerDay.toFixed(1)}h</span><span class="stat-label">Avg/Day</span></div></div>
        </div>
        {/if}

        {#if showFilters}
        <div class="filters-panel">
            <div class="filters-header"><h3>Advanced Filters</h3><button class="clear-btn" on:click={clearFilters}>Clear All</button></div>
            <div class="filters-grid">
                <label class="filter-chip" class:active={showLate}><input type="checkbox" bind:checked={showLate} /><IconClockExclamation size={16} stroke={1.5} /><span>Late</span><span class="chip-count">{$attendanceStats.lateDays}</span></label>
                <label class="filter-chip" class:active={showOvertime}><input type="checkbox" bind:checked={showOvertime} /><IconClockPlus size={16} stroke={1.5} /><span>Overtime</span><span class="chip-count">{$attendanceStats.overtimeDays}</span></label>
                <label class="filter-chip" class:active={showUndertime}><input type="checkbox" bind:checked={showUndertime} /><IconClockMinus size={16} stroke={1.5} /><span>Undertime</span><span class="chip-count">{$attendanceStats.undertimeDays}</span></label>
                <label class="filter-chip" class:active={showMissedDays}><input type="checkbox" bind:checked={showMissedDays} /><IconCalendarOff size={16} stroke={1.5} /><span>Missed</span><span class="chip-count">{$attendanceStats.missedDays}</span></label>
                <label class="filter-chip" class:active={showManualCorrections}><input type="checkbox" bind:checked={showManualCorrections} /><IconEdit size={16} stroke={1.5} /><span>Corrections</span><span class="chip-count">{$attendanceStats.manualCorrections}</span></label>
            </div>
            <div class="date-filters"><div class="date-group"><label for="ds">From</label><input id="ds" type="date" bind:value={dateStart} /></div><div class="date-group"><label for="de">To</label><input id="de" type="date" bind:value={dateEnd} /></div></div>
        </div>
        {/if}

        <div class="view-tabs">
            <button class="view-tab" class:active={$currentView === 'daily'} on:click={() => currentView.set('daily')}><IconList size={18} stroke={1.5} /><span>Daily</span></button>
            <button class="view-tab" class:active={$currentView === 'weekly'} on:click={() => currentView.set('weekly')}><IconCalendarWeek size={18} stroke={1.5} /><span>Weekly</span></button>
            <button class="view-tab" class:active={$currentView === 'monthly'} on:click={() => currentView.set('monthly')}><IconCalendarMonth size={18} stroke={1.5} /><span>Monthly</span></button>
            <button class="view-tab" class:active={$currentView === 'yearly'} on:click={() => currentView.set('yearly')}><IconCalendarEvent size={18} stroke={1.5} /><span>Yearly</span></button>
        </div>

        <div class="content-card">
            {#if isLoading}<div class="loading-state"><div class="apple-spinner"></div><p>Loading attendance history...</p></div>
            {:else if $filteredRecords.length === 0 && $currentView === 'daily'}<div class="empty-state"><div class="empty-icon"><IconCalendarStats size={48} stroke={1.5} /></div><h3>No Records Found</h3><p>{activeFiltersCount > 0 ? 'No records match your filters.' : 'Start recording attendance to see history.'}</p>{#if !activeFiltersCount}<a href="/app/attendance" class="primary-btn">Go to Attendance</a>{/if}</div>
            {:else}
                {#if $currentView === 'daily'}
                <div class="daily-view">
                    <div class="view-header"><h2>All Records</h2><span class="record-count">{$filteredRecords.length} records</span></div>
                    <div class="table-date-filters">
                        <div class="table-filter-group">
                            <label for="startDate">Start Date</label>
                            <input id="startDate" type="date" bind:value={dateStart} />
                        </div>
                        <div class="table-filter-group">
                            <label for="endDate">End Date</label>
                            <input id="endDate" type="date" bind:value={dateEnd} />
                        </div>
                    </div>
                    <div class="table-wrapper">
                        <table class="records-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>STATUS</th>
                                    <th>CHECK IN</th>
                                    <th>BREAK START</th>
                                    <th>BREAK END</th>
                                    <th>CHECK OUT</th>
                                    <th>LOCATION</th>
                                    <th>DEVICE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each $filteredRecords as record}
                                <tr class:is-late={record.analysis?.isLate} class:is-overtime={record.analysis?.isOvertime}>
                                    <td class="date-cell">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                    <td><span class="status-badge" class:checked-in={record.currentStatus === 'checkedIn'} class:checked-out={record.currentStatus === 'checkedOut'} class:on-break={record.currentStatus === 'onBreak'}>{record.currentStatus === 'checkedIn' ? 'Checked In' : record.currentStatus === 'checkedOut' ? 'Checked Out' : record.currentStatus === 'onBreak' ? 'On Break' : record.currentStatus || 'N/A'}</span></td>
                                    <td class="checkin-cell">
                                        <div class="time-with-image">
                                            <span class="cell-time">{formatTime(record.checkIn?.timestamp)}</span>
                                            {#if record.checkIn?.capturedImage}
                                            <button class="cell-image" on:click={() => openImageModal(record.checkIn.capturedImage)}>
                                                <img src={record.checkIn.capturedImage} alt="Check-in" />
                                            </button>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="time-cell">{formatTime(record.breakStart?.timestamp)}</td>
                                    <td class="time-cell">{formatTime(record.breakEnd?.timestamp)}</td>
                                    <td class="checkout-cell">
                                        <div class="time-with-image">
                                            <span class="cell-time">{formatTime(record.checkOut?.timestamp)}</span>
                                            {#if record.checkOut?.capturedImage}
                                            <button class="cell-image" on:click={() => openImageModal(record.checkOut.capturedImage)}>
                                                <img src={record.checkOut.capturedImage} alt="Check-out" />
                                            </button>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="location-cell">{record.checkIn?.location?.name || 'N/A'}</td>
                                    <td class="device-cell">{record.checkIn?.device?.browser || ''} {record.checkIn?.device?.deviceType ? `(${record.checkIn.device.deviceType})` : ''}{#if !record.checkIn?.device}N/A{/if}</td>
                                </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/if}

                {#if $currentView === 'weekly'}
                <div class="weekly-view">
                    <div class="view-header"><h2>Weekly Summary</h2></div>
                    <div class="week-list">{#each $weeklySummary as week}<div class="week-card"><div class="week-header"><span class="week-range">{formatDate(week.weekStart)} - {formatDate(week.weekEnd)}</span><span class="week-total">{formatHours(week.totalHours)}</span></div><div class="week-stats"><div class="week-stat"><span class="ws-value">{week.days.length}</span><span class="ws-label">Days</span></div><div class="week-stat"><span class="ws-value late-color">{week.lateDays}</span><span class="ws-label">Late</span></div><div class="week-stat"><span class="ws-value ot-color">{week.overtimeDays}</span><span class="ws-label">Overtime</span></div></div></div>{/each}</div>
                </div>
                {/if}

                {#if $currentView === 'monthly'}
                <div class="monthly-view">
                    <div class="monthly-header">
                        <div class="month-nav">
                            <button class="nav-btn" on:click={() => { const [y,m] = selectedMonth.split('-').map(Number); const d = new Date(y, m-2, 1); selectedMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <h2 class="month-title">{new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                            <button class="nav-btn" on:click={() => { const [y,m] = selectedMonth.split('-').map(Number); const d = new Date(y, m, 1); selectedMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                        <div class="month-stats-mini">
                            <div class="mini-stat"><span class="mini-value">{$monthlyHeatmap[selectedMonth] ? Object.keys($monthlyHeatmap[selectedMonth].days).length : 0}</span><span class="mini-label">Days</span></div>
                            <div class="mini-stat"><span class="mini-value">{$monthlyHeatmap[selectedMonth] ? formatHours($monthlyHeatmap[selectedMonth].totalHours) : '0h'}</span><span class="mini-label">Hours</span></div>
                        </div>
                    </div>
                    
                    <div class="calendar-container">
                        <div class="calendar-grid">
                            <div class="cal-weekdays">
                                {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as day, i}
                                <span class="weekday" class:weekend={i === 0 || i === 6}>{day}</span>
                                {/each}
                            </div>
                            <div class="cal-days-grid">
                                {#each getMonthDays(selectedMonth) as di}
                                    {#if di.empty}
                                        <div class="cal-cell empty"></div>
                                    {:else}
                                        {@const dd = $monthlyHeatmap[selectedMonth]?.days[di.date]}
                                        <div class="cal-cell" 
                                             class:has-data={dd} 
                                             class:is-today={di.date === `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`}
                                             class:is-late={dd?.isLate}
                                             class:is-overtime={dd?.isOvertime}
                                             class:is-full={dd?.hours >= 8}
                                             class:is-partial={dd?.hours > 0 && dd?.hours < 8}
                                             title="{di.date}: {dd ? `${dd.hours.toFixed(1)}h worked${dd.isLate ? ' (Late)' : ''}${dd.isOvertime ? ' (OT)' : ''}` : 'No attendance'}">
                                            <span class="cell-day" class:weekend={new Date(di.date).getDay() === 0 || new Date(di.date).getDay() === 6}>{di.day}</span>
                                            {#if dd}
                                                <div class="cell-indicator">
                                                    <span class="cell-hours">{dd.hours.toFixed(1)}h</span>
                                                    {#if dd.isLate}<span class="cell-badge late">L</span>{/if}
                                                    {#if dd.isOvertime}<span class="cell-badge ot">OT</span>{/if}
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                        
                        <div class="calendar-legend">
                            <span class="legend-title">Legend</span>
                            <div class="legend-items">
                                <div class="legend-item"><span class="legend-dot full"></span><span>8h+ worked</span></div>
                                <div class="legend-item"><span class="legend-dot partial"></span><span>Partial day</span></div>
                                <div class="legend-item"><span class="legend-dot late"></span><span>Late arrival</span></div>
                                <div class="legend-item"><span class="legend-dot overtime"></span><span>Overtime</span></div>
                                <div class="legend-item"><span class="legend-dot today"></span><span>Today</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                {/if}

                {#if $currentView === 'yearly'}
                <div class="yearly-view">
                    <div class="view-header"><h2>Yearly Summary</h2><select bind:value={selectedYear} class="year-picker">{#each Object.keys($yearlySummary).sort((a,b)=>b-a) as y}<option value={Number(y)}>{y}</option>{/each}{#if !Object.keys($yearlySummary).length}<option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>{/if}</select></div>
                    {#if $yearlySummary[selectedYear]}{@const yd=$yearlySummary[selectedYear]}<div class="year-stats"><div class="year-card"><div class="yc-icon blue"><IconCalendarStats size={24} stroke={1.5} /></div><div class="yc-info"><span class="yc-value">{yd.presentDays}</span><span class="yc-label">Days Present</span></div></div><div class="year-card"><div class="yc-icon purple"><IconClock size={24} stroke={1.5} /></div><div class="yc-info"><span class="yc-value">{formatHours(yd.totalHours)}</span><span class="yc-label">Total Hours</span></div></div><div class="year-card"><div class="yc-icon orange"><IconClockExclamation size={24} stroke={1.5} /></div><div class="yc-info"><span class="yc-value">{yd.lateDays}</span><span class="yc-label">Late Days</span></div></div><div class="year-card"><div class="yc-icon green"><IconClockPlus size={24} stroke={1.5} /></div><div class="yc-info"><span class="yc-value">{yd.overtimeDays}</span><span class="yc-label">Overtime Days</span></div></div></div>{:else}<div class="empty-state"><p>No data for {selectedYear}</p></div>{/if}
                </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

{#if showImageModal}<div class="modal-overlay" on:click={closeImageModal} on:keydown={(e) => e.key === 'Escape' && closeImageModal()} role="button" tabindex="0" aria-label="Close"><div class="modal-content" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-modal="true"><button class="modal-close" on:click={closeImageModal} aria-label="Close"><IconX size={20} stroke={2} /></button><img src={selectedImage} alt="Attendance snapshot" class="modal-image" /></div></div>{/if}


<style>
    /* Page Layout */
    .history-page { min-height: 100%; padding: clamp(16px, 4vw, 40px); background: var(--apple-light-bg, #F5F5F7); }
    .history-content { max-width: 1200px; margin: 0 auto; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
    .page-title { font-size: clamp(28px, 5vw, 36px); font-weight: 700; color: var(--apple-black, #0A0A0A); letter-spacing: -0.5px; margin: 0 0 6px; }
    .page-subtitle { font-size: 16px; color: var(--apple-gray-1, #8E8E93); margin: 0; }
    .filter-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--apple-white, #fff); border: 1px solid var(--apple-gray-4, #D1D1D6); border-radius: 12px; font-size: 14px; font-weight: 500; color: var(--apple-gray-1, #8E8E93); cursor: pointer; transition: all 0.2s ease; position: relative; }
    .filter-btn:hover, .filter-btn.active { background: var(--apple-accent, #007AFF); color: white; border-color: var(--apple-accent, #007AFF); }
    .filter-badge { position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; background: var(--apple-red, #FF3B30); color: white; border-radius: 50%; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; background: var(--apple-white, #fff); border-radius: 18px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .stat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon.blue { background: rgba(0, 122, 255, 0.12); color: var(--apple-accent, #007AFF); }
    .stat-icon.green { background: rgba(52, 199, 89, 0.12); color: var(--apple-green, #34C759); }
    .stat-icon.purple { background: rgba(175, 82, 222, 0.12); color: var(--apple-purple, #AF52DE); }
    .stat-icon.orange { background: rgba(255, 149, 0, 0.12); color: var(--apple-orange, #FF9500); }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 26px; font-weight: 700; color: var(--apple-black, #0A0A0A); line-height: 1.2; }
    .stat-label { font-size: 13px; color: var(--apple-gray-1, #8E8E93); margin-top: 2px; }

    /* Filters Panel */
    .filters-panel { background: var(--apple-white, #fff); border-radius: 18px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .filters-header h3 { font-size: 17px; font-weight: 600; color: var(--apple-black, #0A0A0A); margin: 0; }
    .clear-btn { font-size: 14px; color: var(--apple-accent, #007AFF); background: none; border: none; cursor: pointer; font-weight: 500; }
    .clear-btn:hover { text-decoration: underline; }
    .filters-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
    .filter-chip { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--apple-gray-6, #F2F2F7); border: 1px solid transparent; border-radius: 24px; font-size: 14px; font-weight: 500; color: var(--apple-gray-1, #8E8E93); cursor: pointer; transition: all 0.2s ease; }
    .filter-chip input { display: none; }
    .filter-chip:hover { background: var(--apple-gray-5, #E5E5EA); }
    .filter-chip.active { background: rgba(0, 122, 255, 0.12); border-color: var(--apple-accent, #007AFF); color: var(--apple-accent, #007AFF); }
    .chip-count { background: var(--apple-gray-4, #D1D1D6); color: var(--apple-gray-1, #8E8E93); padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .filter-chip.active .chip-count { background: var(--apple-accent, #007AFF); color: white; }
    .date-filters { display: flex; gap: 20px; flex-wrap: wrap; }
    .date-group { display: flex; flex-direction: column; gap: 6px; }
    .date-group label { font-size: 13px; font-weight: 500; color: var(--apple-gray-1, #8E8E93); }
    .date-group input { padding: 10px 14px; border: 1px solid var(--apple-gray-4, #D1D1D6); border-radius: 10px; font-size: 14px; background: var(--apple-white, #fff); }
    .date-group input:focus { outline: none; border-color: var(--apple-accent, #007AFF); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15); }

    /* View Tabs */
    .view-tabs { display: flex; gap: 6px; background: var(--apple-gray-6, #F2F2F7); padding: 6px; border-radius: 14px; margin-bottom: 24px; overflow-x: auto; }
    .view-tab { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: transparent; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--apple-gray-1, #8E8E93); cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
    .view-tab:hover { color: var(--apple-black, #0A0A0A); }
    .view-tab.active { background: var(--apple-white, #fff); color: var(--apple-accent, #007AFF); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

    /* Content Card */
    .content-card { background: var(--apple-white, #fff); border-radius: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
    .view-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--apple-gray-5, #E5E5EA); }
    .view-header h2 { font-size: 18px; font-weight: 600; color: var(--apple-black, #0A0A0A); margin: 0; }
    .record-count { font-size: 13px; color: var(--apple-gray-1, #8E8E93); background: var(--apple-gray-6, #F2F2F7); padding: 6px 14px; border-radius: 20px; font-weight: 500; }

    /* Loading & Empty States */
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; text-align: center; }
    .loading-state p { margin-top: 16px; font-size: 15px; color: var(--apple-gray-1, #8E8E93); }
    .empty-icon { width: 88px; height: 88px; border-radius: 22px; background: var(--apple-gray-6, #F2F2F7); display: flex; align-items: center; justify-content: center; color: var(--apple-gray-2, #AEAEB2); margin-bottom: 20px; }
    .empty-state h3 { font-size: 20px; font-weight: 600; color: var(--apple-black, #0A0A0A); margin: 0 0 8px; }
    .empty-state p { font-size: 15px; color: var(--apple-gray-1, #8E8E93); margin: 0 0 24px; max-width: 280px; }
    .primary-btn { display: inline-flex; align-items: center; padding: 14px 28px; background: var(--apple-accent, #007AFF); color: white; font-size: 15px; font-weight: 600; border-radius: 12px; text-decoration: none; transition: all 0.2s ease; }
    .primary-btn:hover { background: #0056CC; transform: translateY(-1px); }

    /* Daily View - Table */
    .daily-view { overflow: hidden; }
    .table-date-filters { display: flex; gap: 20px; padding: 20px 24px; border-bottom: 1px solid var(--apple-gray-5, #E5E5EA); flex-wrap: wrap; }
    .table-filter-group { display: flex; flex-direction: column; gap: 6px; }
    .table-filter-group label { font-size: 13px; font-weight: 500; color: var(--apple-gray-1, #8E8E93); }
    .table-filter-group input { padding: 10px 14px; border: 1px solid var(--apple-gray-4, #D1D1D6); border-radius: 10px; font-size: 14px; background: var(--apple-white, #fff); min-width: 160px; transition: all 0.2s ease; }
    .table-filter-group input:focus { outline: none; border-color: var(--apple-accent, #007AFF); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12); }
    .table-wrapper { overflow-x: auto; }
    .records-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .records-table thead { background: var(--apple-gray-6, #F2F2F7); }
    .records-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--apple-gray-1, #8E8E93); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; border-bottom: 1px solid var(--apple-gray-5, #E5E5EA); }
    .records-table td { padding: 16px; font-size: 14px; color: var(--apple-black, #0A0A0A); border-bottom: 1px solid var(--apple-gray-5, #E5E5EA); vertical-align: middle; }
    .records-table tbody tr { transition: background 0.2s ease; }
    .records-table tbody tr:hover { background: var(--apple-gray-6, #F2F2F7); }
    .records-table tbody tr:last-child td { border-bottom: none; }
    .records-table tbody tr.is-late { background: rgba(255, 149, 0, 0.04); }
    .records-table tbody tr.is-overtime { background: rgba(52, 199, 89, 0.04); }
    .date-cell { font-weight: 500; white-space: nowrap; }
    .status-badge { display: inline-flex; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .status-badge.checked-in { background: rgba(52, 199, 89, 0.15); color: var(--apple-green, #34C759); }
    .status-badge.checked-out { background: var(--apple-gray-6, #F2F2F7); color: var(--apple-gray-1, #8E8E93); }
    .status-badge.on-break { background: rgba(255, 204, 0, 0.15); color: #B38F00; }
    .time-with-image { display: flex; flex-direction: column; gap: 8px; }
    .cell-time { font-weight: 500; }
    .cell-image { width: 48px; height: 48px; border-radius: 10px; overflow: hidden; border: 2px solid var(--apple-gray-5, #E5E5EA); cursor: pointer; padding: 0; background: var(--apple-gray-6, #F2F2F7); transition: all 0.2s ease; }
    .cell-image:hover { border-color: var(--apple-accent, #007AFF); transform: scale(1.08); box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2); }
    .cell-image img { width: 100%; height: 100%; object-fit: cover; }
    .time-cell { font-weight: 500; color: var(--apple-gray-1, #8E8E93); }
    .location-cell { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--apple-gray-1, #8E8E93); }
    .device-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--apple-gray-1, #8E8E93); font-size: 13px; }

    /* Weekly View */
    .weekly-view { padding: 20px; }
    .week-list { display: flex; flex-direction: column; gap: 16px; }
    .week-card { background: var(--apple-gray-6, #F2F2F7); border-radius: 16px; padding: 20px; transition: all 0.2s ease; }
    .week-card:hover { background: var(--apple-gray-5, #E5E5EA); }
    .week-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .week-range { font-size: 15px; font-weight: 600; color: var(--apple-black, #0A0A0A); }
    .week-total { font-size: 20px; font-weight: 700; color: var(--apple-accent, #007AFF); }
    .week-stats { display: flex; gap: 32px; }
    .week-stat { display: flex; flex-direction: column; }
    .ws-value { font-size: 24px; font-weight: 700; color: var(--apple-black, #0A0A0A); }
    .ws-value.late-color { color: var(--apple-orange, #FF9500); }
    .ws-value.ot-color { color: var(--apple-green, #34C759); }
    .ws-label { font-size: 12px; font-weight: 600; color: var(--apple-gray-1, #8E8E93); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Monthly View - Professional Calendar */
    .monthly-view { padding: clamp(16px, 4vw, 24px); }
    .monthly-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .month-nav { display: flex; align-items: center; gap: 12px; }
    .nav-btn { 
        width: 38px; height: 38px; border-radius: 12px; 
        border: 1px solid var(--apple-gray-4, #D1D1D6); 
        background: var(--apple-white, #fff); 
        color: var(--apple-gray-1, #8E8E93); 
        cursor: pointer; 
        display: flex; align-items: center; justify-content: center; 
        transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
    }
    .nav-btn:hover { background: var(--apple-gray-6, #F2F2F7); color: var(--apple-black, #0A0A0A); border-color: var(--apple-gray-3, #C7C7CC); }
    .nav-btn:active { transform: scale(0.92); }
    .month-title { font-size: clamp(18px, 4vw, 22px); font-weight: 700; color: var(--apple-black, #0A0A0A); margin: 0; min-width: 160px; text-align: center; }
    .month-stats-mini { display: flex; gap: 10px; }
    .mini-stat { 
        display: flex; flex-direction: column; align-items: center; 
        padding: 10px 16px; 
        background: var(--apple-gray-6, #F2F2F7); 
        border-radius: 12px; 
        min-width: 70px;
        transition: all 0.2s ease;
    }
    .mini-stat:hover { background: var(--apple-gray-5, #E5E5EA); }
    .mini-value { font-size: clamp(16px, 3vw, 18px); font-weight: 700; color: var(--apple-accent, #007AFF); }
    .mini-label { font-size: 10px; font-weight: 600; color: var(--apple-gray-1, #8E8E93); text-transform: uppercase; letter-spacing: 0.3px; }
    
    .calendar-container { display: flex; flex-direction: column; gap: 16px; }
    .calendar-grid { 
        background: var(--apple-gray-6, #F2F2F7); 
        border-radius: 18px; 
        padding: clamp(12px, 3vw, 20px);
        transition: all 0.3s ease;
    }
    .cal-weekdays { 
        display: grid; grid-template-columns: repeat(7, 1fr); 
        gap: clamp(4px, 1.5vw, 8px); 
        margin-bottom: 10px; padding-bottom: 10px; 
        border-bottom: 1px solid var(--apple-gray-4, #D1D1D6); 
    }
    .weekday { text-align: center; font-size: clamp(10px, 2.5vw, 12px); font-weight: 600; color: var(--apple-gray-1, #8E8E93); text-transform: uppercase; letter-spacing: 0.3px; }
    .weekday.weekend { color: var(--apple-red, #FF3B30); }
    
    .cal-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: clamp(4px, 1.5vw, 8px); }
    .cal-cell { 
        aspect-ratio: 1; 
        border-radius: clamp(10px, 2vw, 14px); 
        display: flex; flex-direction: column; align-items: center; justify-content: center; 
        background: var(--apple-white, #fff); 
        transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1); 
        cursor: default; 
        position: relative; 
        min-height: clamp(44px, 10vw, 70px);
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .cal-cell.empty { background: transparent; box-shadow: none; }
    .cal-cell:not(.empty):hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 2; }
    .cal-cell:not(.empty):active { transform: scale(0.95); }
    .cal-cell.is-today { 
        box-shadow: 0 0 0 2px var(--apple-red, #FF3B30), 0 4px 12px rgba(255, 59, 48, 0.2); 
    }
    .cal-cell.has-data { background: linear-gradient(145deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.03)); }
    .cal-cell.is-full { background: linear-gradient(145deg, rgba(52, 199, 89, 0.22), rgba(52, 199, 89, 0.1)); }
    .cal-cell.is-partial { background: linear-gradient(145deg, rgba(255, 204, 0, 0.18), rgba(255, 204, 0, 0.06)); }
    .cal-cell.is-late { background: linear-gradient(145deg, rgba(255, 149, 0, 0.22), rgba(255, 149, 0, 0.1)); }
    .cal-cell.is-overtime { background: linear-gradient(145deg, rgba(0, 122, 255, 0.18), rgba(0, 122, 255, 0.06)); }
    
    .cell-day { font-size: clamp(13px, 3vw, 16px); font-weight: 600; color: var(--apple-black, #0A0A0A); line-height: 1; }
    .cell-day.weekend { color: var(--apple-red, #FF3B30); }
    .cal-cell.is-today .cell-day { color: var(--apple-red, #FF3B30); font-weight: 700; }
    
    .cell-indicator { display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: 4px; }
    .cell-hours { font-size: clamp(9px, 2vw, 11px); font-weight: 600; color: var(--apple-green, #34C759); }
    .cal-cell.is-late .cell-hours { color: var(--apple-orange, #FF9500); }
    .cal-cell.is-overtime .cell-hours { color: var(--apple-accent, #007AFF); }
    
    .cell-badge { font-size: clamp(7px, 1.5vw, 9px); font-weight: 700; padding: 2px 5px; border-radius: 5px; text-transform: uppercase; }
    .cell-badge.late { background: rgba(255, 149, 0, 0.2); color: var(--apple-orange, #FF9500); }
    .cell-badge.ot { background: rgba(0, 122, 255, 0.15); color: var(--apple-accent, #007AFF); }
    
    .calendar-legend { 
        display: flex; align-items: center; gap: 16px; 
        padding: 14px 16px; 
        background: var(--apple-white, #fff); 
        border-radius: 14px; 
        border: 1px solid var(--apple-gray-5, #E5E5EA); 
        flex-wrap: wrap;
        justify-content: center;
    }
    .legend-title { font-size: 12px; font-weight: 600; color: var(--apple-gray-1, #8E8E93); }
    .legend-items { display: flex; gap: clamp(10px, 3vw, 20px); flex-wrap: wrap; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: clamp(10px, 2.5vw, 12px); color: var(--apple-gray-1, #8E8E93); white-space: nowrap; }
    .legend-dot { width: 12px; height: 12px; border-radius: 5px; flex-shrink: 0; }
    .legend-dot.full { background: linear-gradient(135deg, rgba(52, 199, 89, 0.5), rgba(52, 199, 89, 0.3)); }
    .legend-dot.partial { background: linear-gradient(135deg, rgba(255, 204, 0, 0.4), rgba(255, 204, 0, 0.2)); }
    .legend-dot.late { background: linear-gradient(135deg, rgba(255, 149, 0, 0.5), rgba(255, 149, 0, 0.3)); }
    .legend-dot.overtime { background: linear-gradient(135deg, rgba(0, 122, 255, 0.4), rgba(0, 122, 255, 0.2)); }
    .legend-dot.today { background: var(--apple-white, #fff); box-shadow: 0 0 0 2px var(--apple-red, #FF3B30); }

    /* Yearly View */
    .yearly-view { padding: 20px; }
    .year-picker { padding: 10px 16px; border: 1px solid var(--apple-gray-4, #D1D1D6); border-radius: 10px; font-size: 14px; background: var(--apple-white, #fff); }
    .year-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .year-card { display: flex; align-items: center; gap: 16px; background: var(--apple-gray-6, #F2F2F7); border-radius: 16px; padding: 20px; transition: all 0.2s ease; }
    .year-card:hover { background: var(--apple-gray-5, #E5E5EA); }
    .yc-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .yc-icon.blue { background: rgba(0, 122, 255, 0.15); color: var(--apple-accent, #007AFF); }
    .yc-icon.purple { background: rgba(175, 82, 222, 0.15); color: var(--apple-purple, #AF52DE); }
    .yc-icon.orange { background: rgba(255, 149, 0, 0.15); color: var(--apple-orange, #FF9500); }
    .yc-icon.green { background: rgba(52, 199, 89, 0.15); color: var(--apple-green, #34C759); }
    .yc-info { display: flex; flex-direction: column; }
    .yc-value { font-size: 24px; font-weight: 700; color: var(--apple-black, #0A0A0A); }
    .yc-label { font-size: 13px; font-weight: 500; color: var(--apple-gray-1, #8E8E93); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
    .modal-content { position: relative; max-width: 90vw; max-height: 90vh; background: var(--apple-white, #fff); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .modal-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 0, 0, 0.6); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; z-index: 10; }
    .modal-close:hover { background: rgba(0, 0, 0, 0.8); transform: scale(1.1); }
    .modal-image { display: block; max-width: 100%; max-height: 85vh; object-fit: contain; }

    /* Responsive */
    @media (max-width: 768px) {
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
        .week-stats { gap: 20px; }
        .year-stats { grid-template-columns: repeat(2, 1fr); }
        .records-table { min-width: 700px; }
        .records-table th, .records-table td { padding: 12px 10px; }
        .cell-image { width: 40px; height: 40px; }
        .monthly-header { flex-direction: column; align-items: center; gap: 12px; }
        .month-nav { justify-content: center; width: 100%; }
        .month-stats-mini { justify-content: center; width: 100%; }
    }

    @media (max-width: 480px) {
        .history-page { padding: 12px; }
        .view-tab span { display: none; }
        .view-tab { padding: 12px 14px; }
        .filters-grid { gap: 8px; }
        .filter-chip { padding: 8px 12px; font-size: 13px; }
        .stat-card { padding: 14px; gap: 12px; }
        .stat-icon { width: 44px; height: 44px; }
        .stat-value { font-size: 20px; }
        .stat-label { font-size: 11px; }
        
        /* Calendar mobile optimizations */
        .monthly-view { padding: 12px; }
        .calendar-grid { padding: 10px; border-radius: 14px; }
        .month-nav { gap: 8px; }
        .nav-btn { width: 34px; height: 34px; border-radius: 10px; }
        .mini-stat { padding: 8px 12px; min-width: 60px; }
        .cal-weekdays { gap: 3px; margin-bottom: 8px; padding-bottom: 8px; }
        .cal-days-grid { gap: 3px; }
        .cal-cell { min-height: 42px; border-radius: 8px; }
        .cal-cell:not(.empty):hover { transform: scale(1.05); }
        .cell-indicator { margin-top: 2px; gap: 1px; }
        .cell-badge { padding: 1px 3px; border-radius: 3px; }
        .calendar-legend { padding: 10px 12px; gap: 10px; border-radius: 10px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 4px; }
        .records-table th, .records-table td { padding: 10px 8px; font-size: 12px; }
    }

    @media (max-width: 360px) {
        .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        .stat-card { padding: 12px; }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; }
        .stat-value { font-size: 18px; }
        .month-stats-mini { gap: 8px; }
        .mini-stat { padding: 6px 10px; min-width: 55px; border-radius: 10px; }
        .cal-cell { min-height: 38px; border-radius: 6px; }
        .cell-indicator { display: none; }
        .legend-items { gap: 8px; }
        .legend-item span:last-child { display: none; }
    }
</style>
