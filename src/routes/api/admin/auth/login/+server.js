// src/routes/api/admin/auth/login/+server.js
import { json } from '@sveltejs/kit';
import { adminLogin } from '$lib/server/adminAuth.js';

export async function POST({ request, getClientAddress }) {
    try {
        const { email, password } = await request.json();
        
        if (!email || !password) {
            return json({ error: 'Email and password are required' }, { status: 400 });
        }
        
        const ipAddress = getClientAddress();
        const result = await adminLogin(email, password, ipAddress);
        
        return json(result);
    } catch (error) {
        console.error('Admin login error:', error);
        return json({ error: error.message || 'Login failed' }, { status: 401 });
    }
}
