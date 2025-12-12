// src/routes/api/admin/auth/verify-mfa/+server.js
import { json } from '@sveltejs/kit';
import { verifyMfaCode } from '$lib/server/adminAuth.js';

export async function POST({ request, getClientAddress }) {
    try {
        const { mfaSessionToken, code } = await request.json();
        
        if (!mfaSessionToken || !code) {
            return json({ error: 'MFA session token and code are required' }, { status: 400 });
        }
        
        const ipAddress = getClientAddress();
        const result = await verifyMfaCode(mfaSessionToken, code, ipAddress);
        
        return json(result);
    } catch (error) {
        console.error('MFA verification error:', error);
        return json({ error: error.message || 'MFA verification failed' }, { status: 401 });
    }
}
