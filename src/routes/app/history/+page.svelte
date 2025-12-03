<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { ref, get, query, orderByChild } from 'firebase/database';
    import AttendanceTable from '$lib/components/AttendanceTable.svelte';
    import { IconCalendarStats, IconDownload } from "@tabler/icons-svelte";
    
    let records = [];
    let isLoading = true;

    onMount(async () => {
        const user = auth.currentUser;
        
        if (user) {
            try {
                const attendanceRef = ref(db, `attendance/${user.uid}`);
                const attendanceQuery = query(attendanceRef, orderByChild('date'));
                const snapshot = await get(attendanceQuery);
                
                if (snapshot.exists()) {
                    const data = [];
                    snapshot.forEach((childSnapshot) => {
                        data.push({
                            shiftId: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                    
                    // Sort by date descending
                    records = data.sort((a, b) => {
                        const dateA = new Date(a.date || a.checkIn?.timestamp || 0);
                        const dateB = new Date(b.date || b.checkIn?.timestamp || 0);
                        return dateB - dateA;
                    });
                }
            } catch (error) {
                console.error('Error loading attendance history:', error);
            }
        }
        
        isLoading = false;
    });
</script>

<div class="p-8">
    <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Attendance History</h1>
                <p class="text-gray-600">View your complete attendance records</p>
            </div>
        </div>

        <!-- Stats Cards -->
        {#if !isLoading}
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Total Records</p>
                            <p class="text-2xl font-bold text-gray-900">{records.length}</p>
                        </div>
                        <IconCalendarStats class="w-8 h-8 text-indigo-500" />
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">This Month</p>
                            <p class="text-2xl font-bold text-gray-900">
                                {records.filter(r => {
                                    const recordDate = new Date(r.date);
                                    const now = new Date();
                                    return recordDate.getMonth() === now.getMonth() && 
                                           recordDate.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                        </div>
                        <IconCalendarStats class="w-8 h-8 text-green-500" />
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">This Week</p>
                            <p class="text-2xl font-bold text-gray-900">
                                {records.filter(r => {
                                    const recordDate = new Date(r.date);
                                    const now = new Date();
                                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                    return recordDate >= weekAgo;
                                }).length}
                            </p>
                        </div>
                        <IconCalendarStats class="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Completed Shifts</p>
                            <p class="text-2xl font-bold text-gray-900">
                                {records.filter(r => r.currentStatus === 'checkedOut').length}
                            </p>
                        </div>
                        <IconCalendarStats class="w-8 h-8 text-purple-500" />
                    </div>
                </div>
            </div>
        {/if}
    </div>

    {#if isLoading}
        <div class="bg-white rounded-lg shadow-lg p-12 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Loading attendance history...</p>
        </div>
    {:else if records.length > 0}
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">All Records</h2>
            </div>
            <AttendanceTable data={{ records }} />
        </div>
    {:else}
        <div class="bg-white rounded-lg shadow-lg p-12 text-center">
            <IconCalendarStats class="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No Attendance Records Yet</h3>
            <p class="text-gray-600 mb-6">Start recording your attendance to see your history here.</p>
            <a href="/app/attendance" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                Go to Attendance Check-in
            </a>
        </div>
    {/if}
</div>