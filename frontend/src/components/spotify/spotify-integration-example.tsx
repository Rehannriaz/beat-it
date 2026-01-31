'use client'

/**
 * Example component showing how to integrate Spotify player with your rhythm game
 * This demonstrates the complete flow: login -> search -> play -> sync with game
 */

import { useState } from 'react'
import { SpotifyLogin } from './spotify-login'
import { TrackSearch } from './track-search'
import { SpotifyPlayer } from './spotify-player'
import { SpotifyPlayerDebug } from './spotify-player-debug'

interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
  }
  duration_ms: number
  uri: string
}

export function SpotifyIntegrationExample() {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [playbackPosition, setPlaybackPosition] = useState(0)

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track)
    // Here you would:
    // 1. Load the pattern JSON for this track (if it exists)
    // 2. Start the game with the pattern
    // 3. Sync pattern timing with playbackPosition
    console.log('Selected track:', track)
    console.log('Track URI:', track.uri)
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Spotify Integration</h1>
        <SpotifyLogin />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Search for a Track</h2>
        <TrackSearch onTrackSelect={handleTrackSelect} />
      </div>

      {selectedTrack && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Now Playing</h2>
          <SpotifyPlayerDebug />
          <SpotifyPlayer
            trackUri={selectedTrack.uri}
            onPositionChange={setPlaybackPosition}
          />
          
          {/* Example: Use playbackPosition to sync with your game pattern */}
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Playback position: {playbackPosition.toFixed(2)}s
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Use this position to sync your game pattern tiles with the music.
              Spawn tiles based on pattern.tiles[].time matching playbackPosition.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
