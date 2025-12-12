// src/routes/api/admin/settings/regenerate-qr/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, logAuditEvent, PERMISSIONS } from '$lib/server/adminAuth.js';
import { adminDb } from '$lib/server/firebase-admin.js';
import crypto from 'crypto';

export async function POST({ request }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_SYSTEM_SETTINGS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        if (!adminDb) return json({ error: 'Database not available' }, { status: 500 });
        
        // Get all users
        const usersSnapshot = await adminDb.ref('users').once('value');
        if (!usersSnapshot.exists()) {
            return json({ success: true, message: 'No users to update', count: 0 });
        }
        
        const users = usersSnapshot.val();
        const updates = {};
        let count = 0;
        
        // Generate new QR secrets for each user
        for (const [userId, userData] of Object.entries(users)) {
            const newQrSecret = crypto.randomBytes(32).toString('hex');
            const newQrSalt = crypto.randomBytes(16).toString('hex');
            
            updates[`users/${userId}/qrSecret`] = newQrSecret;
            updates[`users/${userId}/qrSalt`] = newQrSalt;
            updates[`users/${userId}/qrRegeneratedAt`] = new Date().toISOString();
            
            // Create notification for user
            const notifRef = adminDb.ref(`notifications/${userId}`).push();
            updates[`notifications/${userId}/${notifRef.key}`] = {
                type: 'qr_regenerated',
                title: 'QR Code Updated',
                body: 'Your digital ID QR code has been regenerated for security purposes.',
                read: false,
                createdAt: new Date().toISOString()
            };
            
            count++;
        }
        
        // Apply all updates atomically
        await adminDb.ref().update(updates);
        
        // Update system settings with regeneration timestamp
        await adminDb.ref('systemSettings/epass/lastQrRegeneration').set({
            timestamp: new Date().toISOString(),
            regeneratedBy: admin.id,
            userCount: count
        });
        
        await logAuditEvent({
            action: 'QR_CODES_REGENERATED',
            adminId: admin.id,
            details: { userCount: count }
        });
        
        return json({ 
            success: true, 
            message: `QR codes regenerated for ${count} users`,
            count 
        });
    } catch (error) {
        console.error('Regenerate QR error:', error);
        return json({ error: 'Failed to regenerate QR codes' }, { status: 500 });
    }
}
