// src/routes/api/admin/auth/refresh/+server.js
import { json } from '@sveltejs/kit';
import { refreshAccessToken } from '$lib/server/adminAuth.js';

export async function POST({ request }) {
    try {
        const { refreshToken } = await request.json();
        
        if (!refreshToken) {
            return json({ error: 'Refresh token is required' }, { status: 400 });
        }
        
        const tokens = await refreshAccessToken(refreshToken);
        return json(tokens);
    } catch (error) {
        console.error('Token refresh error:', error);
        return json({ error: error.message || 'Token refresh failed' }, { status: 401 });
    }
}
