// src/routes/api/admin/attendance/[id]/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, logAuditEvent, PERMISSIONS } from '$lib/server/adminAuth.js';
import { adminDb } from '$lib/server/firebase-admin.js';

// Get single attendance record
export async function GET({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.VIEW_ATTENDANCE)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        if (!adminDb) return json({ error: 'Database not available' }, { status: 500 });
        
        // ID format: {userId}_{recordId}
        const [userId, recordId] = params.id.split('_');
        if (!userId || !recordId) {
            return json({ error: 'Invalid ID format' }, { status: 400 });
        }
        
        const snapshot = await adminDb.ref(`attendance/${userId}/${recordId}`).once('value');
        if (!snapshot.exists()) {
            return json({ error: 'Record not found' }, { status: 404 });
        }
        
        return json({ record: { id: params.id, ...snapshot.val() } });
    } catch (error) {
        console.error('Get attendance error:', error);
        return json({ error: 'Failed to fetch record' }, { status: 500 });
    }
}

// Update attendance record
export async function PATCH({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.EDIT_LOGS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const updates = await request.json();
        
        if (!adminDb) return json({ error: 'Database not available' }, { status: 500 });
        
        // ID format: {userId}_{recordId}
        const [userId, recordId] = params.id.split('_');
        if (!userId || !recordId) {
            return json({ error: 'Invalid ID format' }, { status: 400 });
        }
        
        const recordRef = adminDb.ref(`attendance/${userId}/${recordId}`);
        const snapshot = await recordRef.once('value');
        
        if (!snapshot.exists()) {
            return json({ error: 'Record not found' }, { status: 404 });
        }
        
        // Prepare update data
        const updateData = {
            updatedAt: new Date().toISOString(),
            updatedBy: admin.id
        };
        
        if (updates.status) updateData.currentStatus = updates.status;
        if (updates.checkIn) updateData['checkIn/timestamp'] = updates.checkIn;
        if (updates.checkOut) updateData['checkOut/timestamp'] = updates.checkOut;
        if (updates.notes !== undefined) updateData.adminNotes = updates.notes;
        if (updates.flagged !== undefined) updateData.flagged = updates.flagged;
        if (updates.flagReason) updateData.flagReason = updates.flagReason;
        
        await recordRef.update(updateData);
        
        await logAuditEvent({
            action: 'ATTENDANCE_UPDATED',
            adminId: admin.id,
            targetId: params.id,
            details: { updates: Object.keys(updates) }
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Update attendance error:', error);
        return json({ error: 'Failed to update record' }, { status: 500 });
    }
}

// Delete attendance record
export async function DELETE({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.EDIT_LOGS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        if (!adminDb) return json({ error: 'Database not available' }, { status: 500 });
        
        // ID format: {userId}_{recordId}
        const [userId, recordId] = params.id.split('_');
        if (!userId || !recordId) {
            return json({ error: 'Invalid ID format' }, { status: 400 });
        }
        
        await adminDb.ref(`attendance/${userId}/${recordId}`).remove();
        
        await logAuditEvent({
            action: 'ATTENDANCE_DELETED',
            adminId: admin.id,
            targetId: params.id
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Delete attendance error:', error);
        return json({ error: 'Failed to delete record' }, { status: 500 });
    }
}
