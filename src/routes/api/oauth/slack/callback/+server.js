// Slack OAuth Callback Handler
import { json } from '@sveltejs/kit';
import { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } from '$env/static/private';
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
        return new Response(getCallbackHTML(false, 'slack', error), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    if (!code || !state) {
        return new Response(getCallbackHTML(false, 'slack', 'Missing code or state'), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    try {
        const stateData = JSON.parse(atob(state));
        const { userId } = stateData;
        
        if (!userId) throw new Error('Invalid state: missing userId');
        
        const redirectUri = `${url.origin}/api/oauth/slack/callback`;
        
        // Exchange code for tokens
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                redirect_uri: redirectUri
            })
        });
        
        const tokens = await tokenResponse.json();
        
        if (!tokens.ok) {
            throw new Error(tokens.error || 'Token exchange failed');
        }
        
        // Store tokens
        const adminDb = getAdminDb();
        const tokenRef = adminDb.ref(`oauth_tokens/${userId}/slack`);
        
        await tokenRef.set({
            access_token: tokens.access_token,
            token_type: tokens.token_type,
            scope: tokens.scope,
            team_id: tokens.team?.id,
            team_name: tokens.team?.name,
            user_id: tokens.authed_user?.id,
            bot_user_id: tokens.bot_user_id,
            connected_at: Date.now()
        });
        
        return new Response(getCallbackHTML(true, 'slack', null, {
            workspace: tokens.team?.name,
            team_id: tokens.team?.id
        }), {
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (err) {
        console.error('Slack OAuth error:', err);
        return new Response(getCallbackHTML(false, 'slack', err.message), {
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
