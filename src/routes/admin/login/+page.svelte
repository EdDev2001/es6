<script>
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { adminAuthStore } from "$lib/stores/adminAuth.js";
    import { themeStore } from "$lib/stores/theme.js";
    import { IconShield, IconMail, IconLock, IconLoader2, IconAlertCircle, IconKey } from "@tabler/icons-svelte";

    let email = '';
    let password = '';
    let mfaCode = '';
    let error = '';
    let isLoading = false;
    let mfaRequired = false;
    let mfaSessionToken = '';

    onMount(() => {
        if (browser) {
            themeStore.init();
            // Check if already logged in
            const { accessToken } = adminAuthStore.getStoredTokens();
            if (accessToken) {
                goto('/admin/dashboard');
            }
        }
    });

    async function handleLogin() {
        if (!email || !password) {
            error = 'Please enter email and password';
            return;
        }

        isLoading = true;
        error = '';

        try {
            const response = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            if (data.mfaRequired) {
                mfaRequired = true;
                mfaSessionToken = data.mfaSessionToken;
            } else {
                adminAuthStore.setAdmin(data.admin, {
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    tokenExpiry: data.tokenExpiry
                });
                goto('/admin/dashboard');
            }
        } catch (err) {
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function handleMfaVerify() {
        if (!mfaCode || mfaCode.length !== 6) {
            error = 'Please enter a valid 6-character code';
            return;
        }

        isLoading = true;
        error = '';

        try {
            const response = await fetch('/api/admin/auth/verify-mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mfaSessionToken, code: mfaCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'MFA verification failed');
            }

            adminAuthStore.setAdmin(data.admin, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                tokenExpiry: data.tokenExpiry
            });
            goto('/admin/dashboard');
        } catch (err) {
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            if (mfaRequired) {
                handleMfaVerify();
            } else {
                handleLogin();
            }
        }
    }
</script>

<svelte:head>
    <title>Admin Login | Attendance System</title>
</svelte:head>

<div class="login-container">
    <div class="login-card apple-card">
        <div class="login-header">
            <div class="login-icon">
                <IconShield size={32} stroke={1.5} />
            </div>
            <h1>Admin Portal</h1>
            <p class="login-subtitle">
                {#if mfaRequired}
                    Enter your verification code
                {:else}
                    Sign in to access the admin dashboard
                {/if}
            </p>
        </div>

        {#if error}
            <div class="error-alert">
                <IconAlertCircle size={18} stroke={2} />
                <span>{error}</span>
            </div>
        {/if}

        {#if mfaRequired}
            <!-- MFA Verification Form -->
            <div class="login-form">
                <div class="form-group">
                    <label class="apple-label" for="mfaCode">Verification Code</label>
                    <div class="input-wrapper">
                        <IconKey size={20} stroke={1.5} class="input-icon" />
                        <input
                            type="text"
                            id="mfaCode"
                            class="apple-input with-icon"
                            placeholder="Enter 6-character code"
                            bind:value={mfaCode}
                            on:keydown={handleKeydown}
                            maxlength="6"
                            autocomplete="one-time-code"
                        />
                    </div>
                </div>

                <button 
                    class="apple-btn-primary login-btn" 
                    on:click={handleMfaVerify}
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <IconLoader2 size={20} stroke={2} class="spin" />
                        Verifying...
                    {:else}
                        Verify Code
                    {/if}
                </button>

                <button 
                    class="back-btn"
                    on:click={() => { mfaRequired = false; mfaCode = ''; error = ''; }}
                >
                    Back to login
                </button>
            </div>
        {:else}
            <!-- Login Form -->
            <div class="login-form">
                <div class="form-group">
                    <label class="apple-label" for="email">Email</label>
                    <div class="input-wrapper">
                        <IconMail size={20} stroke={1.5} class="input-icon" />
                        <input
                            type="email"
                            id="email"
                            class="apple-input with-icon"
                            placeholder="admin@example.com"
                            bind:value={email}
                            on:keydown={handleKeydown}
                            autocomplete="email"
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label class="apple-label" for="password">Password</label>
                    <div class="input-wrapper">
                        <IconLock size={20} stroke={1.5} class="input-icon" />
                        <input
                            type="password"
                            id="password"
                            class="apple-input with-icon"
                            placeholder="Enter your password"
                            bind:value={password}
                            on:keydown={handleKeydown}
                            autocomplete="current-password"
                        />
                    </div>
                </div>

                <button 
                    class="apple-btn-primary login-btn" 
                    on:click={handleLogin}
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <IconLoader2 size={20} stroke={2} class="spin" />
                        Signing in...
                    {:else}
                        Sign In
                    {/if}
                </button>
            </div>
        {/if}
    </div>
</div>


<style>
    .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: var(--theme-bg, var(--apple-light-bg));
    }

    .login-card {
        width: 100%;
        max-width: 420px;
        padding: 40px;
    }

    .login-header {
        text-align: center;
        margin-bottom: 32px;
    }

    .login-icon {
        width: 64px;
        height: 64px;
        border-radius: var(--apple-radius-lg);
        background: linear-gradient(135deg, var(--apple-accent), #5856D6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        margin: 0 auto 20px;
    }

    .login-header h1 {
        font-size: 28px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
        margin-bottom: 8px;
    }

    .login-subtitle {
        font-size: 15px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .error-alert {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        background: rgba(255, 59, 48, 0.1);
        border: 1px solid rgba(255, 59, 48, 0.3);
        border-radius: var(--apple-radius-md);
        color: var(--apple-red);
        font-size: 14px;
        margin-bottom: 24px;
    }

    .login-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .input-wrapper {
        position: relative;
    }

    .input-wrapper :global(.input-icon) {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--theme-text-secondary, var(--apple-gray-1));
        pointer-events: none;
    }

    .apple-input.with-icon {
        padding-left: 44px;
    }

    .login-btn {
        width: 100%;
        margin-top: 8px;
    }

    .back-btn {
        background: none;
        border: none;
        color: var(--apple-accent);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        padding: 8px;
        transition: var(--apple-transition);
    }

    .back-btn:hover {
        text-decoration: underline;
    }

    :global(.spin) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
        .login-card {
            padding: 28px 20px;
        }

        .login-header h1 {
            font-size: 24px;
        }
    }
</style>
