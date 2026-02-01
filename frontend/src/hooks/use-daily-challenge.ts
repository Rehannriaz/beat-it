'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { spotifyApi } from '@/lib/spotify/api'
import { getStoredAccessToken } from '@/lib/spotify/auth'
import { getTodayUTC, getDailySongIndex, TOP_HITS_PLAYLIST_ID, getTimeUntilReset } from '@/lib/daily-challenge'
import type { DailyChallengeInfo } from '@/types/daily-challenge'
import type { SpotifyTrack } from '@/lib/spotify/types'

const PLAYLIST_CACHE_KEY = 'daily_challenge_playlist'
const PLAYLIST_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface CachedPlaylist {
  tracks: SpotifyTrack[]
  cachedAt: number
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
        const parsedCache: CachedPlaylist = JSON.parse(cached)
        if (Date.now() - parsedCache.cachedAt < PLAYLIST_CACHE_TTL) {
          tracks = parsedCache.tracks
        }
      }

      // Fetch if not cached
      if (tracks.length === 0) {
        const response = await spotifyApi.getPlaylistTracks(TOP_HITS_PLAYLIST_ID, 100)
        tracks = response.items.map(item => item.track)

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
