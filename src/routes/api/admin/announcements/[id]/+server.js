// src/routes/api/admin/announcements/[id]/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, logAuditEvent, PERMISSIONS } from '$lib/server/adminAuth.js';
import { adminDb } from '$lib/server/firebase-admin.js';

export async function PUT({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_ANNOUNCEMENTS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const data = await request.json();
        
        if (!adminDb) return json({ error: 'Database not available' }, { status: 500 });
        
        await adminDb.ref(`announcements/${params.id}`).update({
            ...data,
            updatedAt: new Date().toISOString(),
            updatedBy: admin.id
        });
        
        await logAuditEvent({
            action: 'ANNOUNCEMENT_UPDATED',
            adminId: admin.id,
            targetId: params.id,
            details: { title: data.title }
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Update announcement error:', error);
        return json({ error: 'Failed to update announcement' }, { status: 500 });
    }
}

export async function DELETE({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_ANNOUNCEMENTS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        if (!adminDb) return json({ error: 'Database not available' }, { status: 500 });
        
        await adminDb.ref(`announcements/${params.id}`).remove();
        
        await logAuditEvent({
            action: 'ANNOUNCEMENT_DELETED',
            adminId: admin.id,
            targetId: params.id
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Delete announcement error:', error);
        return json({ error: 'Failed to delete announcement' }, { status: 500 });
    }
}
