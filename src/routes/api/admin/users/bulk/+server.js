// src/routes/api/admin/users/bulk/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, PERMISSIONS } from '$lib/server/adminAuth.js';
import { bulkCreateUsers, bulkDeleteUsers, bulkUpdateUsers } from '$lib/server/userManagement.js';

export async function POST({ request }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const { action, users, userIds, updates } = await request.json();
        
        let result;
        
        switch (action) {
            case 'create':
                if (!users || !Array.isArray(users)) {
                    return json({ error: 'Users array is required' }, { status: 400 });
                }
                result = await bulkCreateUsers(users, admin.id);
                break;
                
            case 'delete':
                if (!userIds || !Array.isArray(userIds)) {
                    return json({ error: 'User IDs array is required' }, { status: 400 });
                }
                result = await bulkDeleteUsers(userIds, admin.id);
                break;
                
            case 'update':
                if (!userIds || !Array.isArray(userIds) || !updates) {
                    return json({ error: 'User IDs and updates are required' }, { status: 400 });
                }
                result = await bulkUpdateUsers(userIds, updates, admin.id);
                break;
                
            default:
                return json({ error: 'Invalid action' }, { status: 400 });
        }
        
        return json({ success: true, result });
    } catch (error) {
        console.error('Bulk operation error:', error);
        return json({ error: error.message || 'Bulk operation failed' }, { status: 500 });
    }
}
