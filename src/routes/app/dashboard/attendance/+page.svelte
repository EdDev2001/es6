<script>
    import { format } from 'date-fns';
    
    // SvelteKit loads the data from +page.js into the data prop
    export let data;

    // --- NEW: State for Modal ---
    let selectedImage = null;

    // --- NEW: Function to open modal and set image ---
// Inside src/routes/dashboard/attendance/+page.svelte

// --- NEW: Function to open modal and set image ---
function openImageModal(shift, actionKey) {
    if (shift[actionKey] && shift[actionKey].capturedImage) {
        selectedImage = shift[actionKey].capturedImage;
    } else {
        selectedImage = null;
        // Optionally show an alert that no image was found for this action
    }
}
    
    // --- NEW: Function to close modal ---
    function closeImageModal() {
        selectedImage = null;
    }

    // Helper function to safely extract and format a timestamp
    function getTimestamp(shift, key) {
        if (shift[key] && shift[key].timestamp) {
            return format(new Date(shift[key].timestamp), 'MMM dd, yyyy HH:mm:ss');
        }
        return '-';
    }

    // Helper function to determine the color of the status badge
    function getStatusClass(status) {
        switch (status) {
            case 'checkedIn':
                return 'bg-green-100 text-green-800';
            case 'onBreak':
                return 'bg-yellow-100 text-yellow-800';
            case 'checkedOut':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }
</script>

<div class="p-6 max-w-6xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">🗓️ Daily Attendance History</h1>

    {#if data.error}
        <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            Error fetching data: {data.error}
        </div>
    {:else if data.records && data.records.length > 0}
        
        <div class="overflow-x-auto bg-white shadow-md rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
<!-- Add new table headers -->
<thead class="bg-gray-50">
<tr>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break Start</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break End</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In Location</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift ID</th>
</tr>
</thead>
<tbody class="divide-y divide-gray-200">
{#each data.records as shift (shift.shiftId)}
<tr class="hover:bg-gray-50">
    <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {shift.date ? format(new Date(shift.date), 'MMM dd, yyyy') : '-'}
    </td>
    
    <td class="px-4 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusClass(shift.currentStatus)}">
            {shift.currentStatus}
        </span>
    </td>

    <!-- Check In -->
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {getTimestamp(shift, 'checkIn')}
        {#if shift.checkIn?.capturedImage}
            <img src={shift.checkIn.capturedImage} alt="" class="mt-1 w-32 h-auto rounded-md border"/>
        {/if}
    </td>

    <!-- Break Start -->
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {getTimestamp(shift, 'breakIn')}
        {#if shift.breakIn?.capturedImage}
            <img src={shift.breakIn.capturedImage} alt="" class="mt-1 w-32 h-auto rounded-md border"/>
        {/if}
    </td>

    <!-- Break End -->
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {getTimestamp(shift, 'breakOut')}
        {#if shift.breakOut?.capturedImage}
            <img src={shift.breakOut.capturedImage} alt="" class="mt-1 w-32 h-auto rounded-md border"/>
        {/if}
    </td>

    <!-- Check Out -->
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {getTimestamp(shift, 'checkOut')}
        {#if shift.checkOut?.capturedImage}
            <img src={shift.checkOut.capturedImage} alt="" class="mt-1 w-32 h-auto rounded-md border"/>
        {/if}
    </td>

    <!-- Location -->
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {shift.checkIn?.location?.name || '-'}
    </td>

    <!-- Device Info -->
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {shift.checkIn?.device ? `${shift.checkIn.device.browser} / ${shift.checkIn.device.device}` : '-'}
    </td>

    <td class="px-4 py-4 text-xs text-gray-400 truncate max-w-xs">{shift.shiftId}</td>
</tr>
{/each}
</tbody>


            </table>
        </div>

    {:else}
        <div class="p-6 text-center text-gray-500 border border-gray-200 rounded-md">
            No attendance records found. Please check in first!
        </div>
    {/if}
</div>


<style>
    .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .max-w-xs {
        max-width: 100px;
    }
</style>