# Testing Spotify Integration

## Quick Start

### 1. Create Environment Variables File

Create `frontend/.env.local` with your Spotify credentials:

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
```

### 2. Restart Dev Server

**IMPORTANT**: If you just created or modified `.env.local`, you MUST restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

Next.js only reads environment variables when it starts, so changes require a restart.

### 3. Test the Integration

1. **Open the test page**: Navigate to `http://localhost:3000/spotify-test`
   
   OR

2. **Add to your main page**: Import and use the components in your game

### 4. Testing Steps

1. **Check Login**: Click "Login with Spotify" button
   - Should redirect to Spotify authorization page
   - After authorizing, should redirect back and show your profile

2. **Test Search**: Type a song name in the search box
   - Should show list of tracks
   - Click a track to select it

3. **Test Player**: After selecting a track
   - Player should appear
   - Should show "Connecting to Spotify player..."
   - Then show play controls
   - Click play to start playback

4. **Check Console**: Open browser DevTools (F12)
   - Look for any errors
   - Should see "Spotify player ready" message when connected

## Troubleshooting

### "Not authenticated" error
- Make sure you completed the login flow
- Check browser console for errors
- Verify environment variables are set correctly

### "Player not ready" error
- Ensure you have **Spotify Premium** (required for Web Playback SDK)
- Check that Spotify Web Playback SDK script loaded (check Network tab)
- Try refreshing the page

### "Failed to exchange authorization code"
- Verify `SPOTIFY_CLIENT_SECRET` is set in `.env.local`
- Check that redirect URI matches exactly in Spotify dashboard
- Make sure dev server was restarted after adding env vars

### Environment variables not working
- **Must restart dev server** after creating/modifying `.env.local`
- Variables must start with `NEXT_PUBLIC_` to be available in browser
- `SPOTIFY_CLIENT_SECRET` should NOT have `NEXT_PUBLIC_` prefix (server-side only)

## Quick Test Checklist

- [ ] `.env.local` file exists with all required variables
- [ ] Dev server restarted after creating `.env.local`
- [ ] Navigated to `http://localhost:3000/spotify-test`
- [ ] Can see "Login with Spotify" button
- [ ] Login redirects to Spotify
- [ ] After login, shows user profile
- [ ] Can search for tracks
- [ ] Can select a track
- [ ] Player appears and connects
- [ ] Can play/pause music
