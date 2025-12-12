// src/routes/api/admin/setup/+server.js
// One-time setup endpoint to create the initial super admin
import { json } from '@sveltejs/kit';
import { createAdmin, getAllAdmins, ADMIN_ROLES } from '$lib/server/adminAuth.js';

export async function POST({ request, getClientAddress }) {
    try {
        // Check if any admin already exists
        const existingAdmins = await getAllAdmins();
        if (existingAdmins.length > 0) {
            return json({ error: 'Setup already completed. Admins already exist.' }, { status: 400 });
        }
        
        const { email, password, name } = await request.json();
        
        if (!email || !password || !name) {
            return json({ error: 'Email, password, and name are required' }, { status: 400 });
        }
        
        if (password.length < 8) {
            return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }
        
        const ipAddress = getClientAddress();
        
        const admin = await createAdmin({
            email,
            password,
            name,
            role: ADMIN_ROLES.SUPER_ADMIN,
            ipAddress
        });
        
        return json({ 
            success: true, 
            message: 'Super Admin created successfully',
            admin 
        });
    } catch (error) {
        console.error('Admin setup error:', error);
        return json({ error: error.message || 'Setup failed' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const existingAdmins = await getAllAdmins();
        return json({ 
            setupRequired: existingAdmins.length === 0,
            adminCount: existingAdmins.length
        });
    } catch (error) {
        return json({ setupRequired: true, adminCount: 0 });
    }
}
