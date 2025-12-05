<script>
    import { onMount } from 'svelte';
    import { 
        IconShield, IconAlertTriangle, IconUser, IconMapPin, 
        IconDevices, IconCheck, IconX, IconEye 
    } from '@tabler/icons-svelte';
    import { getFlaggedUsers, resolveFlaggedUser, RiskLevel } from '$lib/ai/behaviorAnalysis.js';
    import { db } from '$lib/firebase';
    import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
    
    export let adminUserId = null;
    
    let flaggedUsers = [];
    let recentAnomalies = [];
    let loading = true;
    let selectedUser = null;
    let resolutionNotes = '';
    
    onMount(async () => {
        await loadSecurityData();
    });
    
    async function loadSecurityData() {
        loading = true;
        try {
            flaggedUsers = await getFlaggedUsers();
            recentAnomalies = await getRecentAnomalies();
        } catch (error) {
            console.error('Error loading security data:', error);
        }
        loading = false;
    }
    
    async function getRecentAnomalies() {
        if (!db) return [];
        
        try {
            const logsRef = ref(db, 'behavior_logs');
            const snapshot = await get(logsRef);
            
            if (!snapshot.exists()) return [];
            
            const anomalies = [];
            snapshot.forEach(userSnapshot => {
                const userId = userSnapshot.key;
                userSnapshot.forEach(logSnapshot => {
                    const log = logSnapshot.val();
                    if (log.anomalies && log.anomalies.length > 0) {
                        anomalies.push({
                            userId,
                            ...log,
                            logId: logSnapshot.key
                        });
                    }
                });
            });
            
            return anomalies
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 20);
        } catch (error) {
            console.error('Error fetching anomalies:', error);
            return [];
        }
    }

    async function handleResolve(userId, resolution) {
        if (!adminUserId) {
            alert('Admin authentication required');
            return;
        }
        
        const success = await resolveFlaggedUser(userId, resolution, adminUserId, resolutionNotes);
        if (success) {
            await loadSecurityData();
            selectedUser = null;
            resolutionNotes = '';
        }
    }
    
    function getRiskColor(level) {
        switch(level) {
            case RiskLevel.CRITICAL: return 'var(--apple-red)';
            case RiskLevel.HIGH: return 'var(--apple-orange)';
            case RiskLevel.MEDIUM: return '#B38F00';
            default: return 'var(--apple-green)';
        }
    }
    
    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleString();
    }
</script>

