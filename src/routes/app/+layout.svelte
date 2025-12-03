<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { auth, getUserProfile } from "$lib/firebase";
    import { IconClockPin, IconListDetails, IconHome } from "@tabler/icons-svelte";

    let user = null;
    let userProfile = null;
    let isCheckingAuth = true;

    onMount(() => {
        console.log("🎬 App layout mounted");
        
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            console.log("🔐 Auth state changed:", u?.email || "No user");
            
            if (!u) {
                console.log("❌ No user, redirecting to login");
                goto('/');
                return;
            }
            
            user = u;
            
            // Check if user has completed their profile
            try {
                userProfile = await getUserProfile(u.uid);
                console.log("👤 Profile status:", userProfile ? "Found" : "Not found");
                
                if (!userProfile) {
                    console.log("📝 No profile, redirecting to complete setup");
                    goto('/');
                    return;
                }
            } catch (error) {
                console.error("❌ Error loading profile:", error);
            }
            
            isCheckingAuth = false;
        });

        return unsubscribe;
    });

    async function handleLogout() {
        try {
            await auth.signOut();
            console.log("👋 Logged out");
            goto('/');
        } catch (err) {
            console.error("Logout error:", err);
            alert("Logout failed");
        }
    }

    // Sidebar links
    const navLinks = [
        { href: '/app/dashboard', icon: IconHome, label: 'Dashboard' },
        { href: '/app/attendance', icon: IconClockPin, label: 'Attendance Check-in' },
        { href: '/app/history', icon: IconListDetails, label: 'Attendance History' },
        { href: '/app/profile', icon: IconListDetails, label: 'User Profile' }
    ];

    function isActive(href) {
        return $page.url.pathname === href;
    }
</script>

{#if isCheckingAuth}
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
        <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Loading...</p>
        </div>
    </div>
{:else if user && userProfile}
    <div class="flex h-screen bg-gray-100">
        <aside class="w-64 bg-white shadow-xl flex flex-col">
            <div class="p-6 text-xl font-bold text-indigo-700 border-b">
                Attendance System
            </div>

            <!-- USER INFO -->
            <div class="p-4 border-b">
                <div class="flex items-center gap-3">
                    {#if user.photoURL}
                        <img src={user.photoURL} class="w-10 h-10 rounded-full" alt="User" />
                    {:else}
                        <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                            {userProfile.name?.charAt(0) || 'U'}
                        </div>
                    {/if}
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold truncate">{userProfile.name}</p>
                        <p class="text-xs text-gray-500 truncate">{userProfile.departmentOrCourse}</p>
                    </div>
                </div>
            </div>

            <!-- Sidebar Links -->
            <nav class="flex-grow p-4 space-y-2">
                {#each navLinks as link}
                    
                     <a   href={link.href}
                        class="flex items-center p-3 rounded-lg transition duration-150"
                        class:bg-indigo-50={isActive(link.href)}
                        class:text-indigo-700={isActive(link.href)}
                        class:font-semibold={isActive(link.href)}
                        class:text-gray-600={!isActive(link.href)}
                        class:hover:bg-indigo-100={!isActive(link.href)}
                    >
                        <svelte:component this={link.icon} class="w-5 h-5 mr-3" />
                        <span>{link.label}</span>
                    </a>
                {/each}
            </nav>

            <div class="p-4 border-t">
                <button 
                    class="w-full bg-gray-500 hover:bg-gray-600 text-white p-2 rounded transition duration-200"
                    on:click={handleLogout}
                >
                    Logout
                </button>
            </div>
        </aside>

        <main class="flex-grow overflow-y-auto">
            <slot />
        </main>
    </div>
{/if}