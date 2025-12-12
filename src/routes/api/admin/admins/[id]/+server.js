// src/routes/api/admin/admins/[id]/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, updateAdmin, deleteAdmin, ADMIN_ROLES } from '$lib/server/adminAuth.js';

export async function PUT({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
            return json({ error: 'Forbidden - Super Admin required' }, { status: 403 });
        }
        
        const updates = await request.json();
        await updateAdmin(params.id, updates, admin.id);
        
        return json({ success: true });
    } catch (error) {
        console.error('Update admin error:', error);
        return json({ error: error.message || 'Failed to update admin' }, { status: 500 });
    }
}

export async function DELETE({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
            return json({ error: 'Forbidden - Super Admin required' }, { status: 403 });
        }
        
        // Prevent self-deletion
        if (params.id === admin.id) {
            return json({ error: 'Cannot delete your own account' }, { status: 400 });
        }
        
        await deleteAdmin(params.id, admin.id);
        
        return json({ success: true });
    } catch (error) {
        console.error('Delete admin error:', error);
        return json({ error: error.message || 'Failed to delete admin' }, { status: 500 });
    }
}
