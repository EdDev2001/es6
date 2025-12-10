// Zoom OAuth Callback Handler
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
const ZOOM_CLIENT_ID = env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = env.ZOOM_CLIENT_SECRET;
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

function getAdminDb() {
    if (getApps().length === 0) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
        initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL
        });
    }
    return getDatabase();
}

export async function GET({ url }) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    if (error) {
        return new Response(getCallbackHTML(false, 'zoom', error), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    if (!code || !state) {
        return new Response(getCallbackHTML(false, 'zoom', 'Missing code or state'), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    try {
        const stateData = JSON.parse(atob(state));
        const { userId } = stateData;
        
        if (!userId) throw new Error('Invalid state: missing userId');
        
        const redirectUri = `${url.origin}/api/oauth/zoom/callback`;
        
        // Zoom uses Basic Auth for token exchange
        const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
        
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            })
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.reason || 'Token exchange failed');
        }
        
        const tokens = await tokenResponse.json();
        
        // Get user info
        const userInfoResponse = await fetch('https://api.zoom.us/v2/users/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        
        const userInfo = await userInfoResponse.json();
        
        // Store tokens
        const adminDb = getAdminDb();
        const tokenRef = adminDb.ref(`oauth_tokens/${userId}/zoom`);
        
        await tokenRef.set({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000),
            token_type: tokens.token_type,
            scope: tokens.scope,
            email: userInfo.email,
            name: `${userInfo.first_name} ${userInfo.last_name}`,
            zoom_user_id: userInfo.id,
            account_id: userInfo.account_id,
            connected_at: Date.now()
        });
        
        return new Response(getCallbackHTML(true, 'zoom', null, {
            email: userInfo.email,
            name: `${userInfo.first_name} ${userInfo.last_name}`
        }), {
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (err) {
        console.error('Zoom OAuth error:', err);
        return new Response(getCallbackHTML(false, 'zoom', err.message), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

function getCallbackHTML(success, provider, error = null, data = null) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>OAuth ${success ? 'Success' : 'Failed'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f7; }
        .container { text-align: center; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { margin: 0 0 8px; color: ${success ? '#34C759' : '#FF3B30'}; }
        p { color: #666; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${success ? '✓' : '✗'}</div>
        <h1>${success ? 'Connected!' : 'Connection Failed'}</h1>
        <p>${success ? 'You can close this window.' : (error || 'An error occurred')}</p>
    </div>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'oauth_callback',
                provider: '${provider}',
                success: ${success},
                ${success ? `data: ${JSON.stringify(data)},` : ''}
                ${error ? `error: '${error.replace(/'/g, "\\'")}',` : ''}
            }, window.location.origin);
            setTimeout(() => window.close(), 2000);
        }
    </script>
</body>
</html>`;
}
