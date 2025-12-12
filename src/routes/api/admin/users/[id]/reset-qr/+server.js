// src/routes/api/admin/users/[id]/reset-qr/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, PERMISSIONS } from '$lib/server/adminAuth.js';
import { resetUserQR } from '$lib/server/userManagement.js';

export async function POST({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const result = await resetUserQR(params.id, admin.id);
        
        return json({ success: true, ...result });
    } catch (error) {
        console.error('Reset QR error:', error);
        return json({ error: error.message || 'Failed to reset QR' }, { status: 500 });
    }
}
