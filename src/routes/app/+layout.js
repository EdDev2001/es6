// src/routes/app/+layout.js

// Disable prerendering for all /app routes
// This prevents Firebase from being initialized during build time
export const prerender = false;

// Optional: Disable SSR if you want purely client-side rendering
// export const ssr = false;

// Optional: Load function for additional data
export async function load({ parent }) {
    // Wait for parent layout data if needed
    await parent();
    
    return {
        // You can return additional data here if needed
    };
}