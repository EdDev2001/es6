// src/routes/api/admin/users/+server.js
import { json } from '@sveltejs/kit';
import { verifyAccessToken, checkPermission, PERMISSIONS } from '$lib/server/adminAuth.js';
import { getAllUsers, createUser, getDepartments, exportUsersToCSV } from '$lib/server/userManagement.js';

export async function GET({ request, url }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const admin = await verifyAccessToken(authHeader.substring(7));
        if (!admin || !checkPermission(admin, PERMISSIONS.MANAGE_USERS)) {
            return json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Parse filters from query params
        const filters = {
            role: url.searchParams.get('role') || undefined,
            department: url.searchParams.get('department') || undefined,
            section: url.searchParams.get('section') || undefined,
            search: url.searchParams.get('search') || undefined,
            isActive: url.searchParams.get('isActive') === 'true' ? true : 
                      url.searchParams.get('isActive') === 'false' ? false : undefined
        };
        
        // Check if export is requested
        const exportFormat = url.searchParams.get('export');
        
        const users = await getAllUsers(filters);
        
        if (exportFormat === 'csv') {
            const csv = exportUsersToCSV(users);
            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="users.csv"'
                }
            });
        }
        
        const departments = await getDepartments();
        
        return json({ users, departments, total: users.length });
    } catch (error) {
        console.error('Get users error:', error);
        return json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

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
        
        const userData = await request.json();
        
        if (!userData.name || !userData.email) {
            return json({ error: 'Name and email are required' }, { status: 400 });
        }
        
        const user = await createUser(userData, admin.id);
        
        return json({ user });
    } catch (error) {
        console.error('Create user error:', error);
        return json({ error: error.message || 'Failed to create user' }, { status: 500 });
    }
}
