# OAuth Integration Setup Guide

This guide walks you through setting up real OAuth integrations for Google Calendar, Microsoft Teams, Slack, and Zoom.

## Prerequisites
- Your app deployed to Vercel (or your production domain)
- Access to developer consoles for each service

---

## 1. Google Calendar Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**:
   - Go to APIs & Services → Library
   - Search "Google Calendar API" → Enable

### Step 2: Create OAuth Credentials
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Add Authorized redirect URI:
   ```
   https://es6-ruddy.vercel.app/api/oauth/google/callback
   ```
5. Copy the Client ID and Client Secret

### Step 3: Configure Consent Screen
1. Go to OAuth consent screen
2. Select "External" user type
3. Fill in app name, support email
4. Add scopes:
   - `../auth/calendar.readonly`
   - `../auth/calendar.events.readonly`
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`

### Step 4: Add to Environment Variables
```env
PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 2. Microsoft Teams/Calendar Setup

### Step 1: Register Azure AD Application
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Click "New registration"
4. Name: "Attendance System"
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
6. Redirect URI: Web → `https://es6-ruddy.vercel.app/api/oauth/microsoft/callback`

### Step 2: Configure API Permissions
1. Go to API permissions
2. Add permissions:
   - Microsoft Graph → Delegated:
     - `User.Read`
     - `Calendars.Read`
     - `offline_access`

### Step 3: Create Client Secret
1. Go to Certificates & secrets
2. New client secret
3. Copy the secret value immediately (shown only once)

### Step 4: Add to Environment Variables
```env
PUBLIC_MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

---

## 3. Slack Setup

### Step 1: Create Slack App
1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app and select workspace

### Step 2: Configure OAuth & Permissions
1. Go to OAuth & Permissions
2. Add Redirect URL:
   ```
   https://es6-ruddy.vercel.app/api/oauth/slack/callback
   ```
3. Add Bot Token Scopes:
   - `users:read`
   - `chat:write`
   - `channels:read`

### Step 3: Get Credentials
1. Go to Basic Information
2. Copy Client ID and Client Secret

### Step 4: Add to Environment Variables
```env
PUBLIC_SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
```

---

## 4. Zoom Setup

### Step 1: Create Zoom App
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/develop/create)
2. Click "Build App" → Select "OAuth"
3. Fill in app name

### Step 2: Configure OAuth
1. Add Redirect URL:
   ```
   https://es6-ruddy.vercel.app/api/oauth/zoom/callback
   ```
2. Add Scopes:
   - `user:read`
   - `meeting:read`

### Step 3: Get Credentials
1. Copy Client ID and Client Secret from App Credentials

### Step 4: Add to Environment Variables
```env
PUBLIC_ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

---

## 5. Firebase Rules Update

Add this to your Firebase Realtime Database rules to allow OAuth token storage:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "gamification": {
      ".read": "auth != null",
      "$uid": {
        ".write": "$uid === auth.uid"
      }
    },
    "attendance": {
      "$uid": {
        ".indexOn": ["date"],
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "notifications": {
      "$uid": {
        ".indexOn": ["timestamp"],
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "oauth_tokens": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    ".read": false,
    ".write": false
  }
}
```

---

## 6. Vercel Environment Variables

Add all OAuth credentials to Vercel:

1. Go to your Vercel project → Settings → Environment Variables
2. Add each variable for Production environment:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
   - `PUBLIC_GOOGLE_CLIENT_ID`
   - `PUBLIC_MICROSOFT_CLIENT_ID`
   - `PUBLIC_SLACK_CLIENT_ID`
   - `PUBLIC_ZOOM_CLIENT_ID`

3. Redeploy your app

---

## Testing

1. Go to your app → Profile → Privacy Settings → Connected Apps
2. Click "Connect" on any service
3. A popup should open with the OAuth login
4. After authorizing, the popup closes and shows "Connected"

## Troubleshooting

### "Popup blocked"
- Allow popups for your domain in browser settings

### "Invalid redirect URI"
- Make sure the redirect URI in the OAuth provider matches exactly:
  `https://your-domain.vercel.app/api/oauth/{provider}/callback`

### "Permission denied" in Firebase
- Update Firebase rules to include `oauth_tokens` path

### Token refresh fails
- Check that refresh tokens are being stored
- Verify client secrets are correct in Vercel env vars
