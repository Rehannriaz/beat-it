# Spotify Integration Setup Guide

This guide will help you set up Spotify integration for the rhythm game.

## Prerequisites

- Spotify Premium account (required for Web Playback SDK)
- Spotify Developer account

## Step 1: Create Spotify Developer Account

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"

## Step 2: Register Your App

Fill in the app details:
- **App name**: Beat It Rhythm Game (or your choice)
- **App description**: Rhythm game with Spotify integration
- **Website**: Your app URL (optional)
- **Redirect URI**: 
  - Development: `http://localhost:3000/api/auth/spotify/callback`
  - Production: `https://yourdomain.com/api/auth/spotify/callback`
- **What API/SDKs are you planning to use?**: Web API, Web Playback SDK

## Step 3: Get Your Credentials

After creating the app, you'll see:
- **Client ID** (visible immediately)
- **Client Secret** (click "Show client secret" to reveal)

⚠️ **Important**: Never expose your Client Secret in frontend code!

## Step 4: Configure Environment Variables

Create or update `frontend/.env.local`:

```env
# Spotify OAuth
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback

# Optional: For production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to your app
3. Click "Login with Spotify"
4. Authorize the app
5. Search for a track
6. Select a track to play

## Usage in Your Game

### Basic Integration

```tsx
import { SpotifyLogin } from '@/components/spotify/spotify-login'
import { TrackSearch } from '@/components/spotify/track-search'
import { SpotifyPlayer } from '@/components/spotify/spotify-player'
import { useSpotifyPlayer } from '@/hooks/use-spotify-player'

function GameWithSpotify() {
  const [selectedTrack, setSelectedTrack] = useState(null)
  const { position, isPlaying } = useSpotifyPlayer()

  // Sync your game pattern with playback position
  useEffect(() => {
    if (isPlaying && pattern) {
      // Spawn tiles based on pattern.tiles[].time matching position
      pattern.tiles.forEach(tile => {
        if (Math.abs(tile.time - position) < 0.1) {
          spawnTile(tile)
        }
      })
    }
  }, [position, isPlaying, pattern])

  return (
    <>
      <SpotifyLogin />
      <TrackSearch onTrackSelect={setSelectedTrack} />
      {selectedTrack && (
        <SpotifyPlayer trackUri={selectedTrack.uri} />
      )}
    </>
  )
}
```

### Getting Track Audio Features

```tsx
import { spotifyApi } from '@/lib/spotify/api'

// Get BPM and other audio features for pattern generation
const audioFeatures = await spotifyApi.getAudioFeatures(trackId)
console.log('BPM:', audioFeatures.tempo)
console.log('Energy:', audioFeatures.energy)
console.log('Danceability:', audioFeatures.danceability)
```

## API Routes

The integration includes two API routes:

1. **`/api/auth/spotify/callback`** - Handles OAuth callback
2. **`/api/auth/spotify/token`** - Exchanges authorization code for tokens (server-side)

## Components

### `SpotifyLogin`
Handles authentication flow. Shows login button or user info when logged in.

### `TrackSearch`
Search interface for finding Spotify tracks.

### `SpotifyPlayer`
Full-featured player with play/pause, seek, volume controls, and position tracking.

## Hooks

### `useSpotifyAuth()`
Manages authentication state:
```tsx
const { isLoggedIn, user, login, logout } = useSpotifyAuth()
```

### `useSpotifyPlayer()`
Manages Spotify Web Playback SDK:
```tsx
const { 
  isReady, 
  isPlaying, 
  currentTrack, 
  position, 
  duration,
  play,
  pause,
  seek 
} = useSpotifyPlayer()
```

## Troubleshooting

### "Not authenticated" error
- Make sure you've logged in with Spotify
- Check that tokens are stored in localStorage
- Try logging out and logging back in

### "Player not ready" error
- Ensure Spotify Premium is active
- Check that Spotify Web Playback SDK script is loaded
- Make sure you're not blocking third-party scripts

### "Failed to connect to Spotify player"
- Verify you have Spotify Premium
- Check browser console for detailed errors
- Make sure you're using HTTPS in production (required by Spotify)

### Token exchange fails
- Verify `SPOTIFY_CLIENT_SECRET` is set in environment variables
- Check that redirect URI matches exactly in Spotify dashboard
- Ensure you're using the correct Client ID

## Production Deployment

1. Update redirect URI in Spotify dashboard to your production URL
2. Set environment variables in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
3. Ensure `SPOTIFY_CLIENT_SECRET` is only set server-side (not in `NEXT_PUBLIC_*`)

## Security Notes

- Never commit `.env.local` to version control
- Client Secret must only be used server-side (in API routes)
- Access tokens expire after 1 hour (refresh logic can be added)
- Always use HTTPS in production

## Next Steps

- Integrate pattern generation using Spotify's audio features API
- Sync game pattern tiles with playback position
- Add pattern caching/storage for generated patterns
- Implement difficulty levels based on track BPM
