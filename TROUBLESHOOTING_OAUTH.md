# Troubleshooting Google OAuth "invalid_client" Error

## Error: 401 invalid_client - "The OAuth client was not found"

This error means Google cannot find your OAuth client ID. Here's how to fix it:

## Step-by-Step Fix

### 1. Verify Your Client ID in `.env` File

Open your `.env` file and check:
- The Client ID should NOT be the placeholder: `your-google-client-id-here.apps.googleusercontent.com`
- It should be a real Client ID from Google Cloud Console
- Format: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- No extra spaces or quotes around it

**Example of correct `.env` file:**
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

### 2. Verify Client ID in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Click on it to view details
6. **Copy the exact Client ID** (it should end with `.apps.googleusercontent.com`)

### 3. Check Authorized JavaScript Origins

In Google Cloud Console, under your OAuth Client ID settings:

**Authorized JavaScript origins** must include:
- `http://localhost:3000` (if using port 3000)
- `http://localhost:5173` (if using Vite default port)
- Your exact development URL

**Important:**
- Use `http://` (not `https://`) for localhost
- Include the port number
- No trailing slash
- Each origin on a new line

### 4. Check Authorized Redirect URIs

**Authorized redirect URIs** should include:
- `http://localhost:3000` (or your dev port)
- `http://localhost:5173` (if using Vite default)

### 5. Restart Development Server

After updating `.env` file:
1. **Stop** your development server (Ctrl+C)
2. **Restart** it:
   ```bash
   npm run dev
   ```
3. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)

### 6. Clear Browser Cache

Sometimes cached credentials cause issues:
- Clear browser cache and cookies
- Or use Incognito/Private browsing mode

### 7. Verify Environment Variable is Loaded

Add this temporary debug code to check if the Client ID is being loaded:

In browser console (F12), run:
```javascript
console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
```

If it shows `undefined` or the placeholder value:
- Check `.env` file is in the root directory (same level as `package.json`)
- Verify the variable name is exactly `VITE_GOOGLE_CLIENT_ID`
- Restart the dev server

## Common Mistakes

❌ **Wrong:** Client ID has quotes
```env
VITE_GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
```

✅ **Correct:** No quotes
```env
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

❌ **Wrong:** Using placeholder value
```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

✅ **Correct:** Using actual Client ID
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

❌ **Wrong:** Wrong port in authorized origins
```
http://localhost:3001  (if your app runs on 3000)
```

✅ **Correct:** Match your actual dev server port
```
http://localhost:3000
```

## Still Not Working?

1. **Double-check the Client ID:**
   - Copy it directly from Google Cloud Console
   - Paste it into `.env` file
   - Make sure there are no extra characters

2. **Check the OAuth Consent Screen:**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Make sure it's configured (even for testing)

3. **Verify API is Enabled:**
   - Go to **APIs & Services** → **Library**
   - Search for "Google Identity Services API" or "Google+ API"
   - Make sure it's enabled

4. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for any error messages
   - Check Network tab for failed requests

5. **Try Creating a New OAuth Client:**
   - Delete the old one in Google Cloud Console
   - Create a new OAuth 2.0 Client ID
   - Update `.env` with the new Client ID
   - Restart dev server

## Need More Help?

If you're still having issues:
1. Check the exact error message in browser console
2. Verify all steps above
3. Make sure you're using the correct project in Google Cloud Console

