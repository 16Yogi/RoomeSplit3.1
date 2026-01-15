# Google OAuth Authentication Setup

This guide will help you set up Google OAuth authentication for RoomieSplit.

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity Services**)
4. Go to **APIs & Services** > **Credentials**
5. Click **Create Credentials** > **OAuth client ID**
6. Choose **Web application** as the application type
7. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `http://localhost:5173` (if using Vite default port)
   - Your production domain (e.g., `https://yourdomain.com`)
8. Add authorized redirect URIs (same as above)
9. Click **Create**
10. Copy your **Client ID**

## Step 2: Configure Environment Variables

1. Create a `.env` file in the root directory of your project
2. Add your Google Client ID:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

**Important:** 
- The `.env` file should be in the root directory (same level as `package.json`)
- Never commit the `.env` file to version control
- Restart your development server after creating/updating `.env`

## Step 3: Test the Login

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000` (or your configured port)
3. You should see the login screen
4. Click "Sign in with Google"
5. Select your Google account
6. You should be redirected to the main application

## Troubleshooting

### "Google Client ID not configured" warning
- Make sure you've created a `.env` file in the root directory
- Verify the variable name is exactly `VITE_GOOGLE_CLIENT_ID`
- Restart your development server after creating/updating `.env`

### "Error 400: redirect_uri_mismatch"
- Make sure you've added your exact development URL to authorized redirect URIs in Google Cloud Console
- Check that the URL matches exactly (including `http://` vs `https://` and port numbers)

### Login button not appearing
- Check browser console for errors
- Verify the Google Identity Services script is loading (check Network tab)
- Make sure your Client ID is valid and the API is enabled

### Session not persisting
- Check that localStorage is enabled in your browser
- Clear browser cache and try again

## Security Notes

- Keep your Client ID secure (don't commit it to public repositories)
- Use environment variables for all sensitive configuration
- In production, use HTTPS for all OAuth redirects
- Regularly rotate your OAuth credentials

## Features

- ✅ Google OAuth 2.0 authentication
- ✅ User profile display (name, email, picture)
- ✅ Persistent login session (stored in localStorage)
- ✅ Secure logout functionality
- ✅ Protected routes (app requires authentication)

