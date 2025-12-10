// Slack OAuth Disconnect
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
        await adminDb.ref(`oauth_tokens/${userId}/slack`).remove();
        
        return json({ success: true });
        
    } catch (error) {
        console.error('Disconnect error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
