<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { IconX, IconSpeakerphone, IconUserPlus, IconQrcode, IconSend, IconLoader2 } from '@tabler/icons-svelte';

    export let showModal = false;
    export let modalType = ''; // 'announcement', 'addUser', 'manualScan'

    const dispatch = createEventDispatcher();

    let isSubmitting = false;

    // Announcement form
    let announcementData = {
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all'
    };

    // Add User form
    let userData = {
        name: '',
        email: '',
        studentId: '',
        department: '',
        role: 'student'
    };

    // Manual Scan form
    let scanData = {
        studentId: '',
        scanType: 'check_in',
        notes: ''
    };

    function closeModal() {
        showModal = false;
        resetForms();
        dispatch('close');
    }

    function resetForms() {
        announcementData = { title: '', content: '', priority: 'normal', targetAudience: 'all' };
        userData = { name: '', email: '', studentId: '', department: '', role: 'student' };
        scanData = { studentId: '', scanType: 'check_in', notes: '' };
    }

    async function handleSubmit() {
        isSubmitting = true;
        try {
            let data;
            switch (modalType) {
                case 'announcement':
                    data = announcementData;
                    break;
                case 'addUser':
                    data = userData;
                    break;
                case 'manualScan':
                    data = scanData;
                    break;
            }
            dispatch('submit', { type: modalType, data });
            closeModal();
        } finally {
            isSubmitting = false;
        }
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') closeModal();
    }

    $: modalTitle = {
        announcement: 'Create Announcement',
        addUser: 'Add New User',
        manualScan: 'Manual Scan Entry'
    }[modalType] || '';

    $: modalIcon = {
        announcement: IconSpeakerphone,
        addUser: IconUserPlus,
        manualScan: IconQrcode
    }[modalType] || IconSpeakerphone;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
    <div class="modal-overlay" transition:fade={{ duration: 200 }} on:click={closeModal} on:keydown={handleKeydown} role="button" tabindex="-1">
        <div class="modal-container" transition:fly={{ y: 20, duration: 300 }} on:click|stopPropagation role="dialog" aria-modal="true">
            <div class="modal-header">
                <div class="header-title">
                    <svelte:component this={modalIcon} size={20} stroke={1.5} />
                    <h2>{modalTitle}</h2>
                </div>
                <button class="close-btn" on:click={closeModal}>
                    <IconX size={20} stroke={1.5} />
                </button>
            </div>

            <div class="modal-body">
                {#if modalType === 'announcement'}
                    <div class="form-group">
                        <label for="ann-title">Title</label>
                        <input 
                            id="ann-title"
                            type="text" 
                            bind:value={announcementData.title}
                            placeholder="Announcement title"
                            class="form-input"
                        />
                    </div>
                    <div class="form-group">
                        <label for="ann-content">Content</label>
                        <textarea 
                            id="ann-content"
                            bind:value={announcementData.content}
                            placeholder="Write your announcement..."
                            class="form-textarea"
                            rows="4"
                        ></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="ann-priority">Priority</label>
                            <select id="ann-priority" bind:value={announcementData.priority} class="form-select">
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ann-audience">Target Audience</label>
                            <select id="ann-audience" bind:value={announcementData.targetAudience} class="form-select">
                                <option value="all">All Users</option>
                                <option value="students">Students Only</option>
                                <option value="staff">Staff Only</option>
                                <option value="cict">CICT Department</option>
                                <option value="education">Education Department</option>
                            </select>
                        </div>
                    </div>

                {:else if modalType === 'addUser'}
                    <div class="form-row">
                        <div class="form-group">
                            <label for="user-name">Full Name</label>
                            <input 
                                id="user-name"
                                type="text" 
                                bind:value={userData.name}
                                placeholder="John Doe"
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label for="user-email">Email</label>
                            <input 
                                id="user-email"
                                type="email" 
                                bind:value={userData.email}
                                placeholder="john@example.com"
                                class="form-input"
                            />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="user-id">Student/Staff ID</label>
                            <input 
                                id="user-id"
                                type="text" 
                                bind:value={userData.studentId}
                                placeholder="2024-00001"
                                class="form-input"
                            />
                        </div>
                        <div class="form-group">
                            <label for="user-dept">Department</label>
                            <select id="user-dept" bind:value={userData.department} class="form-select">
                                <option value="">Select Department</option>
                                <option value="cict">CICT</option>
                                <option value="education">Education</option>
                                <option value="business">Business</option>
                                <option value="hospitality">Hospitality</option>
                                <option value="engineering">Engineering</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="user-role">Role</label>
                        <select id="user-role" bind:value={userData.role} class="form-select">
                            <option value="student">Student</option>
                            <option value="staff">Staff</option>
                            <option value="faculty">Faculty</option>
                        </select>
                    </div>

                {:else if modalType === 'manualScan'}
                    <div class="form-group">
                        <label for="scan-id">Student/Staff ID</label>
                        <input 
                            id="scan-id"
                            type="text" 
                            bind:value={scanData.studentId}
                            placeholder="Enter ID or scan QR"
                            class="form-input"
                        />
                    </div>
                    <div class="form-group">
                        <label for="scan-type">Scan Type</label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" bind:group={scanData.scanType} value="check_in" />
                                <span class="radio-label">Check In</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" bind:group={scanData.scanType} value="check_out" />
                                <span class="radio-label">Check Out</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="scan-notes">Notes (Optional)</label>
                        <textarea 
                            id="scan-notes"
                            bind:value={scanData.notes}
                            placeholder="Add any notes..."
                            class="form-textarea"
                            rows="2"
                        ></textarea>
                    </div>
                {/if}
            </div>

            <div class="modal-footer">
                <button class="btn-secondary" on:click={closeModal}>Cancel</button>
                <button class="btn-primary" on:click={handleSubmit} disabled={isSubmitting}>
                    {#if isSubmitting}
                        <IconLoader2 size={16} stroke={2} class="spin" />
                        Processing...
                    {:else}
                        <IconSend size={16} stroke={1.5} />
                        Submit
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    }

    .modal-container {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-xl);
        box-shadow: var(--apple-shadow-lg);
        width: 100%;
        max-width: 520px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--apple-accent);
    }

    .header-title h2 {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .close-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .close-btn:hover {
        background: var(--apple-red);
        color: white;
    }

    .modal-body {
        padding: 24px;
        overflow-y: auto;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        margin-bottom: 8px;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .form-input,
    .form-select,
    .form-textarea {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid var(--theme-border, var(--apple-gray-4));
        border-radius: var(--apple-radius-md);
        font-size: 14px;
        background: var(--theme-card-bg, var(--apple-white));
        color: var(--theme-text, var(--apple-black));
        transition: var(--apple-transition);
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
        outline: none;
        border-color: var(--apple-accent);
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
    }

    .form-textarea {
        resize: vertical;
        min-height: 80px;
    }

    .radio-group {
        display: flex;
        gap: 16px;
    }

    .radio-option {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    .radio-option input {
        width: 18px;
        height: 18px;
        accent-color: var(--apple-accent);
    }

    .radio-label {
        font-size: 14px;
        color: var(--theme-text, var(--apple-black));
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid var(--theme-border-light, var(--apple-gray-5));
        background: var(--theme-border-light, var(--apple-gray-6));
    }

    .btn-secondary,
    .btn-primary {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: var(--apple-radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .btn-secondary {
        background: var(--theme-card-bg, var(--apple-white));
        border: 1px solid var(--theme-border, var(--apple-gray-4));
        color: var(--theme-text, var(--apple-black));
    }

    .btn-secondary:hover {
        background: var(--theme-border-light, var(--apple-gray-5));
    }

    .btn-primary {
        background: var(--apple-accent);
        border: none;
        color: white;
    }

    .btn-primary:hover {
        background: var(--apple-accent-hover);
    }

    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    :global(.spin) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
        .modal-overlay {
            padding: 12px;
            align-items: flex-end;
        }

        .modal-container {
            max-height: 85vh;
            border-radius: var(--apple-radius-xl) var(--apple-radius-xl) 0 0;
        }

        .modal-header {
            padding: 16px 18px;
        }

        .header-title h2 {
            font-size: 16px;
        }

        .modal-body {
            padding: 18px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-group label {
            font-size: 12px;
            margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
            padding: 10px 12px;
            font-size: 14px;
        }

        .modal-footer {
            padding: 14px 18px;
        }
    }

    @media (max-width: 480px) {
        .form-row {
            grid-template-columns: 1fr;
            gap: 12px;
        }

        .modal-footer {
            flex-direction: column;
        }

        .btn-secondary,
        .btn-primary {
            width: 100%;
            justify-content: center;
        }

        .radio-group {
            flex-direction: column;
            gap: 10px;
        }
    }
</style>
