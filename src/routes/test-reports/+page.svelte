<script>
    import { onMount } from 'svelte';
    import WorkHabitReport from '$lib/components/WorkHabitReport.svelte';
    import { ReportType } from '$lib/reports/workHabitReports.js';

    let selectedReportType = ReportType.WEEKLY;

    // Mock user data
    const mockUserId = 'test-user-123';
    const mockUserName = 'John Doe';
    const mockDepartment = 'Engineering';

    // Mock work config
    const mockWorkConfig = {
        standardStartTime: '09:00',
        standardEndTime: '18:00',
        standardHoursPerDay: 8,
        lateThresholdMinutes: 15,
        earlyLeaveThresholdMinutes: 30
    };

    // Generate mock attendance records for the past 30 days
    function generateMockRecords() {
        const records = [];
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // Skip some weekends randomly
            const dayOfWeek = date.getDay();
            if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.3) {
                continue;
            }

            // Random attendance patterns
            const isAbsent = Math.random() < 0.1; // 10% absence rate
            
            if (isAbsent) {
                records.push({
                    date: date.toISOString().split('T')[0],
                    checkIn: null,
                    checkOut: null
                });
                continue;
            }

            // Generate check-in time (some late, some early, most on time)
            const lateChance = Math.random();
            let checkInHour = 9;
            let checkInMinute = 0;

            if (lateChance < 0.2) {
                // 20% chance of being late
                checkInMinute = 15 + Math.floor(Math.random() * 45); // 15-60 min late
            } else if (lateChance < 0.4) {
                // 20% chance of being early
                checkInHour = 8;
                checkInMinute = 30 + Math.floor(Math.random() * 30);
            } else {
                // On time (within threshold)
                checkInMinute = Math.floor(Math.random() * 15);
            }

            const checkIn = new Date(date);
            checkIn.setHours(checkInHour, checkInMinute, 0);

            // Generate check-out time
            const earlyLeaveChance = Math.random();
            let checkOutHour = 18;
            let checkOutMinute = 0;

            if (earlyLeaveChance < 0.15) {
                // 15% chance of early leave
                checkOutHour = 17;
                checkOutMinute = Math.floor(Math.random() * 30);
            } else if (earlyLeaveChance < 0.3) {
                // 15% chance of overtime
                checkOutHour = 19 + Math.floor(Math.random() * 3);
                checkOutMinute = Math.floor(Math.random() * 60);
            } else {
                // Normal departure
                checkOutMinute = Math.floor(Math.random() * 30);
            }

            const checkOut = new Date(date);
            checkOut.setHours(checkOutHour, checkOutMinute, 0);

            // Sometimes add break data
            let breakStart = null;
            let breakEnd = null;
            if (Math.random() > 0.3) {
                breakStart = new Date(date);
                breakStart.setHours(12, Math.floor(Math.random() * 30), 0);
                breakEnd = new Date(date);
                breakEnd.setHours(13, Math.floor(Math.random() * 30), 0);
            }

            records.push({
                date: date.toISOString().split('T')[0],
                checkIn: { timestamp: checkIn.toISOString() },
                checkOut: { timestamp: checkOut.toISOString() },
                breakStart: breakStart ? { timestamp: breakStart.toISOString() } : null,
                breakEnd: breakEnd ? { timestamp: breakEnd.toISOString() } : null
            });
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const mockRecords = generateMockRecords();

    function handleSuggestionAction(event) {
        console.log('Suggestion action:', event.detail);
        alert(`Action: ${event.detail.action?.type || 'clicked'}\nSuggestion: ${event.detail.suggestion.title}`);
    }

    onMount(() => {
        document.addEventListener('suggestion-action', handleSuggestionAction);
        return () => {
            document.removeEventListener('suggestion-action', handleSuggestionAction);
        };
    });
</script>

<div class="test-page">
    <div class="page-header">
        <h1>📊 Work Habit Reports Test</h1>
        <p>Testing the report generation with mock attendance data</p>
    </div>

    <div class="controls">
        <div class="control-group">
            <label>Report Type:</label>
            <div class="button-group">
                <button 
                    class:active={selectedReportType === ReportType.WEEKLY}
                    on:click={() => selectedReportType = ReportType.WEEKLY}
                >
                    Weekly
                </button>
                <button 
                    class:active={selectedReportType === ReportType.MONTHLY}
                    on:click={() => selectedReportType = ReportType.MONTHLY}
                >
                    Monthly
                </button>
            </div>
        </div>

        <div class="mock-info">
            <span>📋 {mockRecords.length} mock records generated</span>
            <span>👤 {mockUserName}</span>
            <span>🏢 {mockDepartment}</span>
        </div>
    </div>

    <div class="report-wrapper">
        <WorkHabitReport 
            userId={mockUserId}
            userName={mockUserName}
            department={mockDepartment}
            attendanceRecords={mockRecords}
            workConfig={mockWorkConfig}
            reportType={selectedReportType}
        />
    </div>

    <div class="data-preview">
        <details>
            <summary>📄 View Raw Mock Data ({mockRecords.length} records)</summary>
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Break</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each mockRecords.slice(0, 14) as record}
                            <tr>
                                <td>{record.date}</td>
                                <td>{record.checkIn?.timestamp ? new Date(record.checkIn.timestamp).toLocaleTimeString() : '-'}</td>
                                <td>{record.checkOut?.timestamp ? new Date(record.checkOut.timestamp).toLocaleTimeString() : '-'}</td>
                                <td>{record.breakStart ? '✓' : '-'}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </details>
    </div>
</div>

<style>
    .test-page {
        max-width: 1000px;
        margin: 0 auto;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
    }

    .page-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .page-header h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
        color: #1f2937;
    }

    .page-header p {
        margin: 0;
        color: #6b7280;
    }

    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 12px;
        margin-bottom: 1.5rem;
    }

    .control-group {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .control-group label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }

    .button-group {
        display: flex;
        gap: 0.25rem;
        background: #e5e7eb;
        padding: 0.25rem;
        border-radius: 8px;
    }

    .button-group button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .button-group button:hover {
        color: #374151;
    }

    .button-group button.active {
        background: white;
        color: #4f46e5;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .mock-info {
        display: flex;
        gap: 1rem;
        font-size: 0.8125rem;
        color: #6b7280;
    }

    .report-wrapper {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .data-preview {
        background: #1f2937;
        border-radius: 12px;
        overflow: hidden;
    }

    .data-preview summary {
        padding: 1rem;
        color: #9ca3af;
        cursor: pointer;
        font-size: 0.875rem;
    }

    .data-preview summary:hover {
        color: white;
    }

    .data-table {
        padding: 0 1rem 1rem;
        overflow-x: auto;
    }

    .data-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
    }

    .data-table th,
    .data-table td {
        padding: 0.5rem 0.75rem;
        text-align: left;
        border-bottom: 1px solid #374151;
        color: #d1d5db;
    }

    .data-table th {
        color: #9ca3af;
        font-weight: 500;
    }

    @media (max-width: 640px) {
        .test-page {
            padding: 1rem;
        }

        .controls {
            flex-direction: column;
            align-items: flex-start;
        }

        .mock-info {
            flex-wrap: wrap;
        }

        .report-wrapper {
            padding: 1rem;
        }
    }
</style>
