/**
 * Spotify OAuth authentication utilities
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
// Use backend callback URL (localhost:3001/api/callback)
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/callback';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  //'playlist-read-public',
  //'playlist-read-private',
].join(' ');

/**
 * Generate Spotify OAuth authorization URL
 */
export function getSpotifyAuthUrl(currentPath?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    show_dialog: 'false',
  });

  // Include current path in state parameter to redirect back to the same page
  if (currentPath && typeof window !== 'undefined') {
    params.set('state', encodeURIComponent(currentPath));
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Initiate Spotify login flow
 */
export function loginWithSpotify(): void {
  if (!CLIENT_ID) {
    throw new Error('Spotify Client ID is not configured. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID in your environment variables.');
  }
  
  // Get current path to redirect back to the same page after login
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/spotify-test';
  window.location.href = getSpotifyAuthUrl(currentPath);
}

/**
 * Extract authorization code from callback URL
 */
export function getAuthCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

/**
 * Check if current URL is the OAuth callback
 */
export function isCallbackUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.includes('/api/auth/spotify/callback');
}

/**
 * Store tokens in localStorage
 */
export function storeTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;
  
  const expiresAt = Date.now() + expiresIn * 1000;
  
  localStorage.setItem('spotify_access_token', accessToken);
  localStorage.setItem('spotify_refresh_token', refreshToken);
  localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
}

/**
 * Get stored access token
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  
  if (!token || !expiresAt) return null;
  
  // Check if token is expired (with 5 minute buffer)
  if (Date.now() >= parseInt(expiresAt) - 5 * 60 * 1000) {
    return null; // Token expired or about to expire
  }
  
  return token;
}

/**
 * Get stored refresh token
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('spotify_refresh_token');
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getStoredAccessToken() !== null;
}
