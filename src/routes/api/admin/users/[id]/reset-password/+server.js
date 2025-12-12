// src/routes/api/admin/users/[id]/reset-password/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, PERMISSIONS } from '$lib/server/adminAuth.js';
import { resetUserPassword, generateRandomPassword } from '$lib/server/userManagement.js';

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
        
        const body = await request.json().catch(() => ({}));
        const newPassword = body.password || generateRandomPassword();
        
        await resetUserPassword(params.id, newPassword, admin.id);
        
        return json({ 
            success: true, 
            temporaryPassword: body.password ? undefined : newPassword 
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return json({ error: error.message || 'Failed to reset password' }, { status: 500 });
    }
}
