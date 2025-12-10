// Zoom OAuth Token Refresh
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
const ZOOM_CLIENT_ID = env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = env.ZOOM_CLIENT_SECRET;
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

function getAdminDb() {
    if (getApps().length === 0) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
        initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL
        });
    }
    return getDatabase();
}

export async function POST({ request }) {
    try {
        const { userId } = await request.json();
        
        if (!userId) {
            return json({ error: 'Missing userId' }, { status: 400 });
        }
        
        const adminDb = getAdminDb();
        const tokenRef = adminDb.ref(`oauth_tokens/${userId}/zoom`);
        const snapshot = await tokenRef.get();
        
        if (!snapshot.exists()) {
            return json({ error: 'No tokens found' }, { status: 404 });
        }
        
        const tokenData = snapshot.val();
        
        if (!tokenData.refresh_token) {
            return json({ error: 'No refresh token' }, { status: 400 });
        }
        
        const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
        
        const response = await fetch('https://zoom.us/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                refresh_token: tokenData.refresh_token,
                grant_type: 'refresh_token'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            return json({ error: error.reason || 'Refresh failed' }, { status: 400 });
        }
        
        const newTokens = await response.json();
        
        await tokenRef.update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: Date.now() + (newTokens.expires_in * 1000)
        });
        
        return json({ success: true, expires_at: Date.now() + (newTokens.expires_in * 1000) });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
