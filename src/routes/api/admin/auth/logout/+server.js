// src/routes/api/admin/auth/logout/+server.js
import { json } from '@sveltejs/kit';
import { adminLogout, logAuditEvent, verifyAccessToken } from '$lib/server/adminAuth.js';

export async function POST({ request }) {
    try {
        const authHeader = request.headers.get('Authorization');
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const { refreshToken } = await request.json();
        
        // Get admin info for audit log
        if (accessToken) {
            const admin = await verifyAccessToken(accessToken);
            if (admin) {
                await logAuditEvent({
                    action: 'LOGOUT',
                    adminId: admin.id,
                    details: {}
                });
            }
        }
        
        await adminLogout(accessToken, refreshToken);
        
        return json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return json({ success: true }); // Always return success for logout
    }
}
