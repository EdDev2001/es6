// Google OAuth Disconnect
import { json } from '@sveltejs/kit';
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
        
        // Get current token to revoke it
        const snapshot = await tokenRef.get();
        if (snapshot.exists()) {
            const tokenData = snapshot.val();
            
            // Revoke token with Google (optional but recommended)
            if (tokenData.access_token) {
                try {
                    await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`, {
                        method: 'POST'
                    });
                } catch (e) {
                    // Ignore revoke errors
                }
            }
        }
        
        // Remove from database
        await tokenRef.remove();
        
        return json({ success: true });
        
    } catch (error) {
        console.error('Disconnect error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
