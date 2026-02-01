/**
 * Spotify Web API client
 */

import { getStoredAccessToken, clearTokens } from './auth';
import type {
  SpotifyUser,
  SpotifyTrack,
  SpotifySearchResponse,
  SpotifyAudioFeatures,
  SpotifyAudioAnalysis,
} from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyError {
  error: {
    status: number;
    message: string;
  };
}

/**
 * Make authenticated request to Spotify API
 */
async function spotifyRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredAccessToken();
  
  if (!token) {
    throw new Error('No access token available. Please log in.');
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired, clear it
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const error: SpotifyError = await response.json().catch(() => ({
      error: { status: response.status, message: 'Request failed' }
    }));
    throw new Error(error.error?.message || `Spotify API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Spotify API client
 */
export const spotifyApi = {
  /**
   * Get current user's profile
   */
  getMe: () => spotifyRequest<SpotifyUser>('/me'),

  /**
   * Search for tracks
   */
  searchTracks: (query: string, limit = 20) => {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
    });
    return spotifyRequest<SpotifySearchResponse>(`/search?${params.toString()}`);
  },

  /**
   * Get track by ID
   */
  getTrack: (trackId: string) =>
    spotifyRequest<SpotifyTrack>(`/tracks/${trackId}`),

  /**
   * Get audio features for a track
   */
  getAudioFeatures: (trackId: string) =>
    spotifyRequest<SpotifyAudioFeatures>(`/audio-features/${trackId}`),

  /**
   * Get audio analysis for a track (more detailed)
   */
  getAudioAnalysis: (trackId: string) =>
    spotifyRequest<SpotifyAudioAnalysis>(`/audio-analysis/${trackId}`),

  /**
   * Get multiple tracks
   */
  getTracks: (trackIds: string[]) => {
    const params = new URLSearchParams({
      ids: trackIds.join(','),
    });
    return spotifyRequest<{ tracks: SpotifyTrack[] }>(`/tracks?${params.toString()}`);
  },

  /**
   * Get user's playlists
   */
  getMyPlaylists: (limit = 20) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    return spotifyRequest<{ items: Array<{ id: string; name: string; images: Array<{ url: string }> }> }>(`/me/playlists?${params.toString()}`);
  },

  /**
   * Get playlist tracks
   */
  getPlaylistTracks: (playlistId: string, limit = 20) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    return spotifyRequest<{ items: Array<{ track: SpotifyTrack }> }>(`/playlists/${playlistId}/tracks?${params.toString()}`);
  },

  /**
   * Check if tracks are saved in user's library
   */
  checkSavedTracks: (trackIds: string[]) => {
    const params = new URLSearchParams({
      ids: trackIds.join(','),
    });
    return spotifyRequest<boolean[]>(`/me/tracks/contains?${params.toString()}`);
  },

  /**
   * Save tracks to user's library
   */
  saveTrack: async (trackId: string): Promise<void> => {
    const token = getStoredAccessToken();

    if (!token) {
      throw new Error('No access token available. Please log in.');
    }

    const response = await fetch(`${SPOTIFY_API_BASE}/me/tracks`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [trackId] }),
    });

    if (response.status === 401) {
      clearTokens();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(`Failed to save track: ${response.status}`);
    }
  },

  /**
   * Remove tracks from user's library
   */
  removeTrack: async (trackId: string): Promise<void> => {
    const token = getStoredAccessToken();

    if (!token) {
      throw new Error('No access token available. Please log in.');
    }

    const response = await fetch(`${SPOTIFY_API_BASE}/me/tracks`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [trackId] }),
    });

    if (response.status === 401) {
      clearTokens();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(`Failed to remove track: ${response.status}`);
    }
  },
};
