<script>
    export let data;
    import { createEventDispatcher } from 'svelte';
    import { IconMapPin, IconDeviceMobile, IconBrowser, IconPhoto, IconFilter } from "@tabler/icons-svelte";

    const dispatch = createEventDispatcher();
    let startDate = '';
    let endDate = '';

    function handleImageClick(url) { dispatch('openImageModal', url); }
    function getDeviceIcon(deviceType) { return deviceType?.toLowerCase().includes('mobile') ? IconDeviceMobile : IconBrowser; }
    
    function formatTime(timestamp) {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return 'Invalid'; }
    }

    function ImageTimeBlock({ statusData }) {
        return { time: statusData?.timestamp ? formatTime(statusData.timestamp) : 'N/A', imageUrl: statusData?.capturedImage };
    }

    $: filteredRecords = data.records.filter(record => {
        const recordDate = new Date(record.date);
        const isAfterStart = startDate ? recordDate >= new Date(startDate) : true;
        const isBeforeEnd = endDate ? recordDate <= new Date(endDate) : true;
        return isAfterStart && isBeforeEnd;
    });
</script>

{#snippet TimeImageDisplay({ statusData })}
    {@const { time, imageUrl } = ImageTimeBlock({ statusData })}
    <div class="time-image-cell">
        <span class="cell-time">{time}</span>
        <div class="cell-image">
            {#if imageUrl && imageUrl !== 'N/A'}
                <button type="button" class="image-btn" on:click={() => handleImageClick(imageUrl)}>
                    <img src={imageUrl} alt="Snapshot" />
                </button>
            {:else}
                <div class="image-placeholder"><IconPhoto size={16} stroke={1.5} /></div>
            {/if}
        </div>
    </div>
{/snippet}

<!-- Filter Section -->
<div class="filter-section">
    <div class="filter-header">
        <IconFilter size={16} stroke={1.5} />
        <span>Filter by Date</span>
    </div>
    <div class="filter-inputs">
        <div class="filter-group">
            <label for="startDate">From</label>
            <input id="startDate" type="date" bind:value={startDate} />
        </div>
        <div class="filter-group">
            <label for="endDate">To</label>
            <input id="endDate" type="date" bind:value={endDate} />
        </div>
    </div>
</div>

<!-- Mobile Cards View -->
<div class="mobile-cards">
    {#each filteredRecords as record}
        <div class="record-card">
            <div class="card-top">
                <span class="card-date">{record.date}</span>
                <span class="status-badge" class:status-in={record.currentStatus === 'checkedIn'} class:status-out={record.currentStatus !== 'checkedIn'}>
                    {record.currentStatus === 'checkedIn' ? 'Checked In' : 'Checked Out'}
                </span>
            </div>
            <div class="card-times">
                <div class="time-row">
                    <span class="time-label">Check In:</span>
                    {@render TimeImageDisplay({ statusData: record.checkIn })}
                </div>
                {#if record.breakStart}
                    <div class="time-row">
                        <span class="time-label">Break Start:</span>
                        {@render TimeImageDisplay({ statusData: record.breakStart })}
                    </div>
                {/if}
                {#if record.breakEnd}
                    <div class="time-row">
                        <span class="time-label">Break End:</span>
                        {@render TimeImageDisplay({ statusData: record.breakEnd })}
                    </div>
                {/if}
                {#if record.checkOut}
                    <div class="time-row">
                        <span class="time-label">Check Out:</span>
                        {@render TimeImageDisplay({ statusData: record.checkOut })}
                    </div>
                {/if}
            </div>
            <div class="card-meta">
                <div class="meta-item">
                    <IconMapPin size={14} stroke={1.5} />
                    <span>{record.checkIn?.location?.name || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <svelte:component this={getDeviceIcon(record.checkIn?.device?.deviceType)} size={14} stroke={1.5} />
                    <span>{record.checkIn?.device?.browser || 'N/A'}</span>
                </div>
            </div>
        </div>
    {/each}
</div>

<!-- Desktop Table View -->
<div class="desktop-table">
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Status</th>
                <th class="text-center">Check In</th>
                <th class="text-center">Break Start</th>
                <th class="text-center">Break End</th>
                <th class="text-center">Check Out</th>
                <th>Location</th>
                <th>Device</th>
            </tr>
        </thead>
        <tbody>
            {#each filteredRecords as record}
                <tr>
                    <td class="cell-date">{record.date}</td>
                    <td>
                        <span class="status-badge" class:status-in={record.currentStatus === 'checkedIn'} class:status-out={record.currentStatus !== 'checkedIn'}>
                            {record.currentStatus === 'checkedIn' ? 'Checked In' : 'Checked Out'}
                        </span>
                    </td>
                    <td>{@render TimeImageDisplay({ statusData: record.checkIn })}</td>
                    <td>{#if record.breakStart}{@render TimeImageDisplay({ statusData: record.breakStart })}{:else}<span class="na-text">N/A</span>{/if}</td>
                    <td>{#if record.breakEnd}{@render TimeImageDisplay({ statusData: record.breakEnd })}{:else}<span class="na-text">N/A</span>{/if}</td>
                    <td>{#if record.checkOut}{@render TimeImageDisplay({ statusData: record.checkOut })}{:else}<span class="na-text">N/A</span>{/if}</td>
                    <td class="cell-location">{record.checkIn?.location?.name || 'N/A'}</td>
                    <td class="cell-device">{record.checkIn?.device?.browser || 'N/A'} ({record.checkIn?.device?.deviceType || 'N/A'})</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .filter-section { padding: 16px 20px; background: var(--apple-gray-6); border-bottom: 1px solid var(--apple-gray-5); }
    .filter-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--apple-gray-1); margin-bottom: 12px; }
    .filter-inputs { display: flex; gap: 16px; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 12px; font-weight: 500; color: var(--apple-gray-1); }
    .filter-group input { padding: 10px 14px; border: 1px solid var(--apple-gray-4); border-radius: var(--apple-radius-sm); font-size: 14px; background: var(--apple-white); transition: var(--apple-transition); }
    .filter-group input:focus { outline: none; border-color: var(--apple-accent); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); }

    .mobile-cards { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .record-card { background: var(--apple-white); border: 1px solid var(--apple-gray-5); border-radius: var(--apple-radius-lg); padding: 16px; }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--apple-gray-5); }
    .card-date { font-size: 15px; font-weight: 600; color: var(--apple-accent); }
    .status-badge { font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 20px; }
    .status-in { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .status-out { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .card-times { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .time-row { display: flex; align-items: center; justify-content: space-between; }
    .time-label { font-size: 13px; font-weight: 500; color: var(--apple-gray-1); }
    .card-meta { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--apple-gray-5); }
    .meta-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--apple-gray-1); }

    .time-image-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .cell-time { font-size: 12px; font-weight: 600; color: var(--apple-black); }
    .cell-image { width: 48px; height: 48px; border-radius: var(--apple-radius-sm); overflow: hidden; background: var(--apple-gray-6); border: 1px solid var(--apple-gray-5); }
    .image-btn { width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: pointer; }
    .image-btn img { width: 100%; height: 100%; object-fit: cover; }
    .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--apple-gray-3); }

    .desktop-table { display: none; overflow-x: auto; }
    .desktop-table table { width: 100%; border-collapse: collapse; }
    .desktop-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--apple-gray-1); background: var(--apple-gray-6); border-bottom: 1px solid var(--apple-gray-5); }
    .desktop-table th.text-center { text-align: center; }
    .desktop-table td { padding: 14px 16px; font-size: 13px; color: var(--apple-black); border-bottom: 1px solid var(--apple-gray-5); vertical-align: middle; }
    .desktop-table tr:hover { background: var(--apple-gray-6); }
    .cell-date { font-weight: 600; color: var(--apple-black); white-space: nowrap; }
    .cell-location, .cell-device { font-size: 12px; color: var(--apple-gray-1); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .na-text { color: var(--apple-gray-3); font-size: 12px; }

    @media (min-width: 1024px) {
        .mobile-cards { display: none; }
        .desktop-table { display: block; }
    }
</style>
