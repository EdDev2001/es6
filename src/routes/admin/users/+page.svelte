<script>
    import { onMount } from "svelte";
    import { adminAuthStore } from "$lib/stores/adminAuth.js";
    import { IconUsers, IconSearch, IconPlus, IconEdit, IconTrash, IconLoader2, IconChevronLeft, IconChevronRight, IconDownload, IconX, IconQrcode, IconKey, IconUserCheck, IconUserX, IconUpload, IconCheck, IconAlertCircle, IconCopy, IconShield, IconShieldOff } from "@tabler/icons-svelte";

    let users = [], departments = [], filteredUsers = [], isLoading = true, searchQuery = '', roleFilter = '', departmentFilter = '', statusFilter = '', currentPage = 1, itemsPerPage = 10;
    let showAddModal = false, showEditModal = false, showDeleteModal = false, showBulkModal = false, showQRModal = false, showPasswordModal = false, showRoleModal = false;
    let selectedUser = null, selectedUsers = [], selectAll = false;
    let formData = { name: '', email: '', role: 'student', department: '', year: '', section: '', phone: '' };
    let formError = '', isSubmitting = false, tempPassword = '', bulkAction = 'delete', bulkDepartment = '', bulkSection = '', csvFile = null, csvPreview = [];
    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

    $: totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    $: paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    onMount(async () => { await loadUsers(); });

    async function loadUsers() {
        isLoading = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const params = new URLSearchParams();
            if (roleFilter) params.set('role', roleFilter);
            if (departmentFilter) params.set('department', departmentFilter);
            if (statusFilter) params.set('isActive', statusFilter);
            const response = await fetch(`/api/admin/users?${params}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (response.ok) { const data = await response.json(); users = data.users || []; departments = data.departments || []; filterUsers(); }
        } catch (error) { console.error('Failed to load users:', error); }
        finally { isLoading = false; }
    }

    function filterUsers() {
        let result = [...users];
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u => u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query) || u.digitalId?.toLowerCase().includes(query));
        }
        filteredUsers = result; currentPage = 1; selectedUsers = []; selectAll = false;
    }

    function toggleSelectAll() { selectAll = !selectAll; selectedUsers = selectAll ? paginatedUsers.map(u => u.id) : []; }
    function toggleSelectUser(userId) { selectedUsers = selectedUsers.includes(userId) ? selectedUsers.filter(id => id !== userId) : [...selectedUsers, userId]; }
    function openAddModal() { formData = { name: '', email: '', role: 'student', department: '', year: '', section: '', phone: '' }; formError = ''; showAddModal = true; }
    function openEditModal(user) { selectedUser = user; formData = { name: user.name || '', email: user.email || '', role: user.role || 'student', department: user.department || '', year: user.year || '', section: user.section || '', phone: user.phone || '' }; formError = ''; showEditModal = true; }

    async function saveUser() {
        if (!formData.name || !formData.email) { formError = 'Name and email are required'; return; }
        isSubmitting = true; formError = '';
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const method = showEditModal ? 'PUT' : 'POST';
            const url = showEditModal ? `/api/admin/users/${selectedUser.id}` : '/api/admin/users';
            const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed'); }
            showAddModal = false; showEditModal = false; await loadUsers();
        } catch (error) { formError = error.message; } finally { isSubmitting = false; }
    }

    async function deleteUser() {
        isSubmitting = true;
        try { const { accessToken } = adminAuthStore.getStoredTokens(); await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } }); showDeleteModal = false; await loadUsers(); }
        catch (error) { console.error('Delete failed:', error); } finally { isSubmitting = false; }
    }

    async function toggleUserStatus(user) {
        try { const { accessToken } = adminAuthStore.getStoredTokens(); await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: user.isActive !== false ? 'deactivate' : 'activate' }) }); await loadUsers(); }
        catch (error) { console.error('Status toggle failed:', error); }
    }

    async function resetQR(user) {
        selectedUser = user; isSubmitting = true;
        try { const { accessToken } = adminAuthStore.getStoredTokens(); const response = await fetch(`/api/admin/users/${user.id}/reset-qr`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } }); if (response.ok) { const data = await response.json(); selectedUser = { ...user, qrCode: data.qrCode }; showQRModal = true; } }
        catch (error) { console.error('QR reset failed:', error); } finally { isSubmitting = false; }
    }

    async function resetPassword(user) {
        selectedUser = user; tempPassword = ''; isSubmitting = true;
        try { const { accessToken } = adminAuthStore.getStoredTokens(); const response = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); if (response.ok) { const data = await response.json(); tempPassword = data.temporaryPassword; showPasswordModal = true; } }
        catch (error) { console.error('Password reset failed:', error); } finally { isSubmitting = false; }
    }

    async function changeRole(action) {
        isSubmitting = true;
        try { const { accessToken } = adminAuthStore.getStoredTokens(); await fetch(`/api/admin/users/${selectedUser.id}/role`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, adminRole: 'admin' }) }); showRoleModal = false; await loadUsers(); }
        catch (error) { console.error('Role change failed:', error); } finally { isSubmitting = false; }
    }

    async function executeBulkAction() {
        if (selectedUsers.length === 0) return;
        isSubmitting = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            let body = { action: bulkAction, userIds: selectedUsers };
            if (bulkAction === 'update') { body.updates = {}; if (bulkDepartment) body.updates.department = bulkDepartment; if (bulkSection) body.updates.section = bulkSection; }
            await fetch('/api/admin/users/bulk', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            showBulkModal = false; selectedUsers = []; selectAll = false; await loadUsers();
        } catch (error) { console.error('Bulk action failed:', error); } finally { isSubmitting = false; }
    }

    function handleCSVUpload(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            csvPreview = lines.slice(1, 6).map(line => { const values = line.split(',').map(v => v.trim().replace(/"/g, '')); const obj = {}; headers.forEach((h, i) => obj[h] = values[i] || ''); return obj; });
            csvFile = { headers, lines: lines.slice(1) };
        };
        reader.readAsText(file);
    }

    async function uploadCSV() {
        if (!csvFile) return; isSubmitting = true;
        try {
            const users = csvFile.lines.map(line => { const values = line.split(',').map(v => v.trim().replace(/"/g, '')); const obj = {}; csvFile.headers.forEach((h, i) => obj[h] = values[i] || ''); return obj; }).filter(u => u.name && u.email);
            const { accessToken } = adminAuthStore.getStoredTokens();
            const response = await fetch('/api/admin/users/bulk', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', users }) });
            if (response.ok) { const data = await response.json(); alert(`Created: ${data.result.success.length}, Failed: ${data.result.failed.length}`); showBulkModal = false; csvFile = null; csvPreview = []; await loadUsers(); }
        } catch (error) { console.error('CSV upload failed:', error); } finally { isSubmitting = false; }
    }

    function exportUsers() { const { accessToken } = adminAuthStore.getStoredTokens(); window.open(`/api/admin/users?export=csv&token=${accessToken}`, '_blank'); }
    function copyToClipboard(text) { navigator.clipboard.writeText(text); }
</script>

<svelte:head><title>Users | Admin Panel</title></svelte:head>

<div class="users-page">
    <header class="page-header">
        <div><h1>Users</h1><p class="subtitle">Manage student and staff accounts</p></div>
        <div class="header-actions">
            {#if selectedUsers.length > 0}<button class="apple-btn-secondary" on:click={() => { bulkAction = 'delete'; showBulkModal = true; }}>Bulk Actions ({selectedUsers.length})</button>{/if}
            <button class="apple-btn-secondary" on:click={() => { bulkAction = 'upload'; showBulkModal = true; }}><IconUpload size={18} stroke={2} /> Import CSV</button>
            <button class="apple-btn-primary" on:click={openAddModal}><IconPlus size={18} stroke={2} /> Add User</button>
        </div>
    </header>

    <div class="toolbar">
        <div class="search-box"><IconSearch size={18} stroke={1.5} /><input type="text" placeholder="Search..." bind:value={searchQuery} on:input={filterUsers} /></div>
        <div class="filters">
            <select class="filter-select" bind:value={roleFilter} on:change={loadUsers}><option value="">All Roles</option><option value="student">Students</option><option value="staff">Staff</option></select>
            <select class="filter-select" bind:value={departmentFilter} on:change={loadUsers}><option value="">All Departments</option>{#each departments as dept}<option value={dept.id}>{dept.name}</option>{/each}</select>
            <select class="filter-select" bind:value={statusFilter} on:change={loadUsers}><option value="">All Status</option><option value="true">Active</option><option value="false">Inactive</option></select>
            <button class="toolbar-btn" on:click={exportUsers}><IconDownload size={18} stroke={1.5} /> Export</button>
        </div>
    </div>

    <div class="table-container apple-card">
        {#if isLoading}<div class="loading-state"><IconLoader2 size={32} stroke={1.5} class="spin" /><p>Loading...</p></div>
        {:else if filteredUsers.length === 0}<div class="empty-state"><IconUsers size={48} stroke={1.5} /><p>No users found</p></div>
        {:else}
            <table class="apple-table">
                <thead><tr><th class="chk"><input type="checkbox" checked={selectAll} on:change={toggleSelectAll} /></th><th>User</th><th>Digital ID</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    {#each paginatedUsers as user}
                        <tr class:selected={selectedUsers.includes(user.id)}>
                            <td class="chk"><input type="checkbox" checked={selectedUsers.includes(user.id)} on:change={() => toggleSelectUser(user.id)} /></td>
                            <td><div class="user-cell"><div class="avatar">{user.name?.charAt(0) || 'U'}</div><div class="user-info"><span class="name">{user.name}</span><span class="email">{user.email}</span></div></div></td>
                            <td><code class="did">{user.digitalId || '-'}</code></td>
                            <td><span class="role-badge {user.role}">{user.role || 'student'}</span></td>
                            <td><div class="dept">{user.department || '-'}{#if user.year}<span class="sub">{user.year} {user.section || ''}</span>{/if}</div></td>
                            <td><span class="status-badge {user.isActive !== false ? 'active' : 'inactive'}">{user.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                            <td>
                                <div class="actions">
                                    <button class="icon-btn" title="Edit" on:click={() => openEditModal(user)}><IconEdit size={16} /></button>
                                    <button class="icon-btn" title="Reset QR" on:click={() => resetQR(user)}><IconQrcode size={16} /></button>
                                    <button class="icon-btn" title="Reset Password" on:click={() => resetPassword(user)}><IconKey size={16} /></button>
                                    <button class="icon-btn" title={user.isActive !== false ? 'Deactivate' : 'Activate'} on:click={() => toggleUserStatus(user)}>{#if user.isActive !== false}<IconUserX size={16} />{:else}<IconUserCheck size={16} />{/if}</button>
                                    {#if $adminAuthStore.admin?.role === 'super_admin'}<button class="icon-btn" title="Manage Role" on:click={() => { selectedUser = user; showRoleModal = true; }}><IconShield size={16} /></button>{/if}
                                    <button class="icon-btn danger" title="Delete" on:click={() => { selectedUser = user; showDeleteModal = true; }}><IconTrash size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
            <div class="pagination"><span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}</span><div class="pg-ctrl"><button class="pg-btn" disabled={currentPage === 1} on:click={() => currentPage--}><IconChevronLeft size={18} /></button><span>{currentPage}/{totalPages}</span><button class="pg-btn" disabled={currentPage === totalPages} on:click={() => currentPage++}><IconChevronRight size={18} /></button></div></div>
        {/if}
    </div>
</div>

<!-- Add/Edit Modal -->
{#if showAddModal || showEditModal}
<div class="modal-overlay" on:click={() => { showAddModal = false; showEditModal = false; }} on:keydown={(e) => e.key === 'Escape' && (showAddModal = false, showEditModal = false)} role="button" tabindex="-1"><div class="modal apple-card" on:click|stopPropagation role="dialog">
    <div class="modal-header"><h2>{showEditModal ? 'Edit User' : 'Add User'}</h2><button class="close-btn" on:click={() => { showAddModal = false; showEditModal = false; }}><IconX size={20} /></button></div>
    {#if formError}<div class="error-alert"><IconAlertCircle size={18} />{formError}</div>{/if}
    <div class="modal-body">
        <div class="form-row"><div class="form-group"><label for="name">Name *</label><input id="name" class="apple-input" bind:value={formData.name} /></div><div class="form-group"><label for="email">Email *</label><input id="email" class="apple-input" bind:value={formData.email} disabled={showEditModal} /></div></div>
        <div class="form-row"><div class="form-group"><label for="role">Role</label><select id="role" class="apple-input" bind:value={formData.role}><option value="student">Student</option><option value="staff">Staff</option></select></div><div class="form-group"><label for="phone">Phone</label><input id="phone" class="apple-input" bind:value={formData.phone} /></div></div>
        <div class="form-row"><div class="form-group"><label for="dept">Department</label><select id="dept" class="apple-input" bind:value={formData.department}><option value="">Select</option>{#each departments as d}<option value={d.name}>{d.name}</option>{/each}</select></div><div class="form-group"><label for="year">Year</label><select id="year" class="apple-input" bind:value={formData.year}><option value="">Select</option>{#each years as y}<option value={y}>{y}</option>{/each}</select></div></div>
        <div class="form-group"><label for="section">Section</label><select id="section" class="apple-input" bind:value={formData.section}><option value="">Select</option>{#each sections as s}<option value={s}>Section {s}</option>{/each}</select></div>
    </div>
    <div class="modal-footer"><button class="apple-btn-secondary" on:click={() => { showAddModal = false; showEditModal = false; }}>Cancel</button><button class="apple-btn-primary" on:click={saveUser} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button></div>
</div></div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal}
<div class="modal-overlay" on:click={() => showDeleteModal = false} on:keydown={(e) => e.key === 'Escape' && (showDeleteModal = false)} role="button" tabindex="-1"><div class="modal apple-card small" on:click|stopPropagation role="dialog">
    <div class="modal-header"><h2>Delete User</h2><button class="close-btn" on:click={() => showDeleteModal = false}><IconX size={20} /></button></div>
    <div class="modal-body"><p>Delete <strong>{selectedUser?.name}</strong>?</p><p class="warning">This cannot be undone.</p></div>
    <div class="modal-footer"><button class="apple-btn-secondary" on:click={() => showDeleteModal = false}>Cancel</button><button class="apple-btn-primary danger" on:click={deleteUser} disabled={isSubmitting}>{isSubmitting ? 'Deleting...' : 'Delete'}</button></div>
</div></div>
{/if}

<!-- QR Modal -->
{#if showQRModal}
<div class="modal-overlay" on:click={() => showQRModal = false} on:keydown={(e) => e.key === 'Escape' && (showQRModal = false)} role="button" tabindex="-1"><div class="modal apple-card small" on:click|stopPropagation role="dialog">
    <div class="modal-header"><h2>QR Code Reset</h2><button class="close-btn" on:click={() => showQRModal = false}><IconX size={20} /></button></div>
    <div class="modal-body center"><div class="success-icon"><IconCheck size={32} /></div><p>QR reset for <strong>{selectedUser?.name}</strong></p><div class="code-box"><code>{selectedUser?.qrCode}</code><button class="copy-btn" on:click={() => copyToClipboard(selectedUser?.qrCode)}><IconCopy size={16} /></button></div></div>
    <div class="modal-footer"><button class="apple-btn-primary" on:click={() => showQRModal = false}>Done</button></div>
</div></div>
{/if}

<!-- Password Modal -->
{#if showPasswordModal}
<div class="modal-overlay" on:click={() => showPasswordModal = false} on:keydown={(e) => e.key === 'Escape' && (showPasswordModal = false)} role="button" tabindex="-1"><div class="modal apple-card small" on:click|stopPropagation role="dialog">
    <div class="modal-header"><h2>Password Reset</h2><button class="close-btn" on:click={() => showPasswordModal = false}><IconX size={20} /></button></div>
    <div class="modal-body center"><div class="success-icon"><IconCheck size={32} /></div><p>Password reset for <strong>{selectedUser?.name}</strong></p><div class="code-box"><code>{tempPassword}</code><button class="copy-btn" on:click={() => copyToClipboard(tempPassword)}><IconCopy size={16} /></button></div><p class="hint">Share this securely with the user.</p></div>
    <div class="modal-footer"><button class="apple-btn-primary" on:click={() => showPasswordModal = false}>Done</button></div>
</div></div>
{/if}

<!-- Role Modal -->
{#if showRoleModal}
<div class="modal-overlay" on:click={() => showRoleModal = false} on:keydown={(e) => e.key === 'Escape' && (showRoleModal = false)} role="button" tabindex="-1"><div class="modal apple-card small" on:click|stopPropagation role="dialog">
    <div class="modal-header"><h2>Manage Role</h2><button class="close-btn" on:click={() => showRoleModal = false}><IconX size={20} /></button></div>
    <div class="modal-body"><p>Manage admin privileges for <strong>{selectedUser?.name}</strong></p>
        <div class="role-actions">{#if selectedUser?.isAdmin}<button class="role-btn demote" on:click={() => changeRole('demote')} disabled={isSubmitting}><IconShieldOff size={20} /><span>Remove Admin</span></button>{:else}<button class="role-btn promote" on:click={() => changeRole('promote')} disabled={isSubmitting}><IconShield size={20} /><span>Promote to Admin</span></button>{/if}</div>
    </div>
    <div class="modal-footer"><button class="apple-btn-secondary" on:click={() => showRoleModal = false}>Cancel</button></div>
</div></div>
{/if}

<!-- Bulk Modal -->
{#if showBulkModal}
<div class="modal-overlay" on:click={() => showBulkModal = false} on:keydown={(e) => e.key === 'Escape' && (showBulkModal = false)} role="button" tabindex="-1"><div class="modal apple-card" on:click|stopPropagation role="dialog">
    <div class="modal-header"><h2>{bulkAction === 'upload' ? 'Import CSV' : 'Bulk Actions'}</h2><button class="close-btn" on:click={() => showBulkModal = false}><IconX size={20} /></button></div>
    <div class="modal-body">
        {#if bulkAction === 'upload'}
            <div class="upload-area"><input type="file" accept=".csv" on:change={handleCSVUpload} id="csv-upload" /><label for="csv-upload" class="upload-label"><IconUpload size={32} /><span>Upload CSV</span><span class="hint">Columns: name, email, role, department</span></label></div>
            {#if csvPreview.length > 0}<div class="csv-preview"><h4>Preview</h4><table class="preview-table"><thead><tr>{#each Object.keys(csvPreview[0]) as k}<th>{k}</th>{/each}</tr></thead><tbody>{#each csvPreview as row}<tr>{#each Object.values(row) as v}<td>{v}</td>{/each}</tr>{/each}</tbody></table></div>{/if}
        {:else}
            <p>Selected: <strong>{selectedUsers.length}</strong> users</p>
            <div class="bulk-options"><label class="radio-opt"><input type="radio" bind:group={bulkAction} value="delete" /><span>Delete selected</span></label><label class="radio-opt"><input type="radio" bind:group={bulkAction} value="update" /><span>Assign department/section</span></label></div>
            {#if bulkAction === 'update'}<div class="form-row"><div class="form-group"><label for="bulk-dept">Department</label><select id="bulk-dept" class="apple-input" bind:value={bulkDepartment}><option value="">No change</option>{#each departments as d}<option value={d.name}>{d.name}</option>{/each}</select></div><div class="form-group"><label for="bulk-section">Section</label><select id="bulk-section" class="apple-input" bind:value={bulkSection}><option value="">No change</option>{#each sections as s}<option value={s}>Section {s}</option>{/each}</select></div></div>{/if}
        {/if}
    </div>
    <div class="modal-footer"><button class="apple-btn-secondary" on:click={() => showBulkModal = false}>Cancel</button>
        {#if bulkAction === 'upload'}<button class="apple-btn-primary" on:click={uploadCSV} disabled={!csvFile || isSubmitting}>{isSubmitting ? 'Uploading...' : 'Import'}</button>
        {:else}<button class="apple-btn-primary {bulkAction === 'delete' ? 'danger' : ''}" on:click={executeBulkAction} disabled={isSubmitting}>{isSubmitting ? 'Processing...' : bulkAction === 'delete' ? 'Delete' : 'Update'}</button>{/if}
    </div>
</div></div>
{/if}


<style>
    .users-page { padding: 24px; max-width: 1600px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .page-header h1 { font-size: 32px; font-weight: 700; color: var(--theme-text); margin-bottom: 4px; }
    .subtitle { font-size: 15px; color: var(--theme-text-secondary); }
    .header-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 10px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); padding: 10px 14px; flex: 1; max-width: 400px; }
    .search-box input { border: none; background: none; outline: none; flex: 1; font-size: 14px; color: var(--theme-text); }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; }
    .filter-select { padding: 10px 14px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); font-size: 14px; cursor: pointer; color: var(--theme-text); }
    .toolbar-btn { display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: var(--theme-card-bg); border: 1px solid var(--theme-border); border-radius: var(--apple-radius-md); font-size: 14px; color: var(--theme-text-secondary); cursor: pointer; }
    .table-container { overflow-x: auto; }
    .loading-state, .empty-state { text-align: center; padding: 60px 20px; color: var(--theme-text-secondary); }
    .loading-state p, .empty-state p { margin-top: 12px; }
    .chk { width: 40px; text-align: center; }
    .chk input { width: 16px; height: 16px; cursor: pointer; }
    tr.selected { background: rgba(0, 122, 255, 0.05); }
    .user-cell { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--apple-accent), #5856D6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; }
    .user-info { display: flex; flex-direction: column; }
    .name { font-size: 14px; font-weight: 600; color: var(--theme-text); }
    .email { font-size: 12px; color: var(--theme-text-secondary); }
    .did { font-size: 11px; padding: 4px 8px; background: var(--theme-border-light); border-radius: 4px; font-family: monospace; }
    .role-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .role-badge.student { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .role-badge.staff { background: rgba(175, 82, 222, 0.1); color: var(--apple-purple); }
    .dept { display: flex; flex-direction: column; }
    .sub { font-size: 11px; color: var(--theme-text-secondary); }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-badge.active { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .status-badge.inactive { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .actions { display: flex; gap: 6px; }
    .icon-btn { width: 30px; height: 30px; border-radius: var(--apple-radius-sm); background: var(--theme-border-light); border: none; display: flex; align-items: center; justify-content: center; color: var(--theme-text-secondary); cursor: pointer; }
    .icon-btn:hover { background: var(--theme-border); color: var(--theme-text); }
    .icon-btn.danger:hover { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-top: 1px solid var(--theme-border-light); margin-top: 16px; font-size: 13px; color: var(--theme-text-secondary); }
    .pg-ctrl { display: flex; align-items: center; gap: 12px; }
    .pg-btn { width: 32px; height: 32px; border-radius: var(--apple-radius-sm); background: var(--theme-border-light); border: none; display: flex; align-items: center; justify-content: center; color: var(--theme-text-secondary); cursor: pointer; }
    .pg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .modal { width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal.small { max-width: 450px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h2 { font-size: 20px; font-weight: 600; }
    .close-btn { background: none; border: none; color: var(--theme-text-secondary); cursor: pointer; }
    .error-alert { display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(255, 59, 48, 0.1); border-radius: var(--apple-radius-md); color: var(--apple-red); font-size: 14px; margin-bottom: 16px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; }
    .modal-body.center { text-align: center; align-items: center; }
    .form-group { display: flex; flex-direction: column; flex: 1; }
    .form-group label { font-size: 13px; font-weight: 500; color: var(--theme-text-secondary); margin-bottom: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--theme-border-light); }
    .apple-btn-primary.danger { background: var(--apple-red); }
    .warning { color: var(--apple-red); font-size: 13px; margin-top: 8px; }
    .success-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(52, 199, 89, 0.1); display: flex; align-items: center; justify-content: center; color: var(--apple-green); margin-bottom: 16px; }
    .code-box { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--theme-border-light); border-radius: var(--apple-radius-md); margin: 16px 0; }
    .code-box code { font-family: monospace; font-size: 14px; flex: 1; word-break: break-all; }
    .copy-btn { background: none; border: none; color: var(--apple-accent); cursor: pointer; }
    .hint { font-size: 13px; color: var(--theme-text-secondary); }
    .role-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .role-btn { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: var(--apple-radius-md); border: none; cursor: pointer; font-size: 14px; font-weight: 500; }
    .role-btn.promote { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .role-btn.demote { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .upload-area { position: relative; }
    .upload-area input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .upload-label { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; border: 2px dashed var(--theme-border); border-radius: var(--apple-radius-md); color: var(--theme-text-secondary); cursor: pointer; }
    .upload-label:hover { border-color: var(--apple-accent); color: var(--apple-accent); }
    .csv-preview { margin-top: 20px; }
    .csv-preview h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .preview-table { width: 100%; font-size: 12px; border-collapse: collapse; }
    .preview-table th, .preview-table td { padding: 8px; border: 1px solid var(--theme-border-light); text-align: left; }
    .bulk-options { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
    .radio-opt { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: var(--apple-radius-md); background: var(--theme-border-light); cursor: pointer; }
    .radio-opt input { width: 16px; height: 16px; }
    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
