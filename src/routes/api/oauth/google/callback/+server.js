// Google OAuth Callback Handler
import { json, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
import { getDatabase, ref, set } from 'firebase/database';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase as getAdminDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin if not already
function getAdminDb() {
    if (getApps().length === 0) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
        initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL
        });
    }
    return getAdminDatabase();
}

export async function GET({ url }) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    // Handle errors
    if (error) {
        return new Response(getCallbackHTML(false, 'google', error), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    if (!code || !state) {
        return new Response(getCallbackHTML(false, 'google', 'Missing code or state'), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    try {
        // Decode state to get userId
        const stateData = JSON.parse(atob(state));
        const { userId } = stateData;
        
        if (!userId) {
            throw new Error('Invalid state: missing userId');
        }
        
        // Exchange code for tokens
        const redirectUri = `${url.origin}/api/oauth/google/callback`;
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error_description || 'Token exchange failed');
        }
        
        const tokens = await tokenResponse.json();
        
        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        
        const userInfo = await userInfoResponse.json();
        
        // Store tokens in Firebase
        const adminDb = getAdminDb();
        const tokenRef = adminDb.ref(`oauth_tokens/${userId}/google`);
        
        await tokenRef.set({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000),
            token_type: tokens.token_type,
            scope: tokens.scope,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            connected_at: Date.now()
        });
        
        // Return success HTML that posts message to opener
        return new Response(getCallbackHTML(true, 'google', null, {
            email: userInfo.email,
            name: userInfo.name
        }), {
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (err) {
        console.error('Google OAuth error:', err);
        return new Response(getCallbackHTML(false, 'google', err.message), {
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
