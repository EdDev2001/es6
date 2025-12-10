// Google OAuth Token Refresh
import { json } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
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
        const tokenRef = adminDb.ref(`oauth_tokens/${userId}/google`);
        const snapshot = await tokenRef.get();
        
        if (!snapshot.exists()) {
            return json({ error: 'No tokens found' }, { status: 404 });
        }
        
        const tokenData = snapshot.val();
        
        if (!tokenData.refresh_token) {
            return json({ error: 'No refresh token' }, { status: 400 });
        }
        
        // Refresh the token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: tokenData.refresh_token,
                grant_type: 'refresh_token'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            return json({ error: error.error_description || 'Refresh failed' }, { status: 400 });
        }
        
        const newTokens = await response.json();
        
        // Update stored tokens
        await tokenRef.update({
            access_token: newTokens.access_token,
            expires_at: Date.now() + (newTokens.expires_in * 1000),
            token_type: newTokens.token_type
        });
        
        return json({ success: true, expires_at: Date.now() + (newTokens.expires_in * 1000) });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
