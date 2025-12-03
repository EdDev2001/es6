// src/routes/api/session/+server.js
import { json } from '@sveltejs/kit';
import { adminAuth } from '$lib/server/firebase-admin';
import { dev } from '$app/environment';

const SESSION_COOKIE_NAME = '__session';
const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
    const { idToken } = await request.json();

    if (!idToken) {
        return json({ status: 'error', message: 'ID Token required' }, { status: 400 });
    }

    try {
        // Create the session cookie using the Admin SDK
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        
        // Set the secure, HTTP-only cookie
        cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: !dev, // Use secure cookies in production
            path: '/',
            sameSite: 'strict',
        });

        return json({ status: 'success' });
    } catch (error) {
        console.error("Error creating session cookie:", error);
        return json({ status: 'error', message: 'Failed to create session cookie' }, { status: 500 });
    }
}