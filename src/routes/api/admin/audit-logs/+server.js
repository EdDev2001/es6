// src/routes/api/admin/audit-logs/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, getAuditLogs, PERMISSIONS } from '$lib/server/adminAuth.js';

export async function GET({ request, url }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.VIEW_AUDIT_LOGS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const action = url.searchParams.get('action');
        const adminId = url.searchParams.get('adminId');
        
        const { logs, total } = await getAuditLogs({ limit, action, adminId });
        
        return json({ logs, total });
    } catch (error) {
        console.error('Get audit logs error:', error);
        return json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }
}
