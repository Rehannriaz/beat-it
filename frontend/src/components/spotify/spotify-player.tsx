'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSpotifyPlayer } from '@/hooks/use-spotify-player'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react'

interface SpotifyPlayerProps {
  trackUri?: string
  onPositionChange?: (position: number) => void
  isPaused?: boolean // External control for pause/resume
  shouldReset?: boolean // When true, reset position to 0 when game starts
}

export function SpotifyPlayer({ trackUri, onPositionChange, isPaused: externalIsPaused, shouldReset }: SpotifyPlayerProps) {
  const {
    isReady,
    isPlaying,
    currentTrack,
    position,
    duration,
    volume,
    error,
    play,
    pause,
    resume,
    togglePlay,
    seek,
    setVolume,
  } = useSpotifyPlayer()

  const [isMuted, setIsMuted] = useState(false)
  const previousVolumeRef = useRef(volume)
  const lastExternalPauseStateRef = useRef<boolean | undefined>(undefined)

  // Notify parent of position changes
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(position)
    }
  }, [position, onPositionChange])

  // Track the last URI to detect changes
  const lastUriRef = useRef<string | undefined>(undefined)
  const lastShouldResetRef = useRef(false)
  
  // Reset position when shouldReset becomes true (game starts)
  useEffect(() => {
    if (shouldReset && !lastShouldResetRef.current && isReady && currentTrack) {
      // Game just started - reset position to 0
      console.log('Resetting Spotify position to 0 for game start')
      seek(0).catch((err) => {
        // Ignore errors if player isn't ready yet
        if (!err.message?.includes('not ready') && !err.message?.includes('no list')) {
          console.error('Failed to reset position:', err)
        }
      })
      // Notify parent of reset
      if (onPositionChange) {
        onPositionChange(0)
      }
    }
    lastShouldResetRef.current = shouldReset || false
  }, [shouldReset, isReady, currentTrack, seek, onPositionChange])
  
  // Stop previous track when URI changes (even in menu)
  useEffect(() => {
    // If we have a current track playing and trackUri changes or becomes undefined, stop it
    if (isReady && currentTrack && currentTrack.uri !== trackUri) {
      // Different track or trackUri removed - stop current playback
      pause().catch(() => {
        // Ignore errors - track might already be stopped
      })
    }
  }, [trackUri, isReady, currentTrack, pause])
  
  // Play track when URI changes - but ONLY when game is playing (shouldReset is true)
  useEffect(() => {
    // Don't play if game is not started - we're still in menu
    if (!trackUri || !isReady || !shouldReset) {
      return
    }
    
    // Only play if URI actually changed
    if (lastUriRef.current === trackUri) return
    if (currentTrack?.uri === trackUri) {
      lastUriRef.current = trackUri
      return
    }
    
    console.log('Playing new track (game started):', trackUri)
    lastUriRef.current = trackUri
    
    // First pause any current playback, then reset and play new track
    pause()
      .then(() => seek(0))
      .then(() => {
        // Small delay to ensure previous track is stopped
        return new Promise(resolve => setTimeout(resolve, 100))
      })
      .then(() => {
        // Play the track - Spotify will start from the beginning
        return play(trackUri)
      })
      .catch((err) => {
        // Ignore common errors that happen during transitions
        if (!err.message?.includes('not ready') && 
            !err.message?.includes('no list') &&
            !err.message?.includes('not allowed')) {
          console.error('Failed to play track:', err)
        }
      })
  }, [trackUri, isReady, shouldReset, play, pause, seek, currentTrack?.uri])

  // Sync with external pause/resume control
  useEffect(() => {
    if (externalIsPaused === undefined || !isReady || !currentTrack) return

    // Only sync if the external pause state has actually changed
    if (lastExternalPauseStateRef.current === externalIsPaused) return
    lastExternalPauseStateRef.current = externalIsPaused

    const syncPlayback = async () => {
      try {
        if (externalIsPaused && isPlaying) {
          // External wants paused, but we're playing
          console.log('Pausing Spotify due to game pause')
          await pause()
        } else if (!externalIsPaused && !isPlaying) {
          // External wants playing, but we're paused
          console.log('Resuming Spotify due to game resume')
          await resume()
        }
      } catch (error) {
        console.error('Failed to sync Spotify playback:', error)
      }
    }

    syncPlayback()
  }, [externalIsPaused, isReady, isPlaying, currentTrack, pause, resume])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newPosition = percentage * duration
    
    seek(newPosition).catch(console.error)
  }

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolumeRef.current || 0.5)
      setIsMuted(false)
    } else {
      previousVolumeRef.current = volume
      setVolume(0)
      setIsMuted(true)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
        {error}
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="p-4 bg-muted rounded-md space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          Connecting to Spotify player...
        </div>
        {error && (
          <div className="text-center text-xs text-red-500 mt-2">
            {error}
          </div>
        )}
        <div className="text-center text-xs text-muted-foreground mt-2">
          Make sure you have Spotify Premium and the Spotify app is open
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      {currentTrack && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          {currentTrack.album.images[0] && (
            <img
              src={currentTrack.album.images[0].url}
              alt={currentTrack.album.name}
              className="w-12 h-12 rounded object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{currentTrack.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* Progress bar */}
        <div
          className="w-full h-2 bg-muted rounded-full cursor-pointer relative group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: duration ? `${(position / duration) * 100}%` : '0%' }}
          />
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: duration ? `${(position / duration) * 100}%` : '0%', marginLeft: '-8px' }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 text-right">
              {formatTime(position)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => seek(Math.max(0, position - 10))}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => seek(Math.min(duration, position + 10))}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value)
                setVolume(newVolume)
                if (newVolume > 0) setIsMuted(false)
              }}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