<div class="security-dashboard">
    <header class="dashboard-header">
        <h2><IconShield size={24} stroke={1.5} /> Security Dashboard</h2>
        <button class="refresh-btn" on:click={loadSecurityData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
        </button>
    </header>
    
    <div class="dashboard-grid">
        <!-- Flagged Users Section -->
        <section class="dashboard-section flagged-section">
            <h3><IconAlertTriangle size={18} stroke={1.5} /> Flagged Users ({flaggedUsers.length})</h3>
            
            {#if flaggedUsers.length === 0}
                <div class="empty-state">
                    <IconCheck size={32} stroke={1.5} />
                    <p>No flagged users</p>
                </div>
            {:else}
                <div class="flagged-list">
                    {#each flaggedUsers as user}
                        <div class="flagged-item" on:click={() => selectedUser = user}>
                            <div class="flagged-info">
                                <IconUser size={18} stroke={1.5} />
                                <span class="user-id">{user.userId.slice(0, 8)}...</span>
                            </div>
                            <div class="flagged-reason">{user.reason}</div>
                            <div class="flagged-date">{formatDate(user.flaggedAt)}</div>
                            <button class="view-btn">
                                <IconEye size={16} stroke={1.5} />
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
        
        <!-- Recent Anomalies Section -->
        <section class="dashboard-section anomalies-section">
            <h3><IconDevices size={18} stroke={1.5} /> Recent Anomalies</h3>
            
            {#if recentAnomalies.length === 0}
                <div class="empty-state">
                    <IconCheck size={32} stroke={1.5} />
                    <p>No recent anomalies</p>
                </div>
            {:else}
                <div class="anomalies-list">
                    {#each recentAnomalies as anomaly}
                        <div class="anomaly-item">
                            <div class="anomaly-header">
                                <span class="risk-badge" style="background: {getRiskColor(anomaly.riskLevel)}">
                                    {anomaly.riskLevel}
                                </span>
                                <span class="anomaly-user">{anomaly.userId.slice(0, 8)}...</span>
                            </div>
                            <div class="anomaly-details">
                                {#each anomaly.anomalies as a}
                                    <div class="anomaly-type">{a.type}: {a.message}</div>
                                {/each}
                            </div>
                            <div class="anomaly-time">{formatDate(anomaly.timestamp)}</div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
    
    <!-- User Detail Modal -->
    {#if selectedUser}
        <div class="modal-overlay" on:click={() => selectedUser = null}>
            <div class="modal-content" on:click|stopPropagation>
                <h3>Review Flagged User</h3>
                <div class="user-details">
                    <p><strong>User ID:</strong> {selectedUser.userId}</p>
                    <p><strong>Reason:</strong> {selectedUser.reason}</p>
                    <p><strong>Flagged At:</strong> {formatDate(selectedUser.flaggedAt)}</p>
                    {#if selectedUser.evidence}
                        <div class="evidence">
                            <strong>Evidence:</strong>
                            <pre>{JSON.stringify(selectedUser.evidence, null, 2)}</pre>
                        </div>
                    {/if}
                </div>
                
                <div class="resolution-form">
                    <label>
                        Notes:
                        <textarea bind:value={resolutionNotes} placeholder="Add review notes..."></textarea>
                    </label>
                    
                    <div class="resolution-actions">
                        <button class="action-clear" on:click={() => handleResolve(selectedUser.userId, 'cleared')}>
                            <IconCheck size={16} stroke={1.5} /> Clear
                        </button>
                        <button class="action-warn" on:click={() => handleResolve(selectedUser.userId, 'warned')}>
                            <IconAlertTriangle size={16} stroke={1.5} /> Warn
                        </button>
                        <button class="action-suspend" on:click={() => handleResolve(selectedUser.userId, 'suspended')}>
                            <IconX size={16} stroke={1.5} /> Suspend
                        </button>
                    </div>
                </div>
                
                <button class="close-btn" on:click={() => selectedUser = null}>Close</button>
            </div>
        </div>
    {/if}
</div>

<style>
    .security-dashboard { padding: 24px; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .dashboard-header h2 { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; color: var(--apple-black); }
    .refresh-btn { padding: 8px 16px; background: var(--apple-accent); color: white; border: none; border-radius: var(--apple-radius-md); font-size: 13px; font-weight: 500; cursor: pointer; }
    .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; }
    .dashboard-section { background: var(--apple-white); border-radius: var(--apple-radius-xl); padding: 20px; box-shadow: var(--apple-shadow-sm); }
    .dashboard-section h3 { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--apple-black); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--apple-gray-5); }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: var(--apple-gray-2); }
    .empty-state p { margin-top: 12px; font-size: 14px; }
    
    .flagged-list, .anomalies-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
    
    .flagged-item { display: grid; grid-template-columns: auto 1fr auto auto; gap: 12px; align-items: center; padding: 12px; background: var(--apple-gray-6); border-radius: var(--apple-radius-md); cursor: pointer; transition: var(--apple-transition); }
    .flagged-item:hover { background: rgba(255, 59, 48, 0.08); }
    .flagged-info { display: flex; align-items: center; gap: 8px; }
    .user-id { font-size: 13px; font-weight: 500; color: var(--apple-black); }
    .flagged-reason { font-size: 12px; color: var(--apple-gray-1); }
    .flagged-date { font-size: 11px; color: var(--apple-gray-2); }
    .view-btn { padding: 6px; background: transparent; border: none; color: var(--apple-accent); cursor: pointer; }
    
    .anomaly-item { padding: 12px; background: var(--apple-gray-6); border-radius: var(--apple-radius-md); }
    .anomaly-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .risk-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; color: white; text-transform: uppercase; }
    .anomaly-user { font-size: 13px; font-weight: 500; color: var(--apple-black); }
    .anomaly-details { margin-bottom: 8px; }
    .anomaly-type { font-size: 12px; color: var(--apple-gray-1); padding: 4px 0; }
    .anomaly-time { font-size: 11px; color: var(--apple-gray-2); }
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: var(--apple-white); border-radius: var(--apple-radius-xl); padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .modal-content h3 { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
    .user-details p { font-size: 14px; margin-bottom: 8px; }
    .evidence { margin-top: 12px; }
    .evidence pre { background: var(--apple-gray-6); padding: 12px; border-radius: var(--apple-radius-md); font-size: 11px; overflow-x: auto; }
    
    .resolution-form { margin-top: 20px; }
    .resolution-form label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
    .resolution-form textarea { width: 100%; min-height: 80px; padding: 10px; border: 1px solid var(--apple-gray-4); border-radius: var(--apple-radius-md); font-size: 13px; resize: vertical; }
    
    .resolution-actions { display: flex; gap: 10px; margin-top: 16px; }
    .resolution-actions button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: none; border-radius: var(--apple-radius-md); font-size: 13px; font-weight: 500; cursor: pointer; }
    .action-clear { background: var(--apple-green); color: white; }
    .action-warn { background: var(--apple-yellow); color: #1C1C1E; }
    .action-suspend { background: var(--apple-red); color: white; }
    
    .close-btn { width: 100%; margin-top: 16px; padding: 10px; background: var(--apple-gray-5); border: none; border-radius: var(--apple-radius-md); font-size: 13px; cursor: pointer; }
</style>
