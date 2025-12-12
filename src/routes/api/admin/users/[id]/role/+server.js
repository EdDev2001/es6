// src/routes/api/admin/users/[id]/role/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, ADMIN_ROLES } from '$lib/server/adminAuth.js';
import { promoteToAdmin, demoteFromAdmin } from '$lib/server/userManagement.js';

export async function POST({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        // Only super admins can manage roles
        if (!admin || admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
            return json({ error: 'Forbidden - Super Admin required' }, { status: 403 });
        }
        
        const { action, adminRole } = await request.json();
        
        if (action === 'promote') {
            await promoteToAdmin(params.id, adminRole || 'admin', admin.id);
        } else if (action === 'demote') {
            await demoteFromAdmin(params.id, admin.id);
        } else {
            return json({ error: 'Invalid action' }, { status: 400 });
        }
        
        return json({ success: true });
    } catch (error) {
        console.error('Role change error:', error);
        return json({ error: error.message || 'Failed to change role' }, { status: 500 });
    }
}
