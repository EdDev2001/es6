// src/routes/api/admin/users/[id]/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, PERMISSIONS } from '$lib/server/adminAuth.js';
import { getUserById, updateUser, deleteUser, setUserActiveStatus } from '$lib/server/userManagement.js';

export async function GET({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const user = await getUserById(params.id);
        if (!user) {
            return json({ error: 'User not found' }, { status: 404 });
        }
        
        // Remove sensitive data
        const { passwordHash, passwordSalt, qrSecret, ...safeUser } = user;
        
        return json({ user: safeUser });
    } catch (error) {
        console.error('Get user error:', error);
        return json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const updates = await request.json();
        await updateUser(params.id, updates, admin.id);
        
        return json({ success: true });
    } catch (error) {
        console.error('Update user error:', error);
        return json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        await deleteUser(params.id, admin.id);
        
        return json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return json({ error: error.message || 'Failed to delete user' }, { status: 500 });
    }
}

export async function PATCH({ request, params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const { action, ...data } = await request.json();
        
        if (action === 'activate') {
            await setUserActiveStatus(params.id, true, admin.id);
        } else if (action === 'deactivate') {
            await setUserActiveStatus(params.id, false, admin.id);
        } else {
            await updateUser(params.id, data, admin.id);
        }
        
        return json({ success: true });
    } catch (error) {
        console.error('Patch user error:', error);
        return json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}
