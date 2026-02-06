# Authentication Setup Guide

Mission Control v1.6.0 requires Google OAuth authentication. Follow these steps to complete the setup.

## Step 1: Generate AUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output — you'll need it for Vercel.

## Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: `Mission Control`
   - User support email: Your email
   - Developer contact: Your email
   - Save and continue through the remaining steps
6. Back in Credentials, click **Create Credentials** → **OAuth 2.0 Client ID**
7. Application type: **Web application**
8. Name: `Mission Control`
9. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://mission-control-tan.vercel.app/api/auth/callback/google`
10. Click **Create**
11. Copy the **Client ID** and **Client Secret**

## Step 3: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) → Your Project → **Settings** → **Environment Variables**
2. Add these variables (for all environments or just Production):

| Variable | Value |
|----------|-------|
| `AUTH_SECRET` | (the value from Step 1) |
| `GOOGLE_CLIENT_ID` | (from Step 2) |
| `GOOGLE_CLIENT_SECRET` | (from Step 2) |

3. Click **Save**

## Step 4: Redeploy

After adding environment variables, trigger a new deployment:

```bash
# Via Vercel CLI
vercel --prod

# Or push any commit to trigger auto-deploy
```

## Step 5: Test

1. Visit https://mission-control-tan.vercel.app
2. You should see the sign-in page
3. Click "Sign in with Google"
4. Sign in with `paul@heth.ca`
5. You should be redirected to the dashboard

## Troubleshooting

### "Access Denied" after signing in
Your email isn't in the whitelist. Edit `src/auth.ts` and add your email to `ALLOWED_EMAILS`.

### "Configuration Error"
Missing or incorrect environment variables. Check Vercel settings.

### Redirect URI mismatch
Make sure the exact redirect URI `https://mission-control-tan.vercel.app/api/auth/callback/google` is added in Google Cloud Console.

## Adding More Users

Edit `src/auth.ts`:

```typescript
const ALLOWED_EMAILS = [
  "paul@heth.ca",
  "another@email.com",
];
```

Then commit and redeploy.

---

Questions? Ask Henry! 🤖
