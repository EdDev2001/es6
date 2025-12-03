// src/hooks.server.js
import { redirect} from '@sveltejs/kit';
import { adminAuth } from '$lib/server/firebase-admin'; 


const SESSION_COOKIE_NAME = '__session';

/** @type {Handle} */
export const handle = async ({ event, resolve }) => {
    // 1. Get the session cookie from the incoming request
    const sessionCookie = event.cookies.get(SESSION_COOKIE_NAME);
    let userId = null;

    if (sessionCookie) {
        try {
            // 2. Verify the session cookie using the Firebase Admin SDK
            const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
            userId = decodedClaims.uid;
        } catch (error) {
            // Token is expired, revoked, or invalid. Clear the cookie and proceed unauthenticated.
            console.warn("Invalid or expired session cookie:", error.code);
            event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
        }
    }

    // 3. Populate event.locals.userId
    event.locals.userId = userId;

    // 4. Authentication Guard for Protected Routes
    const protectedRoutes = ['/app/dashboard']; // Any route starting with /app/dashboard

    if (protectedRoutes.some(route => event.url.pathname.startsWith(route))) {
        // If they are on a protected route but not authenticated, redirect them to login
        if (!userId) {
            throw redirect(302, '/'); // Redirect to your login page
        }
    }


    return resolve(event);
};