// Zoom OAuth Disconnect
import { json } from '@sveltejs/kit';
import { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } from '$env/static/private';
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
        
        // Get token to revoke
        const snapshot = await tokenRef.get();
        if (snapshot.exists()) {
            const tokenData = snapshot.val();
            
            // Revoke token with Zoom
            if (tokenData.access_token) {
                try {
                    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
                    await fetch(`https://zoom.us/oauth/revoke?token=${tokenData.access_token}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Basic ${credentials}` }
                    });
                } catch (e) {
                    // Ignore revoke errors
                }
            }
        }
        
        await tokenRef.remove();
        
        return json({ success: true });
        
    } catch (error) {
        console.error('Disconnect error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
