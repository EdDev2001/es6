// src/routes/api/admin/admins/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, getAllAdmins, createAdmin, PERMISSIONS, ADMIN_ROLES } from '$lib/server/adminAuth.js';

export async function GET({ request }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_SECURITY)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const admins = await getAllAdmins();
        return json({ admins });
    } catch (error) {
        console.error('Get admins error:', error);
        return json({ error: 'Failed to fetch admins' }, { status: 500 });
    }
}

export async function POST({ request, getClientAddress }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        // Only super admins can create new admins
        if (!admin || admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
            return json({ error: 'Forbidden - Super Admin required' }, { status: 403 });
        }
        
        const data = await request.json();
        const ipAddress = getClientAddress();
        
        const newAdmin = await createAdmin({
            ...data,
            ipAddress
        });
        
        return json({ admin: newAdmin });
    } catch (error) {
        console.error('Create admin error:', error);
        return json({ error: error.message || 'Failed to create admin' }, { status: 500 });
    }
}
