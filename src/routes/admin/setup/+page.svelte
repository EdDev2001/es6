<script>
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { IconShield, IconMail, IconLock, IconUser, IconLoader2, IconAlertCircle, IconCheck } from "@tabler/icons-svelte";

    let name = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
    let error = '';
    let success = false;
    let isLoading = false;
    let isChecking = true;
    let setupRequired = true;

    onMount(async () => {
        if (browser) {
            try {
                const response = await fetch('/api/admin/setup');
                const data = await response.json();
                setupRequired = data.setupRequired;
                
                if (!setupRequired) {
                    goto('/admin/login');
                }
            } catch (e) {
                console.error('Setup check failed:', e);
            }
            isChecking = false;
        }
    });

    async function handleSetup() {
        error = '';
        
        if (!name || !email || !password || !confirmPassword) {
            error = 'Please fill in all fields';
            return;
        }
        
        if (password !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }
        
        if (password.length < 8) {
            error = 'Password must be at least 8 characters';
            return;
        }

        isLoading = true;

        try {
            const response = await fetch('/api/admin/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Setup failed');
            }

            success = true;
            setTimeout(() => goto('/admin/login'), 2000);
        } catch (err) {
            error = err.message;
        } finally {
            isLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Admin Setup | Attendance System</title>
</svelte:head>

{#if isChecking}
    <div class="setup-container">
        <div class="loading-content">
            <div class="apple-spinner"></div>
            <p>Checking setup status...</p>
        </div>
    </div>
{:else if !setupRequired}
    <div class="setup-container">
        <div class="loading-content">
            <IconCheck size={48} stroke={1.5} style="color: var(--apple-green)" />
            <p>Setup already completed. Redirecting...</p>
        </div>
    </div>
{:else if success}
    <div class="setup-container">
        <div class="success-content apple-card">
            <div class="success-icon">
                <IconCheck size={32} stroke={2} />
            </div>
            <h1>Setup Complete!</h1>
            <p>Your super admin account has been created.</p>
            <p class="redirect-text">Redirecting to login...</p>
        </div>
    </div>
{:else}
    <div class="setup-container">
        <div class="setup-card apple-card">
            <div class="setup-header">
                <div class="setup-icon">
                    <IconShield size={32} stroke={1.5} />
                </div>
                <h1>Admin Setup</h1>
                <p class="setup-subtitle">Create your super admin account to get started</p>
            </div>

            {#if error}
                <div class="error-alert">
                    <IconAlertCircle size={18} stroke={2} />
                    <span>{error}</span>
                </div>
            {/if}

            <div class="setup-form">
                <div class="form-group">
                    <label class="apple-label" for="name">Full Name</label>
                    <div class="input-wrapper">
                        <IconUser size={20} stroke={1.5} class="input-icon" />
                        <input type="text" id="name" class="apple-input with-icon" placeholder="Your name" bind:value={name} />
                    </div>
                </div>

                <div class="form-group">
                    <label class="apple-label" for="email">Email</label>
                    <div class="input-wrapper">
                        <IconMail size={20} stroke={1.5} class="input-icon" />
                        <input type="email" id="email" class="apple-input with-icon" placeholder="admin@example.com" bind:value={email} />
                    </div>
                </div>

                <div class="form-group">
                    <label class="apple-label" for="password">Password</label>
                    <div class="input-wrapper">
                        <IconLock size={20} stroke={1.5} class="input-icon" />
                        <input type="password" id="password" class="apple-input with-icon" placeholder="Min 8 characters" bind:value={password} />
                    </div>
                </div>

                <div class="form-group">
                    <label class="apple-label" for="confirmPassword">Confirm Password</label>
                    <div class="input-wrapper">
                        <IconLock size={20} stroke={1.5} class="input-icon" />
                        <input type="password" id="confirmPassword" class="apple-input with-icon" placeholder="Confirm password" bind:value={confirmPassword} />
                    </div>
                </div>

                <button class="apple-btn-primary setup-btn" on:click={handleSetup} disabled={isLoading}>
                    {#if isLoading}
                        <IconLoader2 size={20} stroke={2} class="spin" />
                        Creating Account...
                    {:else}
                        Create Super Admin
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .setup-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--theme-bg, var(--apple-light-bg)); }
    .loading-content { text-align: center; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .loading-content p { margin-top: 16px; font-size: 15px; }
    
    .setup-card { width: 100%; max-width: 440px; padding: 40px; }
    .setup-header { text-align: center; margin-bottom: 32px; }
    .setup-icon { width: 64px; height: 64px; border-radius: var(--apple-radius-lg); background: linear-gradient(135deg, var(--apple-accent), #5856D6); display: flex; align-items: center; justify-content: center; color: white; margin: 0 auto 20px; }
    .setup-header h1 { font-size: 28px; font-weight: 700; color: var(--theme-text, var(--apple-black)); margin-bottom: 8px; }
    .setup-subtitle { font-size: 15px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    
    .error-alert { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); border-radius: var(--apple-radius-md); color: var(--apple-red); font-size: 14px; margin-bottom: 24px; }
    
    .setup-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; }
    .input-wrapper { position: relative; }
    .input-wrapper :global(.input-icon) { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--theme-text-secondary, var(--apple-gray-1)); pointer-events: none; }
    .apple-input.with-icon { padding-left: 44px; }
    .setup-btn { width: 100%; margin-top: 8px; }
    
    .success-content { text-align: center; padding: 48px 40px; max-width: 400px; }
    .success-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(52, 199, 89, 0.1); display: flex; align-items: center; justify-content: center; color: var(--apple-green); margin: 0 auto 20px; }
    .success-content h1 { font-size: 24px; font-weight: 700; color: var(--theme-text, var(--apple-black)); margin-bottom: 8px; }
    .success-content p { font-size: 15px; color: var(--theme-text-secondary, var(--apple-gray-1)); }
    .redirect-text { margin-top: 16px; font-size: 13px; }
    
    :global(.spin) { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
