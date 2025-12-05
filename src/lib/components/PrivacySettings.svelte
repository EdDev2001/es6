<script>
    import { onMount } from 'svelte';
    import { privacyStore } from '$lib/stores/privacy.js';
    import { db, USER_PROFILE_PATH } from '$lib/firebase';
    import { ref, update } from 'firebase/database';
    import {
        IconShield, IconEye, IconApps, IconDeviceMobile,
        IconHistory, IconAlertTriangle, IconChevronRight,
        IconMapPin, IconChartBar, IconCpu, IconActivity,
        IconCalendar, IconBrandSlack, IconVideo, IconUsers,
        IconCamera, IconMicrophone, IconBell, IconFingerprint,
        IconRefresh, IconCheck, IconX, IconLoader2, IconDownload,
        IconExternalLink, IconInfoCircle
    } from '@tabler/icons-svelte';

    export let user;
    export let userProfile;

    let activeSection = 'collection';
    let showResetConfirm = false;
    let loading = {};
    let errors = {};
    let successMsg = '';

    $: settings = $privacyStore;

    onMount(() => { privacyStore.init(user?.uid); });

    const sections = [
        { id: 'collection', label: 'Data Collection', icon: IconShield },
        { id: 'visibility', label: 'Supervisor Access', icon: IconEye },
        { id: 'thirdparty', label: 'Connected Apps', icon: IconApps },
        { id: 'device', label: 'Device Permissions', icon: IconDeviceMobile },
        { id: 'history', label: 'Consent History', icon: IconHistory }
    ];

    const dataCollectionItems = [
        { key: 'locationTracking', label: 'Location Tracking', desc: 'Allow tracking of check-in locations', icon: IconMapPin, sensitive: true },
        { key: 'attendanceAnalytics', label: 'Attendance Analytics', desc: 'Collect data for attendance insights', icon: IconChartBar },
        { key: 'performanceMetrics', label: 'Performance Metrics', desc: 'Track attendance patterns', icon: IconActivity },
        { key: 'deviceInfo', label: 'Device Information', desc: 'Collect device type and OS info', icon: IconCpu },
        { key: 'usagePatterns', label: 'Usage Patterns', desc: 'Analyze app usage for improvements', icon: IconChartBar }
    ];

    const supervisorItems = [
        { key: 'attendanceLogs', label: 'Attendance Logs', desc: 'Supervisors can view your records', icon: IconHistory },
        { key: 'checkInTimes', label: 'Check-in Times', desc: 'Show exact timestamps', icon: IconCalendar },
        { key: 'locationData', label: 'Location Data', desc: 'Share location with supervisors', icon: IconMapPin, sensitive: true },
        { key: 'deviceUsed', label: 'Device Used', desc: 'Show device used for check-in', icon: IconDeviceMobile },
        { key: 'performanceStats', label: 'Performance Stats', desc: 'Share performance metrics', icon: IconChartBar }
    ];

    const thirdPartyItems = [
        { key: 'googleCalendar', label: 'Google Calendar', desc: 'Sync with Google Calendar', icon: IconCalendar, color: '#4285F4' },
        { key: 'microsoftTeams', label: 'Microsoft Teams', desc: 'Connect with Teams', icon: IconUsers, color: '#6264A7' },
        { key: 'slack', label: 'Slack', desc: 'Send updates to Slack', icon: IconBrandSlack, color: '#4A154B' },
        { key: 'zoom', label: 'Zoom', desc: 'Integrate with Zoom', icon: IconVideo, color: '#2D8CFF' }
    ];

    const deviceItems = [
        { key: 'camera', label: 'Camera', desc: 'For photo check-in', icon: IconCamera },
        { key: 'microphone', label: 'Microphone', desc: 'For voice commands', icon: IconMicrophone },
        { key: 'notifications', label: 'Notifications', desc: 'Receive reminders', icon: IconBell },
        { key: 'location', label: 'Location', desc: 'For GPS check-in', icon: IconMapPin, sensitive: true },
        { key: 'biometrics', label: 'Biometrics', desc: 'Fingerprint/Face ID', icon: IconFingerprint }
    ];

    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts), n = new Date(), diff = n - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    }

    async function handleDataToggle(key, label, val) {
        loading[key] = true; errors[key] = null;
        try {
            privacyStore.updateDataCollection(key, !val);
            if (user && db) {
                await update(ref(db, `${USER_PROFILE_PATH}/${user.uid}/privacySettings/dataCollection`), { [key]: !val });
            }
            showSuccess(`${label} ${!val ? 'enabled' : 'disabled'}`);
        } catch (e) { errors[key] = e.message; }
        loading[key] = false;
    }

    async function handleVisibilityToggle(key, label, val) {
        loading[key] = true; errors[key] = null;
        try {
            privacyStore.updateSupervisorVisibility(key, !val);
            if (user && db) {
                await update(ref(db, `${USER_PROFILE_PATH}/${user.uid}/privacySettings/supervisorVisibility`), { [key]: !val });
            }
            showSuccess(`${label} ${!val ? 'granted' : 'revoked'}`);
        } catch (e) { errors[key] = e.message; }
        loading[key] = false;
    }

    async function handleAppToggle(key, label, connected) {
        loading[key] = true; errors[key] = null;
        try {
            if (connected) {
                privacyStore.disconnectThirdPartyApp(key);
                showSuccess(`Disconnected from ${label}`);
            } else {
                const r = await privacyStore.connectThirdPartyApp(key);
                if (r.success) showSuccess(`Connected to ${label}`);
                else errors[key] = r.error || 'Failed';
            }
        } catch (e) { errors[key] = e.message; }
        loading[key] = false;
    }

    async function handlePermission(key, label, granted) {
        loading[key] = true; errors[key] = null;
        try {
            if (granted) {
                privacyStore.revokeDevicePermission(key);
                showSuccess(`${label} revoked`);
            } else {
                const r = await privacyStore.requestDevicePermission(key);
                if (r.granted) showSuccess(`${label} granted`);
                else errors[key] = r.error || 'Denied';
            }
        } catch (e) { errors[key] = e.message; }
        loading[key] = false;
    }

    function handleReset() { privacyStore.reset(); showResetConfirm = false; showSuccess('Settings reset'); }

    function exportData() {
        const data = privacyStore.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `privacy-${new Date().toISOString().split('T')[0]}.json`;
        a.click(); URL.revokeObjectURL(url);
        showSuccess('Data exported');
    }

    function showSuccess(msg) { successMsg = msg; setTimeout(() => successMsg = '', 3000); }
    function getPerm(k) { const p = settings.devicePermissions[k]; return typeof p === 'boolean' ? p : p?.granted || false; }
    function getApp(k) { const a = settings.thirdPartyApps[k]; return typeof a === 'boolean' ? a : a?.connected || false; }
