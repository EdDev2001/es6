<script>
    import { page } from '$app/stores';
    import { IconClockPin, IconListDetails } from '@tabler/icons-svelte';

    // Define the navigation links
    const navLinks = [
        {
            href: '/app/dashboard',
            icon: IconClockPin,
            label: 'Attendance Check-in'
        },
        {
            href: '/app/dashboard/attendance',
            icon: IconListDetails,
            label: 'Attendance History'
        }
    ];

    // Function to check if a link is active
   function isActive(href) {
        // If the link is exactly the current path, it's active.
        if ($page.url.pathname === href) {
            return true;
        }
        // If the link is the root dashboard link, check if the path starts with it
        // This makes sure /dashboard is active even on /dashboard/attendance
        if (href === '/dashboard' && $page.url.pathname.startsWith('/dashboard/')) {
            return true;
        }
        return false;
    }
</script>

<div class="flex h-screen bg-gray-100">
    <aside class="w-64 bg-white shadow-xl flex flex-col">
        <div class="p-6 text-xl font-bold text-indigo-700 border-b">
            Dashboard
        </div>
        <nav class="flex-grow p-4 space-y-2">
            {#each navLinks as link}
                <a 
                    href={link.href}
                    class="flex items-center p-3 rounded-lg transition-colors duration-150"
                    class:bg-indigo-50={isActive(link.href)}
                    class:text-indigo-700={isActive(link.href)}
                    class:text-gray-600={!isActive(link.href)}
                    class:hover:bg-indigo-100={!isActive(link.href)}
                >
                    <svelte:component this={link.icon} class="w-5 h-5 mr-3" />
                    <span>{link.label}</span>
                </a>
            {/each}
        </nav>
    </aside>

    <main class="flex-grow overflow-y-auto">
        <slot />
    </main>
</div>