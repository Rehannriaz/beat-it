'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { spotifyApi } from '@/lib/spotify/api'
import { getStoredAccessToken } from '@/lib/spotify/auth'
import { getTodayUTC, getDailySongIndex, getTimeUntilReset } from '@/lib/daily-challenge'
import type { DailyChallengeInfo } from '@/types/daily-challenge'
import type { SpotifyTrack } from '@/lib/spotify/types'

const PLAYLIST_CACHE_KEY = 'daily_challenge_playlist'
const PLAYLIST_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface CachedPlaylist {
  tracks: SpotifyTrack[]
  cachedAt: number
}

async function fetchTracksFromUserPlaylists(): Promise<SpotifyTrack[]> {
  // Get user's playlists
  const playlistsResponse = await spotifyApi.getMyPlaylists(50)

  if (playlistsResponse.items.length === 0) {
    throw new Error('No playlists found')
  }

  // Try each playlist until we get tracks
  for (const playlist of playlistsResponse.items) {
    try {
      const tracksResponse = await spotifyApi.getPlaylistTracks(playlist.id, 100)
      const tracks = tracksResponse.items
        .map(item => item.track)
        .filter((track): track is SpotifyTrack => track !== null && track.id !== null)

      if (tracks.length >= 10) {
        return tracks
      }
    } catch (error) {
      console.warn(`Failed to fetch playlist ${playlist.id}:`, error)
    }
  }

  throw new Error('Could not fetch tracks from any playlist')
}

export function useDailyChallenge() {
  const [countdown, setCountdown] = useState(getTimeUntilReset())
  const today = getTodayUTC()

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilReset())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: challengeInfo, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyChallenge', today],
    queryFn: async (): Promise<DailyChallengeInfo> => {
      const token = getStoredAccessToken()
      if (!token) {
        return {
          date: today,
          songIndex: 0,
          trackId: null,
          trackName: null,
          artistName: null,
          albumArt: null,
        }
      }

      // Check cache first
      const cached = localStorage.getItem(PLAYLIST_CACHE_KEY)
      let tracks: SpotifyTrack[] = []

      if (cached) {
        try {
          const parsedCache: CachedPlaylist = JSON.parse(cached)
          if (Date.now() - parsedCache.cachedAt < PLAYLIST_CACHE_TTL) {
            tracks = parsedCache.tracks
          }
        } catch {
          // Invalid cache, will refetch
          localStorage.removeItem(PLAYLIST_CACHE_KEY)
        }
      }

      // Fetch from user's playlists if not cached
      if (tracks.length === 0) {
        tracks = await fetchTracksFromUserPlaylists()

        localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify({
          tracks,
          cachedAt: Date.now(),
        }))
      }

      const songIndex = getDailySongIndex(today, tracks.length)
      const track = tracks[songIndex]

      return {
        date: today,
        songIndex,
        trackId: track?.id || null,
        trackName: track?.name || null,
        artistName: track?.artists[0]?.name || null,
        albumArt: track?.album?.images[0]?.url || null,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const hasSpotifyAuth = !!getStoredAccessToken()

  return {
    challengeInfo,
    isLoading,
    error,
    refetch,
    countdown,
    countdownFormatted: `${countdown.hours.toString().padStart(2, '0')}:${countdown.minutes.toString().padStart(2, '0')}:${countdown.seconds.toString().padStart(2, '0')}`,
    hasSpotifyAuth,
  }
}