</script>

<div class="privacy-container">
    {#if successMsg}<div class="success-toast"><IconCheck size={18} /><span>{successMsg}</span></div>{/if}

    <div class="section-nav">
        {#each sections as s}
            <button class="section-btn" class:section-active={activeSection === s.id} on:click={() => activeSection = s.id}>
                <svelte:component this={s.icon} size={18} stroke={1.5} />
                <span class="section-label">{s.label}</span>
                <IconChevronRight size={16} stroke={1.5} class="section-arrow" />
            </button>
        {/each}
    </div>

    <div class="section-content">
        {#if activeSection === 'collection'}
            <div class="content-header"><h3>Data Collection</h3><p>Control what data is collected</p></div>
            <div class="toggle-list">
                {#each dataCollectionItems as item}
                    <div class="toggle-item" class:toggle-sensitive={item.sensitive}>
                        <div class="toggle-icon"><svelte:component this={item.icon} size={20} stroke={1.5} /></div>
                        <div class="toggle-info">
                            <span class="toggle-label">{item.label}</span>
                            <span class="toggle-desc">{item.desc}</span>
                            {#if errors[item.key]}<span class="toggle-error">{errors[item.key]}</span>{/if}
                        </div>
                        <button class="toggle-switch" class:toggle-on={settings.dataCollection[item.key]} class:toggle-loading={loading[item.key]} on:click={() => handleDataToggle(item.key, item.label, settings.dataCollection[item.key])} disabled={loading[item.key]}>
                            {#if loading[item.key]}<IconLoader2 size={16} class="spinner" />{:else}<span class="toggle-knob"></span>{/if}
                        </button>
                    </div>
                {/each}
            </div>
        {/if}

        {#if activeSection === 'visibility'}
            <div class="content-header"><h3>Supervisor Access</h3><p>Choose what supervisors can see</p></div>
            <div class="toggle-list">
                {#each supervisorItems as item}
                    <div class="toggle-item" class:toggle-sensitive={item.sensitive}>
                        <div class="toggle-icon"><svelte:component this={item.icon} size={20} stroke={1.5} /></div>
                        <div class="toggle-info">
                            <span class="toggle-label">{item.label}</span>
                            <span class="toggle-desc">{item.desc}</span>
                            {#if errors[item.key]}<span class="toggle-error">{errors[item.key]}</span>{/if}
                        </div>
                        <button class="toggle-switch" class:toggle-on={settings.supervisorVisibility[item.key]} class:toggle-loading={loading[item.key]} on:click={() => handleVisibilityToggle(item.key, item.label, settings.supervisorVisibility[item.key])} disabled={loading[item.key]}>
                            {#if loading[item.key]}<IconLoader2 size={16} class="spinner" />{:else}<span class="toggle-knob"></span>{/if}
                        </button>
                    </div>
                {/each}
            </div>
        {/if}

        {#if activeSection === 'thirdparty'}
            <div class="content-header"><h3>Connected Apps</h3><p>Manage third-party integrations</p></div>
            <div class="app-grid">
                {#each thirdPartyItems as item}
                    {@const connected = getApp(item.key)}
                    {@const appData = settings.thirdPartyApps[item.key]}
                    <div class="app-card" class:app-connected={connected}>
                        <div class="app-icon" style:background={item.color}><svelte:component this={item.icon} size={24} stroke={1.5} /></div>
                        <div class="app-info">
                            <span class="app-name">{item.label}</span>
                            <span class="app-desc">{item.desc}</span>
                            {#if connected && appData?.lastSync}<span class="app-sync">Synced: {formatTime(appData.lastSync)}</span>{/if}
                            {#if errors[item.key]}<span class="app-error">{errors[item.key]}</span>{/if}
                        </div>
                        <button class="app-toggle" class:app-toggle-on={connected} on:click={() => handleAppToggle(item.key, item.label, connected)} disabled={loading[item.key]}>
                            {#if loading[item.key]}<IconLoader2 size={16} class="spinner" />{:else if connected}<IconCheck size={14} /><span>Connected</span>{:else}<IconExternalLink size={14} /><span>Connect</span>{/if}
                        </button>
                    </div>
                {/each}
            </div>
        {/if}

        {#if activeSection === 'device'}
            <div class="content-header"><h3>Device Permissions</h3><p>Control device feature access</p></div>
            <div class="toggle-list">
                {#each deviceItems as item}
                    {@const granted = getPerm(item.key)}
                    <div class="toggle-item" class:toggle-sensitive={item.sensitive}>
                        <div class="toggle-icon" class:toggle-icon-granted={granted}><svelte:component this={item.icon} size={20} stroke={1.5} /></div>
                        <div class="toggle-info">
                            <span class="toggle-label">{item.label}</span>
                            <span class="toggle-desc">{item.desc}</span>
                            {#if errors[item.key]}<span class="toggle-error">{errors[item.key]}</span>{/if}
                        </div>
                        <button class="permission-btn" class:permission-granted={granted} on:click={() => handlePermission(item.key, item.label, granted)} disabled={loading[item.key]}>
                            {#if loading[item.key]}<IconLoader2 size={16} class="spinner" />{:else if granted}<IconCheck size={16} /><span>Granted</span>{:else}<span>Request</span>{/if}
                        </button>
                    </div>
                {/each}
            </div>
            <div class="permission-note"><IconInfoCircle size={16} /><span>Some permissions can only be revoked in browser settings</span></div>
        {/if}

        {#if activeSection === 'history'}
            <div class="content-header"><h3>Consent History</h3><p>Audit trail of privacy changes</p></div>
            <div class="history-actions">
                <button class="export-btn" on:click={exportData}><IconDownload size={16} /><span>Export</span></button>
                {#if settings.consentHistory.length > 0}<button class="clear-btn" on:click={() => privacyStore.clearHistory()}><IconX size={16} /><span>Clear</span></button>{/if}
            </div>
            {#if settings.consentHistory.length === 0}
                <div class="empty-state"><IconHistory size={48} stroke={1} /><p>No changes recorded yet</p></div>
            {:else}
                <div class="history-list">
                    {#each settings.consentHistory as r}
                        <div class="history-item">
                            <div class="history-badge" class:history-enabled={['enabled','granted','connected','allowed'].includes(r.action)}>{r.action}</div>
                            <div class="history-info"><span class="history-detail">{r.details}</span><span class="history-category">{r.category}</span></div>
                            <span class="history-time">{formatTime(r.timestamp)}</span>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>

    <div class="reset-section">
        {#if showResetConfirm}
            <div class="reset-confirm">
                <IconAlertTriangle size={20} /><span>Reset all settings?</span>
                <button class="reset-yes" on:click={handleReset}>Reset</button>
                <button class="reset-no" on:click={() => showResetConfirm = false}>Cancel</button>
            </div>
        {:else}
            <button class="reset-btn" on:click={() => showResetConfirm = true}><IconRefresh size={18} /><span>Reset to Defaults</span></button>
        {/if}
    </div>
</div>


<style>
    .privacy-container { display: flex; flex-direction: column; gap: 24px; }
    .success-toast { position: fixed; top: 80px; right: 20px; display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: var(--apple-green); color: white; border-radius: var(--apple-radius-md); box-shadow: var(--apple-shadow-lg); z-index: 1000; font-weight: 500; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    
    .section-nav { display: flex; flex-direction: column; gap: 4px; padding: 4px; background: var(--theme-border-light, var(--apple-gray-6)); border-radius: var(--apple-radius-lg); }
    .section-btn { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: transparent; border: none; border-radius: var(--apple-radius-md); color: var(--theme-text-secondary, var(--apple-gray-1)); font-size: 14px; font-weight: 500; cursor: pointer; transition: var(--apple-transition); text-align: left; }
    .section-btn:hover { background: var(--theme-card-bg, var(--apple-white)); color: var(--theme-text, var(--apple-black)); }
    .section-active { background: var(--theme-card-bg, var(--apple-white)); color: var(--apple-accent); box-shadow: var(--apple-shadow-sm); }
    .section-label { flex: 1; }
    .section-arrow { opacity: 0.4; }
    .section-active .section-arrow { opacity: 1; color: var(--apple-accent); }
    
    .section-content { min-height: 300px; }
    .content-header { margin-bottom: 20px; }
    .content-header h3 { font-size: 18px; font-weight: 600; color: var(--theme-text, var(--apple-black)); margin: 0 0 4px 0; }
    .content-header p { font-size: 14px; color: var(--theme-text-secondary, var(--apple-gray-1)); margin: 0; }
    
    .toggle-list { display: flex; flex-direction: column; gap: 8px; }
    .toggle-item { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--theme-border-light, var(--apple-gray-6)); border-radius: var(--apple-radius-md); transition: var(--apple-transition); }
    .toggle-item:hover { background: var(--theme-border, var(--apple-gray-5)); }
    .toggle-sensitive { border-left: 3px solid var(--apple-orange); }
    .toggle-icon { width: 40px; height: 40px; border-radius: var(--apple-radius-sm); background: var(--theme-card-bg, var(--apple-white)); display: flex; align-items: center; justify-content: center; color: var(--theme-text-secondary, var(--apple-gray-1)); flex-shrink: 0; }
    .toggle-icon-granted { background: rgba(52, 199, 89, 0.15); color: var(--apple-green); }
    .toggle-info { flex: 1; min-width: 0; }
    .toggle-label { display: block; font-size: 15px; font-weight: 500; color: var(--theme-text, var(--apple-black)); margin-bottom: 2px; }
    .toggle-desc { display: block; font-size: 13px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .toggle-error { display: block; font-size: 12px; color: var(--apple-red); margin-top: 4px; }
    
    .toggle-switch { position: relative; width: 51px; height: 31px; background: var(--theme-border, var(--apple-gray-4)); border: none; border-radius: 16px; cursor: pointer; transition: var(--apple-transition); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .toggle-switch:disabled { opacity: 0.6; cursor: not-allowed; }
    .toggle-switch.toggle-on { background: var(--apple-green); }
    .toggle-switch.toggle-loading { background: var(--apple-accent); }
    .toggle-knob { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: var(--apple-transition); }
    .toggle-on .toggle-knob { transform: translateX(20px); }
    
    .permission-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-sm); font-size: 13px; font-weight: 500; color: var(--theme-text, var(--apple-black)); cursor: pointer; transition: var(--apple-transition); flex-shrink: 0; }
    .permission-btn:hover { background: var(--theme-border-light, var(--apple-gray-6)); }
    .permission-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .permission-granted { background: var(--apple-green); border-color: var(--apple-green); color: white; }
    .permission-granted:hover { background: #2DB84D; }
    .permission-note { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 16px; background: rgba(0, 122, 255, 0.08); border-radius: var(--apple-radius-md); font-size: 13px; color: var(--apple-accent); }
    
    .app-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .app-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--theme-border-light, var(--apple-gray-6)); border-radius: var(--apple-radius-md); border: 2px solid transparent; transition: var(--apple-transition); }
    .app-connected { border-color: var(--apple-green); background: rgba(52, 199, 89, 0.08); }
    .app-icon { width: 44px; height: 44px; border-radius: var(--apple-radius-sm); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
    .app-info { flex: 1; min-width: 0; }
    .app-name { display: block; font-size: 15px; font-weight: 600; color: var(--theme-text, var(--apple-black)); margin-bottom: 2px; }
    .app-desc { display: block; font-size: 12px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .app-sync { display: block; font-size: 11px; color: var(--apple-green); margin-top: 4px; }
    .app-error { display: block; font-size: 11px; color: var(--apple-red); margin-top: 4px; }
    .app-toggle { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-sm); font-size: 13px; font-weight: 500; color: var(--theme-text, var(--apple-black)); cursor: pointer; transition: var(--apple-transition); flex-shrink: 0; min-width: 110px; justify-content: center; }
    .app-toggle:hover { background: var(--theme-border-light, var(--apple-gray-6)); }
    .app-toggle:disabled { opacity: 0.6; cursor: not-allowed; }
    .app-toggle-on { background: var(--apple-green); border-color: var(--apple-green); color: white; }
    .app-toggle-on:hover { background: #2DB84D; }
    
    .history-actions { display: flex; gap: 12px; margin-bottom: 16px; }
    .export-btn, .clear-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: var(--apple-radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; transition: var(--apple-transition); }
    .export-btn { background: var(--apple-accent); border: none; color: white; }
    .export-btn:hover { background: var(--apple-accent-hover); }
    .clear-btn { background: transparent; border: 1px solid var(--theme-border, var(--apple-gray-4)); color: var(--theme-text-secondary); }
    .clear-btn:hover { background: var(--theme-border-light); color: var(--apple-red); border-color: var(--apple-red); }
    
    .history-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
    .history-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--theme-border-light, var(--apple-gray-6)); border-radius: var(--apple-radius-md); }
    .history-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: rgba(255, 59, 48, 0.15); color: var(--apple-red); flex-shrink: 0; }
    .history-enabled { background: rgba(52, 199, 89, 0.15); color: var(--apple-green); }
    .history-info { flex: 1; min-width: 0; }
    .history-detail { display: block; font-size: 14px; font-weight: 500; color: var(--theme-text, var(--apple-black)); }
    .history-category { display: block; font-size: 12px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .history-time { font-size: 12px; color: var(--theme-text-secondary, var(--apple-gray-2)); flex-shrink: 0; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--theme-text-secondary, var(--apple-gray-2)); text-align: center; }
    .empty-state p { margin-top: 12px; font-size: 15px; }
    
    .reset-section { padding-top: 20px; border-top: 1px solid var(--theme-border-light, var(--apple-gray-5)); }
    .reset-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: transparent; border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); color: var(--theme-text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: var(--apple-transition); }
    .reset-btn:hover { background: var(--theme-border-light); color: var(--apple-red); border-color: var(--apple-red); }
    .reset-confirm { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255, 149, 0, 0.1); border: 1px solid rgba(255, 149, 0, 0.3); border-radius: var(--apple-radius-md); color: var(--apple-orange); font-size: 14px; font-weight: 500; flex-wrap: wrap; }
    .reset-confirm span { flex: 1; min-width: 150px; }
    .reset-yes, .reset-no { padding: 8px 16px; border-radius: var(--apple-radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; }
    .reset-yes { background: var(--apple-red); border: none; color: white; }
    .reset-yes:hover { background: #E5352B; }
    .reset-no { background: transparent; border: 1px solid var(--theme-border); color: var(--theme-text); }
    .reset-no:hover { background: var(--theme-border-light); }
    
    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 480px) {
        .section-nav { flex-direction: row; overflow-x: auto; gap: 0; }
        .section-btn { flex-direction: column; gap: 6px; padding: 12px 8px; min-width: 70px; text-align: center; }
        .section-label { font-size: 10px; }
        .section-arrow { display: none; }
        .app-grid { grid-template-columns: 1fr; }
        .success-toast { left: 20px; right: 20px; top: auto; bottom: 100px; }
    }
</style>
