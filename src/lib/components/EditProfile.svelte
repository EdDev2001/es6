<script>
    import { db, USER_PROFILE_PATH } from "$lib/firebase";
    import { ref, get, update } from "firebase/database";
    import { IconUser, IconCheck, IconAlertTriangle } from "@tabler/icons-svelte";

    export let user;

    let loading = false;
    let saving = false;
    let saveSuccess = false;
    let saveError = "";
    let formData = { name: "", year: "", departmentOrCourse: "", section: "" };

    $: if (user) { loadProfile(); } 
    else { formData = { name: "", year: "", departmentOrCourse: "", section: "" }; }

    async function loadProfile() {
        loading = true;
        saveError = "";
        saveSuccess = false;
        try {
            const path = `${USER_PROFILE_PATH}/${user.uid}`;
            const userRef = ref(db, path);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                formData = {
                    name: data.name || user.displayName || "",
                    year: data.year || "",
                    departmentOrCourse: data.departmentOrCourse || "",
                    section: data.section || ""
                };
            } else {
                formData = { name: user.displayName || "", year: "", departmentOrCourse: "", section: "" };
            }
        } catch (e) {
            console.error("Error loading profile:", e);
            saveError = "Failed to load profile.";
        }
        loading = false;
    }

    async function updateProfile() {
        if (!user || saving) return;
        saveError = "";
        saveSuccess = false;
        saving = true;
        try {
            if (!formData.name || !formData.year || !formData.departmentOrCourse || !formData.section) {
                throw new Error("All fields are required.");
            }
            const userRef = ref(db, `${USER_PROFILE_PATH}/${user.uid}`);
            await update(userRef, formData);
            saveSuccess = true;
            setTimeout(() => saveSuccess = false, 3000);
        } catch (e) {
            console.error(e);
            saveError = e.message;
        }
        saving = false;
    }
</script>

<div class="edit-profile-card apple-animate-in">
    <div class="card-header">
        <div class="header-icon"><IconUser size={24} stroke={1.5} /></div>
        <h1 class="card-title">Edit Profile</h1>
    </div>

    {#if loading}
        <div class="loading-state">
            <div class="apple-spinner"></div>
            <p>Loading user details...</p>
        </div>
    {:else}
        {#if saveSuccess}
            <div class="alert alert-success apple-animate-in">
                <IconCheck size={18} stroke={2} />
                <span>Profile updated successfully!</span>
            </div>
        {/if}

        {#if saveError}
            <div class="alert alert-error apple-animate-in">
                <IconAlertTriangle size={18} stroke={2} />
                <span>{saveError}</span>
            </div>
        {/if}

        <form on:submit|preventDefault={updateProfile} class="profile-form">
            <div class="form-group">
                <label for="name" class="form-label">Full Name</label>
                <input id="name" type="text" class="form-input" bind:value={formData.name} required />
            </div>

            <div class="form-group">
                <label for="year" class="form-label">Year / Level</label>
                <input id="year" type="text" class="form-input" bind:value={formData.year} required />
            </div>

            <div class="form-group">
                <label for="course" class="form-label">Department or Course</label>
                <input id="course" type="text" class="form-input" bind:value={formData.departmentOrCourse} required />
            </div>

            <div class="form-group">
                <label for="section" class="form-label">Section</label>
                <input id="section" type="text" class="form-input" bind:value={formData.section} required />
            </div>

            <button type="submit" class="submit-btn" disabled={saving}>
                {#if saving}
                    <div class="btn-spinner"></div>
                    <span>Saving...</span>
                {:else}
                    <IconCheck size={18} stroke={2} />
                    <span>Update Profile</span>
                {/if}
            </button>
        </form>
    {/if}
</div>

<style>
    .edit-profile-card { width: 100%; max-width: 560px; margin: 0 auto; background: var(--apple-white); border-radius: var(--apple-radius-xl); box-shadow: var(--apple-shadow-md); padding: clamp(24px, 5vw, 36px); }
    .card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--apple-gray-5); }
    .header-icon { width: 48px; height: 48px; border-radius: 14px; background: rgba(0, 122, 255, 0.1); display: flex; align-items: center; justify-content: center; color: var(--apple-accent); }
    .card-title { font-size: 24px; font-weight: 700; color: var(--apple-black); }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; color: var(--apple-gray-1); font-size: 15px; }
    .alert { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: var(--apple-radius-md); margin-bottom: 20px; font-size: 14px; font-weight: 500; }
    .alert-success { background: rgba(52, 199, 89, 0.1); color: #1D7A34; border: 1px solid rgba(52, 199, 89, 0.2); }
    .alert-error { background: rgba(255, 59, 48, 0.1); color: #C41E16; border: 1px solid rgba(255, 59, 48, 0.2); }
    .profile-form { display: flex; flex-direction: column; gap: 18px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 14px; font-weight: 500; color: var(--apple-gray-1); }
    .form-input { width: 100%; padding: 14px 16px; border: 1px solid var(--apple-gray-4); border-radius: var(--apple-radius-md); font-size: 16px; color: var(--apple-black); background: var(--apple-white); transition: var(--apple-transition); }
    .form-input:focus { outline: none; border-color: var(--apple-accent); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15); }
    .submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px 24px; background: var(--apple-accent); color: white; font-size: 16px; font-weight: 600; border: none; border-radius: var(--apple-radius-md); cursor: pointer; transition: var(--apple-transition); margin-top: 8px; }
    .submit-btn:hover:not(:disabled) { background: var(--apple-accent-hover); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 122, 255, 0.3); }
    .submit-btn:disabled { background: var(--apple-gray-3); cursor: not-allowed; }
    .btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
</style>
