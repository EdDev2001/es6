<script>
    import { onMount } from "svelte";
    import { adminAuthStore } from "$lib/stores/adminAuth.js";
    import { 
        IconSpeakerphone, IconPlus, IconEdit, IconTrash, IconLoader2, IconX,
        IconPhoto, IconPaperclip, IconBell, IconMail, IconClock, IconFilter,
        IconAlertTriangle, IconBuilding, IconSchool, IconSend, IconCalendar
    } from "@tabler/icons-svelte";

    let announcements = [];
    let isLoading = true;
    let showModal = false;
    let editingId = null;
    let isSubmitting = false;
    let activeTab = 'all';
    let imagePreview = null;
    let attachmentFile = null;

    let formData = {
        title: '',
        content: '',
        priority: 'normal',
        scope: 'school',
        department: '',
        expiresAt: '',
        scheduledAt: '',
        sendPush: false,
        sendEmail: false,
        imageUrl: '',
        attachments: []
    };

    const scopeOptions = [
        { value: 'school', label: 'School-wide', icon: IconSchool },
        { value: 'department', label: 'Department', icon: IconBuilding },
        { value: 'emergency', label: 'Emergency Alert', icon: IconAlertTriangle }
    ];

    const priorityOptions = [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
    ];

    onMount(async () => {
        await loadAnnouncements();
    });

    async function loadAnnouncements() {
        isLoading = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const response = await fetch('/api/admin/announcements', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                announcements = data.announcements || [];
            }
        } catch (error) {
            console.error('Failed to load announcements:', error);
        } finally {
            isLoading = false;
        }
    }

    function openModal(announcement = null) {
        if (announcement) {
            editingId = announcement.id;
            formData = {
                title: announcement.title || '',
                content: announcement.content || '',
                priority: announcement.priority || 'normal',
                scope: announcement.scope || 'school',
                department: announcement.department || '',
                expiresAt: announcement.expiresAt?.split('T')[0] || '',
                scheduledAt: announcement.scheduledAt?.split('T')[0] || '',
                sendPush: announcement.sendPush || false,
                sendEmail: announcement.sendEmail || false,
                imageUrl: announcement.imageUrl || '',
                attachments: announcement.attachments || []
            };
            imagePreview = announcement.imageUrl || null;
        } else {
            editingId = null;
            formData = {
                title: '', content: '', priority: 'normal', scope: 'school',
                department: '', expiresAt: '', scheduledAt: '',
                sendPush: false, sendEmail: false, imageUrl: '', attachments: []
            };
            imagePreview = null;
        }
        attachmentFile = null;
        showModal = true;
    }

    async function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Preview
        const reader = new FileReader();
        reader.onload = (e) => imagePreview = e.target.result;
        reader.readAsDataURL(file);
        
        // Upload
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const uploadData = new FormData();
            uploadData.append('file', file);
            uploadData.append('type', 'announcement-image');
            
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: uploadData
            });
            
            if (response.ok) {
                const data = await response.json();
                formData.imageUrl = data.url;
            }
        } catch (error) {
            console.error('Image upload failed:', error);
        }
    }

    async function handleAttachmentUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const uploadData = new FormData();
            uploadData.append('file', file);
            uploadData.append('type', 'announcement-attachment');
            
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: uploadData
            });
            
            if (response.ok) {
                const data = await response.json();
                formData.attachments = [...formData.attachments, { name: file.name, url: data.url, size: file.size }];
            }
        } catch (error) {
            console.error('Attachment upload failed:', error);
        }
    }

    function removeAttachment(index) {
        formData.attachments = formData.attachments.filter((_, i) => i !== index);
    }

    async function saveAnnouncement() {
        if (!formData.title || !formData.content) return;
        isSubmitting = true;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/admin/announcements/${editingId}` : '/api/admin/announcements';
            
            const payload = { ...formData };
            if (payload.scheduledAt) {
                payload.status = 'scheduled';
            }
            
            await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            showModal = false;
            await loadAnnouncements();
        } catch (error) {
            console.error('Failed to save announcement:', error);
        } finally {
            isSubmitting = false;
        }
    }

    async function deleteAnnouncement(id) {
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            await fetch(`/api/admin/announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            announcements = announcements.filter(a => a.id !== id);
        } catch (error) {
            console.error('Failed to delete announcement:', error);
        }
    }

    async function publishNow(id) {
        try {
            const { accessToken } = adminAuthStore.getStoredTokens();
            await fetch(`/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published', publishedAt: new Date().toISOString() })
            });
            await loadAnnouncements();
        } catch (error) {
            console.error('Failed to publish:', error);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    $: filteredAnnouncements = announcements.filter(a => {
        if (activeTab === 'all') return true;
        if (activeTab === 'scheduled') return a.status === 'scheduled';
        if (activeTab === 'emergency') return a.scope === 'emergency';
        return a.scope === activeTab;
    });
</script>

<svelte:head>
    <title>Announcements | Admin Panel</title>
</svelte:head>

<div class="announcements-page">
    <header class="page-header">
        <div class="header-content">
            <h1><IconSpeakerphone size={28} stroke={1.5} /> Announcements</h1>
            <p class="header-subtitle">Create and manage system announcements</p>
        </div>
        <button class="apple-btn-primary" on:click={() => openModal()}>
            <IconPlus size={18} stroke={2} /> New Announcement
        </button>
    </header>

    <div class="filter-tabs">
        <button class="tab" class:active={activeTab === 'all'} on:click={() => activeTab = 'all'}>All</button>
        <button class="tab" class:active={activeTab === 'school'} on:click={() => activeTab = 'school'}>
            <IconSchool size={16} /> School-wide
        </button>
        <button class="tab" class:active={activeTab === 'department'} on:click={() => activeTab = 'department'}>
            <IconBuilding size={16} /> Department
        </button>
        <button class="tab" class:active={activeTab === 'emergency'} on:click={() => activeTab = 'emergency'}>
            <IconAlertTriangle size={16} /> Emergency
        </button>
        <button class="tab" class:active={activeTab === 'scheduled'} on:click={() => activeTab = 'scheduled'}>
            <IconClock size={16} /> Scheduled
        </button>
    </div>

    <div class="announcements-list">
        {#if isLoading}
            <div class="loading-state apple-card"><IconLoader2 size={32} stroke={1.5} class="spin" /><p>Loading announcements...</p></div>
        {:else if filteredAnnouncements.length === 0}
            <div class="empty-state apple-card"><IconSpeakerphone size={48} stroke={1.5} /><p>No announcements found</p></div>
        {:else}
            {#each filteredAnnouncements as item}
                <div class="announcement-card apple-card" class:emergency={item.scope === 'emergency'}>
                    <div class="announcement-header">
                        <div class="header-left">
                            <div class="badges">
                                <span class="scope-badge {item.scope}">{item.scope || 'school'}</span>
                                <span class="priority-badge {item.priority || 'normal'}">{item.priority || 'Normal'}</span>
                                {#if item.status === 'scheduled'}
                                    <span class="status-badge scheduled"><IconClock size={12} /> Scheduled</span>
                                {/if}
                            </div>
                            <h3>{item.title}</h3>
                            {#if item.department}
                                <span class="department-tag">{item.department}</span>
                            {/if}
                        </div>
                        <div class="card-actions">
                            {#if item.status === 'scheduled'}
                                <button class="icon-btn publish" on:click={() => publishNow(item.id)} title="Publish Now">
                                    <IconSend size={16} stroke={1.5} />
                                </button>
                            {/if}
                            <button class="icon-btn" on:click={() => openModal(item)}><IconEdit size={16} stroke={1.5} /></button>
                            <button class="icon-btn danger" on:click={() => deleteAnnouncement(item.id)}><IconTrash size={16} stroke={1.5} /></button>
                        </div>
                    </div>
                    
                    {#if item.imageUrl}
                        <div class="announcement-image">
                            <img src={item.imageUrl} alt="Announcement" />
                        </div>
                    {/if}
                    
                    <p class="announcement-content">{item.content}</p>
                    
                    {#if item.attachments?.length > 0}
                        <div class="attachments-list">
                            {#each item.attachments as att}
                                <a href={att.url} target="_blank" class="attachment-chip">
                                    <IconPaperclip size={14} /> {att.name}
                                </a>
                            {/each}
                        </div>
                    {/if}
                    
                    <div class="announcement-footer">
                        <div class="footer-left">
                            <span>Created: {formatDate(item.createdAt)}</span>
                            {#if item.scheduledAt}<span><IconClock size={12} /> Scheduled: {formatDateTime(item.scheduledAt)}</span>{/if}
                            {#if item.expiresAt}<span>Expires: {formatDate(item.expiresAt)}</span>{/if}
                        </div>
                        <div class="notification-icons">
                            {#if item.sendPush}<span class="notif-icon" title="Push notification sent"><IconBell size={14} /></span>{/if}
                            {#if item.sendEmail}<span class="notif-icon" title="Email sent"><IconMail size={14} /></span>{/if}
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>


<!-- Modal -->
{#if showModal}
    <div class="modal-overlay" on:click={() => showModal = false} on:keydown={(e) => e.key === 'Escape' && (showModal = false)} role="dialog" tabindex="-1">
        <div class="modal apple-card" on:click|stopPropagation on:keydown|stopPropagation role="document">
            <div class="modal-header">
                <h2>{editingId ? 'Edit' : 'New'} Announcement</h2>
                <button class="close-btn" on:click={() => showModal = false}><IconX size={20} stroke={1.5} /></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="apple-label">Title *</label>
                    <input type="text" class="apple-input" bind:value={formData.title} placeholder="Announcement title" />
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="apple-label">Scope *</label>
                        <select class="apple-input" bind:value={formData.scope}>
                            {#each scopeOptions as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="apple-label">Priority</label>
                        <select class="apple-input" bind:value={formData.priority}>
                            {#each priorityOptions as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                {#if formData.scope === 'department'}
                    <div class="form-group">
                        <label class="apple-label">Department</label>
                        <input type="text" class="apple-input" bind:value={formData.department} placeholder="e.g., Mathematics, Science" />
                    </div>
                {/if}
                
                <div class="form-group">
                    <label class="apple-label">Content *</label>
                    <textarea class="apple-input" rows="4" bind:value={formData.content} placeholder="Announcement content"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="apple-label">Image (Optional)</label>
                    <div class="upload-area">
                        {#if imagePreview}
                            <div class="image-preview">
                                <img src={imagePreview} alt="Preview" />
                                <button class="remove-image" on:click={() => { imagePreview = null; formData.imageUrl = ''; }}>
                                    <IconX size={16} />
                                </button>
                            </div>
                        {:else}
                            <label class="upload-btn">
                                <IconPhoto size={20} /> Upload Image
                                <input type="file" accept="image/*" on:change={handleImageUpload} hidden />
                            </label>
                        {/if}
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="apple-label">Attachments</label>
                    <div class="attachments-area">
                        {#each formData.attachments as att, i}
                            <div class="attachment-item">
                                <IconPaperclip size={14} /> {att.name}
                                <button class="remove-att" on:click={() => removeAttachment(i)}><IconX size={14} /></button>
                            </div>
                        {/each}
                        <label class="upload-btn small">
                            <IconPaperclip size={16} /> Add Attachment
                            <input type="file" on:change={handleAttachmentUpload} hidden />
                        </label>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="apple-label">Schedule (Optional)</label>
                        <input type="datetime-local" class="apple-input" bind:value={formData.scheduledAt} />
                    </div>
                    <div class="form-group">
                        <label class="apple-label">Expires At (Optional)</label>
                        <input type="date" class="apple-input" bind:value={formData.expiresAt} />
                    </div>
                </div>
                
                <div class="notification-options">
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={formData.sendPush} />
                        <IconBell size={16} /> Send Push Notification
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={formData.sendEmail} />
                        <IconMail size={16} /> Send Email Notification
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="apple-btn-secondary" on:click={() => showModal = false}>Cancel</button>
                <button class="apple-btn-primary" on:click={saveAnnouncement} disabled={isSubmitting || !formData.title || !formData.content}>
                    {#if isSubmitting}Saving...{:else if formData.scheduledAt}Schedule{:else}Publish{/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .announcements-page { padding: 24px; max-width: 1000px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 28px; font-weight: 700; color: var(--theme-text, var(--apple-black)); margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    .header-subtitle { font-size: 15px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    
    .filter-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--theme-card-bg, var(--apple-white)); border: 1px solid var(--theme-border, var(--apple-gray-4)); border-radius: var(--apple-radius-md); font-size: 13px; color: var(--theme-text-secondary); cursor: pointer; transition: all 0.2s; }
    .tab:hover { border-color: var(--apple-accent); }
    .tab.active { background: var(--apple-accent); border-color: var(--apple-accent); color: white; }
    
    .announcements-list { display: flex; flex-direction: column; gap: 16px; }
    .loading-state, .empty-state { text-align: center; padding: 60px 20px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .loading-state p, .empty-state p { margin-top: 12px; font-size: 14px; }
    
    .announcement-card { padding: 20px; }
    .announcement-card.emergency { border-left: 4px solid var(--apple-red); }
    .announcement-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .header-left { flex: 1; }
    .badges { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .announcement-header h3 { font-size: 16px; font-weight: 600; color: var(--theme-text, var(--apple-black)); }
    .department-tag { font-size: 12px; color: var(--theme-text-secondary); margin-top: 4px; display: inline-block; }
    
    .scope-badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .scope-badge.school { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .scope-badge.department { background: rgba(88, 86, 214, 0.1); color: #5856D6; }
    .scope-badge.emergency { background: rgba(255, 59, 48, 0.15); color: var(--apple-red); }
    
    .priority-badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .priority-badge.low { background: rgba(142, 142, 147, 0.1); color: var(--apple-gray-1); }
    .priority-badge.normal { background: rgba(0, 122, 255, 0.1); color: var(--apple-accent); }
    .priority-badge.high { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    .priority-badge.urgent { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    
    .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .status-badge.scheduled { background: rgba(255, 149, 0, 0.1); color: var(--apple-orange); }
    
    .card-actions { display: flex; gap: 8px; }
    .icon-btn { width: 32px; height: 32px; border-radius: var(--apple-radius-sm); background: var(--theme-border-light, var(--apple-gray-6)); border: none; display: flex; align-items: center; justify-content: center; color: var(--theme-text-secondary, var(--apple-gray-1)); cursor: pointer; }
    .icon-btn:hover { background: var(--theme-border, var(--apple-gray-5)); }
    .icon-btn.danger:hover { background: rgba(255, 59, 48, 0.1); color: var(--apple-red); }
    .icon-btn.publish { background: rgba(52, 199, 89, 0.1); color: var(--apple-green); }
    .icon-btn.publish:hover { background: rgba(52, 199, 89, 0.2); }
    
    .announcement-image { margin: 12px 0; border-radius: var(--apple-radius-md); overflow: hidden; }
    .announcement-image img { width: 100%; max-height: 300px; object-fit: cover; }
    
    .announcement-content { font-size: 14px; color: var(--theme-text, var(--apple-black)); line-height: 1.6; }
    
    .attachments-list { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .attachment-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--theme-border-light); border-radius: var(--apple-radius-sm); font-size: 12px; color: var(--theme-text-secondary); text-decoration: none; }
    .attachment-chip:hover { background: var(--theme-border); }
    
    .announcement-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--theme-border-light, var(--apple-gray-5)); }
    .footer-left { display: flex; gap: 16px; font-size: 12px; color: var(--theme-text-secondary, var(--apple-gray-1)); flex-wrap: wrap; }
    .footer-left span { display: flex; align-items: center; gap: 4px; }
    .notification-icons { display: flex; gap: 8px; }
    .notif-icon { color: var(--apple-accent); }
    
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .modal { width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 24px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h2 { font-size: 20px; font-weight: 600; }
    .close-btn { background: none; border: none; color: var(--theme-text-secondary); cursor: pointer; padding: 4px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    
    .upload-area { border: 2px dashed var(--theme-border); border-radius: var(--apple-radius-md); padding: 16px; text-align: center; }
    .upload-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--theme-border-light); border-radius: var(--apple-radius-sm); cursor: pointer; font-size: 14px; color: var(--theme-text-secondary); }
    .upload-btn:hover { background: var(--theme-border); }
    .upload-btn.small { padding: 6px 12px; font-size: 12px; }
    
    .image-preview { position: relative; display: inline-block; }
    .image-preview img { max-width: 100%; max-height: 200px; border-radius: var(--apple-radius-sm); }
    .remove-image { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    
    .attachments-area { display: flex; flex-wrap: wrap; gap: 8px; }
    .attachment-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--theme-border-light); border-radius: var(--apple-radius-sm); font-size: 12px; }
    .remove-att { background: none; border: none; color: var(--apple-red); cursor: pointer; padding: 2px; }
    
    .notification-options { display: flex; gap: 20px; flex-wrap: wrap; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--theme-text); cursor: pointer; }
    .checkbox-label input { width: 18px; height: 18px; accent-color: var(--apple-accent); }
    
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--theme-border-light); }
    
    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    @media (max-width: 600px) {
        .form-row { grid-template-columns: 1fr; }
        .page-header { flex-direction: column; gap: 16px; }
        .filter-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px; }
    }
</style>
