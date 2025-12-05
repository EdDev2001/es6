<script>
    import { onMount } from 'svelte';
    import { IconMapPin, IconPlus, IconTrash, IconCheck } from '@tabler/icons-svelte';
    import { getCampusZones, saveCampusZones } from '$lib/security/geofence.js';
    
    export let organizationId = 'default';
    
    let zones = [];
    let loading = true;
    let saving = false;
    let newZone = { id: '', name: '', latitude: '', longitude: '', radius: 500, type: 'secondary' };
    let showAddForm = false;
    
    onMount(async () => {
        zones = await getCampusZones(organizationId);
        loading = false;
    });
    
    function addZone() {
        if (!newZone.name || !newZone.latitude || !newZone.longitude) {
            alert('Please fill in all required fields');
            return;
        }
        
        const zone = {
            id: newZone.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
            name: newZone.name,
            latitude: parseFloat(newZone.latitude),
            longitude: parseFloat(newZone.longitude),
            radius: parseInt(newZone.radius) || 500,
            type: newZone.type
        };
        
        zones = [...zones, zone];
        newZone = { id: '', name: '', latitude: '', longitude: '', radius: 500, type: 'secondary' };
        showAddForm = false;
    }
    
    function removeZone(zoneId) {
        if (confirm('Are you sure you want to remove this zone?')) {
            zones = zones.filter(z => z.id !== zoneId);
        }
    }
    
    async function saveZones() {
        saving = true;
        const success = await saveCampusZones(organizationId, zones);
        saving = false;
        
        if (success) {
            alert('Zones saved successfully!');
        } else {
            alert('Failed to save zones');
        }
    }
    
    function getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    newZone.latitude = pos.coords.latitude.toFixed(6);
                    newZone.longitude = pos.coords.longitude.toFixed(6);
                },
                (err) => alert('Could not get location: ' + err.message)
            );
        }
    }
</script>

<div class="geofence-config">
    <header class="config-header">
        <h3><IconMapPin size={20} stroke={1.5} /> Campus Geofence Zones</h3>
        <div class="header-actions">
            <button class="add-btn" on:click={() => showAddForm = !showAddForm}>
                <IconPlus size={16} stroke={1.5} />
                Add Zone
            </button>
            <button class="save-btn" on:click={saveZones} disabled={saving}>
                <IconCheck size={16} stroke={1.5} />
                {saving ? 'Saving...' : 'Save All'}
            </button>
        </div>
    </header>
    
    {#if showAddForm}
        <div class="add-form">
            <h4>Add New Zone</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label>Zone Name *</label>
                    <input type="text" bind:value={newZone.name} placeholder="e.g., Main Building" />
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select bind:value={newZone.type}>
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Latitude *</label>
                    <input type="text" bind:value={newZone.latitude} placeholder="14.5995" />
                </div>
                <div class="form-group">
                    <label>Longitude *</label>
                    <input type="text" bind:value={newZone.longitude} placeholder="120.9842" />
                </div>
                <div class="form-group">
                    <label>Radius (meters)</label>
                    <input type="number" bind:value={newZone.radius} min="50" max="5000" />
                </div>
                <div class="form-group">
                    <button class="location-btn" on:click={getCurrentLocation}>
                        <IconMapPin size={14} stroke={1.5} /> Use Current Location
                    </button>
                </div>
            </div>
            <div class="form-actions">
                <button class="cancel-btn" on:click={() => showAddForm = false}>Cancel</button>
                <button class="confirm-btn" on:click={addZone}>Add Zone</button>
            </div>
        </div>
    {/if}
    
    {#if loading}
        <div class="loading">Loading zones...</div>
    {:else if zones.length === 0}
        <div class="empty-state">
            <IconMapPin size={32} stroke={1.5} />
            <p>No geofence zones configured</p>
            <p class="hint">Add zones to restrict attendance to specific locations</p>
        </div>
    {:else}
        <div class="zones-list">
            {#each zones as zone}
                <div class="zone-card" class:primary={zone.type === 'primary'}>
                    <div class="zone-info">
                        <h4>{zone.name}</h4>
                        <p class="zone-coords">{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</p>
                        <p class="zone-radius">Radius: {zone.radius}m</p>
                    </div>
                    <div class="zone-type">{zone.type}</div>
                    <button class="delete-btn" on:click={() => removeZone(zone.id)}>
                        <IconTrash size={16} stroke={1.5} />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .geofence-config { background: var(--apple-white); border-radius: var(--apple-radius-xl); padding: 24px; }
    .config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .config-header h3 { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
    .header-actions { display: flex; gap: 10px; }
    .add-btn, .save-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: var(--apple-radius-md); font-size: 13px; font-weight: 500; cursor: pointer; }
    .add-btn { background: var(--apple-gray-5); color: var(--apple-black); }
    .save-btn { background: var(--apple-accent); color: white; }
    .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .add-form { background: var(--apple-gray-6); border-radius: var(--apple-radius-lg); padding: 20px; margin-bottom: 20px; }
    .add-form h4 { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; font-weight: 500; color: var(--apple-gray-1); }
    .form-group input, .form-group select { padding: 10px 12px; border: 1px solid var(--apple-gray-4); border-radius: var(--apple-radius-md); font-size: 14px; }
    .location-btn { display: flex; align-items: center; gap: 6px; padding: 10px; background: var(--apple-white); border: 1px solid var(--apple-gray-4); border-radius: var(--apple-radius-md); font-size: 13px; cursor: pointer; margin-top: 20px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
    .cancel-btn { padding: 8px 16px; background: transparent; border: 1px solid var(--apple-gray-4); border-radius: var(--apple-radius-md); font-size: 13px; cursor: pointer; }
    .confirm-btn { padding: 8px 16px; background: var(--apple-accent); color: white; border: none; border-radius: var(--apple-radius-md); font-size: 13px; cursor: pointer; }
    
    .loading, .empty-state { text-align: center; padding: 40px; color: var(--apple-gray-2); }
    .empty-state p { margin-top: 12px; }
    .empty-state .hint { font-size: 13px; margin-top: 4px; }
    
    .zones-list { display: flex; flex-direction: column; gap: 12px; }
    .zone-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--apple-gray-6); border-radius: var(--apple-radius-lg); border-left: 4px solid var(--apple-gray-3); }
    .zone-card.primary { border-left-color: var(--apple-accent); }
    .zone-info { flex: 1; }
    .zone-info h4 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .zone-coords { font-size: 12px; color: var(--apple-gray-1); font-family: monospace; }
    .zone-radius { font-size: 12px; color: var(--apple-gray-2); margin-top: 2px; }
    .zone-type { padding: 4px 10px; background: var(--apple-white); border-radius: 12px; font-size: 11px; font-weight: 500; color: var(--apple-gray-1); text-transform: capitalize; }
    .delete-btn { padding: 8px; background: transparent; border: none; color: var(--apple-red); cursor: pointer; opacity: 0.6; }
    .delete-btn:hover { opacity: 1; }
</style>
