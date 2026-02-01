'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { LANE_KEYS } from '@/lib/game-types'
import type { GamePattern, PatternTile } from '@/lib/pattern-types'

export interface Tile3D {
  id: string
  lane: number
  z: number
  hit: boolean
  missed: boolean
  type: 'normal' | 'hold' | 'rapid'
  beatStrength: number
  targetTime: number
  // Hold tile properties
  holdDuration?: number
  holdProgress?: number      // 0-1, how much held so far
  isHolding?: boolean        // Currently being held
  holdStartZ?: number        // Z position when hold started
  // Rapid tile properties
  rapidCount?: number
  rapidHitsRemaining?: number
}

export interface GameState3D {
  tiles: Tile3D[]
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  gameTime: number
  lastHitFeedback: { lane: number; type: 'perfect' | 'good' | 'miss'; time: number } | null
}

const DEFAULT_SPEED = 15
const DEFAULT_HIT_TOLERANCE = 3
const DEFAULT_SPAWN_OFFSET = 2.5 // Reduced to make tiles arrive earlier

const SPAWN_DISTANCE = -70

// Calculate hit zone Z position to match the visual pink stripe
// This must match the getHitZoneZ function in road.tsx
function getHitZoneZ(scale: number): number {
  if (scale < 0.7) return -2.0
  if (scale < 0.85) return -1.5
  return -1.0
}

// Calculate responsive scale based on window width (must match useResponsiveScale)
function calculateScale(): number {
  if (typeof window === 'undefined') return 1.0
  const width = window.innerWidth
  if (width < 400) return 0.55
  if (width < 640) return 0.65
  if (width < 768) return 0.8
  if (width < 1024) return 0.9
  return 1.0
}

export type UseGame3DOptions = {
  pattern?: GamePattern | null
  mode?: 'pattern' | 'endless'
  audioUrl?: string | null
  spotifyPosition?: number
}

export function useGame3D(options: UseGame3DOptions = {}) {
  const { pattern, mode = pattern ? 'pattern' : 'endless', audioUrl, spotifyPosition } = options

  const spawnOffset = pattern?.settings?.spawnOffset ?? DEFAULT_SPAWN_OFFSET

  const speed = mode === 'pattern' && pattern
    ? Math.abs(SPAWN_DISTANCE) / spawnOffset
    : DEFAULT_SPEED

  const hitTolerance = pattern?.settings?.hitTolerance
    ? pattern.settings.hitTolerance / 4
    : DEFAULT_HIT_TOLERANCE

  // Calculate hit zone Z position to match visual pink stripe
  const [hitZoneZ, setHitZoneZ] = useState(() => {
    const scale = calculateScale()
    return getHitZoneZ(scale)
  })

  // Update hit zone Z when window resizes
  useEffect(() => {
    const updateHitZone = () => {
      const scale = calculateScale()
      setHitZoneZ(getHitZoneZ(scale))
    }
    
    updateHitZone()
    window.addEventListener('resize', updateHitZone)
    return () => window.removeEventListener('resize', updateHitZone)
  }, [])

  const [gameState, setGameState] = useState<GameState3D>({
    tiles: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    gameTime: 0,
    lastHitFeedback: null
  })

  // Track pressed keys for visual feedback on road
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set())

  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef<number>(0)
  const spawnedTilesRef = useRef<Set<string>>(new Set())

  const patternRef = useRef(pattern)
  const modeRef = useRef(mode)
  const speedRef = useRef(speed)
  const spawnOffsetRef = useRef(spawnOffset)
  const hitToleranceRef = useRef(hitTolerance)
  const hitZoneZRef = useRef(hitZoneZ)

  patternRef.current = pattern
  modeRef.current = mode
  speedRef.current = speed
  spawnOffsetRef.current = spawnOffset
  hitToleranceRef.current = hitTolerance
  hitZoneZRef.current = hitZoneZ

  const endlessSpawnTimerRef = useRef<number>(0)
  const endlessTileIdRef = useRef<number>(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const spotifyPositionRef = useRef(spotifyPosition)
  spotifyPositionRef.current = spotifyPosition
  
  // Track if we've synced with Spotify for the first time
  const spotifySyncedRef = useRef(false)
  
  // Smoothing/interpolation for Spotify position
  const lastSpotifyPositionRef = useRef<number | undefined>(undefined)
  const lastSpotifyPositionTimeRef = useRef<number>(0)
  const smoothedSpotifyPositionRef = useRef<number | undefined>(undefined)

  // Throttling for button presses to prevent spam from slowing down animation
  const lastHitTimeRef = useRef<Record<number, number>>({})
  const pressedKeysRef = useRef<Set<number>>(new Set())
  const MIN_HIT_INTERVAL = 50 // Minimum milliseconds between hits on the same lane

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.preload = 'auto'
      audioRef.current = audio

      return () => {
        audio.pause()
        audio.src = ''
        audioRef.current = null
      }
    }
  }, [audioUrl])

  const hitTile = useCallback((lane: number) => {
    const now = performance.now()
    const lastHitTime = lastHitTimeRef.current[lane] || 0

    // Throttle: prevent rapid repeated hits on the same lane (but allow rapid tiles to be spammed)
    if (now - lastHitTime < MIN_HIT_INTERVAL) {
      return // Ignore this hit, too soon after the last one
    }

    lastHitTimeRef.current[lane] = now

    setGameState(prev => {
      // Get current hit zone Z position (matches visual pink stripe)
      const currentHitZoneZ = hitZoneZ

      // Tiles are hittable when they're approaching or at the hit zone
      // Allow a window before and slightly after the hit zone for hitting
      // The +1 allows tiles to be hit slightly after passing the hit zone
      const hittableTiles = prev.tiles.filter(
        tile =>
          tile.lane === lane &&
          !tile.hit &&
          !tile.missed &&
          tile.z >= currentHitZoneZ - hitTolerance && tile.z <= currentHitZoneZ + hitTolerance + 1
      )

      if (hittableTiles.length === 0) {
        return {
          ...prev,
          combo: 0,
          lastHitFeedback: { lane, type: 'miss', time: Date.now() }
        }
      }

      // Find the tile closest to the hit zone
      const closestTile = hittableTiles.reduce((closest, tile) =>
        Math.abs(tile.z - currentHitZoneZ) < Math.abs(closest.z - currentHitZoneZ) ? tile : closest
      )

      // Distance from hit zone (where pink stripe actually is)
      const distance = Math.abs(closestTile.z - currentHitZoneZ)

      // Perfect score when tile is well aligned with pink stripe
      const perfectThreshold = 0.7
      const hitType = distance <= perfectThreshold ? 'perfect' : 'good'

      // Handle different tile types
      if (closestTile.type === 'rapid') {
        // Rapid tile: decrement hits remaining
        const hitsRemaining = (closestTile.rapidHitsRemaining ?? 1) - 1
        const isComplete = hitsRemaining <= 0

        const newTiles = prev.tiles.map(tile =>
          tile.id === closestTile.id
            ? { ...tile, rapidHitsRemaining: hitsRemaining, hit: isComplete }
            : tile
        )

        // Score per tap for rapid tiles
        const tapScore = 30 * (Math.floor(prev.combo / 10) + 1)
        const bonusOnComplete = isComplete ? 100 : 0

        return {
          ...prev,
          tiles: newTiles,
          score: prev.score + tapScore + bonusOnComplete,
          combo: isComplete ? prev.combo + 1 : prev.combo,
          maxCombo: isComplete ? Math.max(prev.maxCombo, prev.combo + 1) : prev.maxCombo,
          lastHitFeedback: { lane, type: isComplete ? hitType : 'good', time: Date.now() }
        }
      }

      if (closestTile.type === 'hold') {
        // Hold tile: start holding
        const newTiles = prev.tiles.map(tile =>
          tile.id === closestTile.id
            ? { ...tile, isHolding: true, holdStartZ: tile.z }
            : tile
        )

        return {
          ...prev,
          tiles: newTiles,
          lastHitFeedback: { lane, type: 'good', time: Date.now() }
        }
      }

      // Normal tile: mark as hit immediately
      const newTiles = prev.tiles.map(tile =>
        tile.id === closestTile.id ? { ...tile, hit: true } : tile
      )

      const newCombo = prev.combo + 1
      const baseScore = hitType === 'perfect' ? 150 : 100
      const beatBonus = Math.floor((closestTile.beatStrength || 0.5) * 50)
      const comboMultiplier = Math.floor(newCombo / 10) + 1
      const scoreIncrease = (baseScore + beatBonus) * comboMultiplier

      return {
        ...prev,
        tiles: newTiles,
        score: prev.score + scoreIncrease,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        lastHitFeedback: { lane, type: hitType, time: Date.now() }
      }
    })
  }, [hitTolerance, hitZoneZ])

  // Release hold tiles when key is released
  const releaseTile = useCallback((lane: number) => {
    setGameState(prev => {
      const holdingTile = prev.tiles.find(
        tile => tile.lane === lane && tile.type === 'hold' && tile.isHolding && !tile.hit && !tile.missed
      )

      if (!holdingTile) return prev

      const holdProgress = holdingTile.holdProgress ?? 0
      const isComplete = holdProgress >= 0.8 // 80% is good enough

      const newTiles = prev.tiles.map(tile =>
        tile.id === holdingTile.id
          ? { ...tile, isHolding: false, hit: isComplete, missed: !isComplete }
          : tile
      )

      if (isComplete) {
        // Score based on hold completion
        const baseScore = 100
        const holdBonus = Math.floor(holdProgress * 100)
        const comboMultiplier = Math.floor(prev.combo / 10) + 1
        const scoreIncrease = (baseScore + holdBonus) * comboMultiplier

        return {
          ...prev,
          tiles: newTiles,
          score: prev.score + scoreIncrease,
          combo: prev.combo + 1,
          maxCombo: Math.max(prev.maxCombo, prev.combo + 1),
          lastHitFeedback: { lane, type: 'perfect', time: Date.now() }
        }
      } else {
        // Released too early
        return {
          ...prev,
          tiles: newTiles,
          combo: 0,
          lastHitFeedback: { lane, type: 'miss', time: Date.now() }
        }
      }
    })
  }, [])

  const startGame = useCallback(() => {
    spawnedTilesRef.current = new Set()
    endlessTileIdRef.current = 0
    endlessSpawnTimerRef.current = 0
    lastTimeRef.current = performance.now()
    // Reset throttling refs for clean state
    lastHitTimeRef.current = {}
    pressedKeysRef.current = new Set()
    // Reset Spotify sync flag - important: don't sync until position is actually 0
    spotifySyncedRef.current = false

    const currentPattern = patternRef.current
    const isUsingSpotify = spotifyPositionRef.current !== undefined
    console.log('[Game] Starting game', {
      mode: modeRef.current,
      hasPattern: !!currentPattern,
      patternTiles: currentPattern?.tiles?.length ?? 0,
      patternDuration: currentPattern?.metadata?.duration ?? 0,
      patternBpm: currentPattern?.metadata?.bpm ?? 0,
      firstTileTime: currentPattern?.tiles?.[0]?.time ?? 0,
      lastTileTime: currentPattern?.tiles?.[currentPattern?.tiles?.length - 1]?.time ?? 0,
      audioUrl: audioRef.current?.src ?? 'none',
      isUsingSpotify,
      spotifyPosition: spotifyPositionRef.current
    })

    // Always start from spawn offset for pattern mode (tiles need time to spawn)
    // When using Spotify, the position will sync once playback starts at position 0
    const startTime = modeRef.current === 'pattern' ? -spawnOffsetRef.current : 0

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      if (startTime >= 0) {
        audioRef.current.play().catch(console.error)
      }
    }

    setGameState({
      tiles: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      gameTime: startTime,
      lastHitFeedback: null
    })
  }, [])

  const pauseGame = useCallback(() => {
    setGameState(prev => {
      const newPaused = !prev.isPaused
      if (audioRef.current) {
        if (newPaused) {
          audioRef.current.pause()
        } else {
          audioRef.current.play().catch(console.error)
        }
      }
      return { ...prev, isPaused: newPaused }
    })
  }, [])

  const endGame = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    // Reset game state completely to return to menu
    setGameState({
      tiles: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      isPlaying: false,
      isPaused: false,
      gameOver: false,
      gameTime: 0,
      lastHitFeedback: null
    })
    spawnedTilesRef.current = new Set()
    endlessTileIdRef.current = 0
    endlessSpawnTimerRef.current = 0
    // Reset Spotify sync and smoothing state
    spotifySyncedRef.current = false
    lastSpotifyPositionRef.current = undefined
    lastSpotifyPositionTimeRef.current = 0
    smoothedSpotifyPositionRef.current = undefined
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) return

    const gameLoop = (timestamp: number) => {
      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      setGameState(prev => {
        let newGameTime: number
        let newTiles = [...prev.tiles]

        // Determine gameTime based on audio source
        const currentSpotifyPosition = spotifyPositionRef.current
        const isUsingSpotify = currentSpotifyPosition !== undefined
        
        if (isUsingSpotify) {
          // Using Spotify - sync with position but smooth out updates
          if (currentSpotifyPosition >= 0) {
            // Spotify is playing
            // Only sync if position is reasonable (not from previous track)
            // If position is > 2 seconds, it's likely from a previous track - ignore it until it resets
            if (currentSpotifyPosition <= 2 || !spotifySyncedRef.current) {
              // First time syncing: only sync if position is very close to 0 (music just started)
              if (!spotifySyncedRef.current) {
                if (currentSpotifyPosition <= 0.5) {
                  // Position is at start - safe to sync
                  spotifySyncedRef.current = true
                  newGameTime = currentSpotifyPosition
                } else {
                  // Position is too far - wait for it to reset to 0
                  newGameTime = prev.gameTime + deltaTime
                }
              } else {
                // Already synced - use position directly
                newGameTime = currentSpotifyPosition
              }
            } else {
              // Position seems wrong (from previous track) - keep incrementing
              newGameTime = prev.gameTime + deltaTime
            }
          } else {
            // Spotify not started yet - keep incrementing from startTime
            newGameTime = prev.gameTime + deltaTime
          }
        } else if (audioRef.current && !audioRef.current.paused) {
          // Using audio file - sync with audio currentTime
          newGameTime = audioRef.current.currentTime
        } else {
          // No audio - increment normally
          newGameTime = prev.gameTime + deltaTime
        }

        // Handle audio playback start (only for local audio files)
        if (audioRef.current && !isUsingSpotify) {
          if (prev.gameTime < 0 && newGameTime >= 0) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
          }
        }

        const currentMode = modeRef.current
        const currentPattern = patternRef.current
        const currentSpeed = speedRef.current
        const currentSpawnOffset = spawnOffsetRef.current
        const currentHitZoneZ = hitZoneZRef.current

        if (currentMode === 'pattern' && currentPattern?.tiles) {
          // For Spotify: spawn tiles when synced and gameTime is valid
          // Only restrict spawn in the first 0.5 seconds to avoid tiles from previous track
          // After that, spawn normally based on gameTime
          const canSpawnTiles = isUsingSpotify
            ? (currentSpotifyPosition !== undefined && 
               currentSpotifyPosition >= 0 && 
               spotifySyncedRef.current &&
               newGameTime >= -currentSpawnOffset &&
               // Only restrict spawn in the very beginning (first 0.5s) to avoid previous track tiles
               (currentSpotifyPosition >= 0.5 || currentSpotifyPosition < 0.5))
            : (newGameTime >= -currentSpawnOffset)
          
          if (canSpawnTiles) {
            for (const patternTile of currentPattern.tiles) {
              const spawnTime = patternTile.time - currentSpawnOffset

              // Only spawn if we haven't already spawned this tile
              // AND the spawn time is reasonable (not too far in the past)
              // Allow spawning tiles up to 2 seconds in the past to catch up
              if (spawnTime <= newGameTime && 
                  spawnTime >= newGameTime - 2.0 && // Allow catching up tiles up to 2s in the past
                  !spawnedTilesRef.current.has(patternTile.id)) {
                spawnedTilesRef.current.add(patternTile.id)

                const timeUntilHit = patternTile.time - newGameTime
                // Calculate ideal Z position relative to hit zone
                const idealZ = currentHitZoneZ - (currentSpeed * timeUntilHit)
                // Clamp to spawn distance if too far back
                const initialZ = Math.max(SPAWN_DISTANCE, idealZ)

                const tile: Tile3D = {
                  id: patternTile.id,
                  lane: patternTile.lane,
                  z: initialZ,
                  hit: false,
                  missed: false,
                  type: patternTile.type,
                  beatStrength: patternTile.beatStrength ?? 0.5,
                  targetTime: patternTile.time
                }

                // Add hold tile properties
                if (patternTile.type === 'hold' && 'holdDuration' in patternTile) {
                  tile.holdDuration = patternTile.holdDuration
                  tile.holdProgress = 0
                  tile.isHolding = false
                }

                // Add rapid tile properties
                if (patternTile.type === 'rapid' && 'rapidCount' in patternTile) {
                  tile.rapidCount = patternTile.rapidCount
                  tile.rapidHitsRemaining = patternTile.rapidCount
                }

                newTiles.push(tile)
              }
            }
          }
        } else {
          endlessSpawnTimerRef.current += deltaTime * 1000
          const spawnInterval = Math.max(350, 900 - currentSpeed * 20)

          if (endlessSpawnTimerRef.current >= spawnInterval) {
            const lane = Math.floor(Math.random() * 4)
            newTiles.push({
              id: `endless-${endlessTileIdRef.current++}`,
              lane,
              z: SPAWN_DISTANCE,
              hit: false,
              missed: false,
              type: 'normal',
              beatStrength: 0.5 + Math.random() * 0.5,
              targetTime: newGameTime + currentSpawnOffset
            })
            endlessSpawnTimerRef.current = 0
          }
        }

        const currentHitTolerance = hitToleranceRef.current

        if (Math.floor(newGameTime) !== Math.floor(prev.gameTime) && newGameTime > -10) {
          console.log('[Game] State at', newGameTime.toFixed(1) + 's:', {
            activeTiles: newTiles.length,
            spawned: spawnedTilesRef.current.size,
            zRange: newTiles.length > 0 ? [
              Math.min(...newTiles.map(t => t.z)).toFixed(1),
              Math.max(...newTiles.map(t => t.z)).toFixed(1)
            ] : 'none'
          })
        }

        const updatedTiles = newTiles
          .map(tile => {
            // Calculate if tile is in hit zone
            const inHitZone = tile.z >= currentHitZoneZ - currentHitTolerance &&
                              tile.z <= currentHitZoneZ + currentHitTolerance + 1

            // Rapid tiles slow down to 20% speed when in hit zone and not yet completed
            let tileSpeed = currentSpeed
            if (tile.type === 'rapid' && inHitZone && !tile.hit && (tile.rapidHitsRemaining ?? 0) > 0) {
              tileSpeed = currentSpeed * 0.2
            }

            // Update hold progress if tile is being held
            let holdProgress = tile.holdProgress
            if (tile.type === 'hold' && tile.isHolding && tile.holdDuration) {
              const progressIncrement = deltaTime / tile.holdDuration
              holdProgress = Math.min(1, (tile.holdProgress ?? 0) + progressIncrement)
            }

            return {
              ...tile,
              z: tile.z + tileSpeed * deltaTime,
              holdProgress
            }
          })
          .map(tile => {
            // Mark as missed if tile has passed the hit zone
            if (!tile.hit && !tile.missed && tile.z > currentHitZoneZ + currentHitTolerance + 2) {
              // Hold tiles: check if hold was completed
              if (tile.type === 'hold' && (tile.holdProgress ?? 0) >= 0.8) {
                return { ...tile, hit: true } // Close enough - count as hit
              }
              // Rapid tiles: check if some taps were made
              if (tile.type === 'rapid' && tile.rapidCount && tile.rapidHitsRemaining !== undefined) {
                const tapsCompleted = tile.rapidCount - tile.rapidHitsRemaining
                if (tapsCompleted > 0 && tile.rapidHitsRemaining === 0) {
                  return { ...tile, hit: true } // All taps completed
                }
              }
              return { ...tile, missed: true }
            }
            return tile
          })
          .filter(tile => tile.z < 15)

        const newlyMissed = updatedTiles.filter(
          tile => tile.missed && !prev.tiles.find(t => t.id === tile.id)?.missed
        )

        let newCombo = prev.combo
        if (newlyMissed.length > 0) {
          newCombo = 0
        }

        if (currentMode === 'pattern' && currentPattern?.tiles && currentPattern.tiles.length > 0) {
          const allSpawned = spawnedTilesRef.current.size >= currentPattern.tiles.length
          const noActiveTiles = updatedTiles.length === 0
          const minGameTime = 3

          if (allSpawned && noActiveTiles && newGameTime > minGameTime) {
            console.log('[Game] Game Over', {
              gameTime: newGameTime.toFixed(2),
              spawned: spawnedTilesRef.current.size
            })
            if (audioRef.current) {
              audioRef.current.pause()
              audioRef.current.currentTime = 0
            }
            return {
              ...prev,
              tiles: updatedTiles,
              combo: newCombo,
              gameTime: newGameTime,
              isPlaying: false,
              gameOver: true
            }
          }
        }

        return {
          ...prev,
          tiles: updatedTiles,
          combo: newCombo,
          gameTime: newGameTime
        }
      })

      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameState.isPlaying, gameState.isPaused])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState.isPlaying) return

      if (e.key === 'Escape') {
        pauseGame()
        return
      }

      if (gameState.isPaused) return

      const key = e.key.toUpperCase()
      const laneIndex = LANE_KEYS.indexOf(key)

      if (laneIndex !== -1) {
        e.preventDefault()
        
        // Prevent key repeat events from spamming hits
        // Only process if this key wasn't already pressed
        if (!pressedKeysRef.current.has(laneIndex)) {
          pressedKeysRef.current.add(laneIndex)
          hitTile(laneIndex)
        }
        
        // Track key press for visual feedback (continuous while key is held)
        setPressedKeys(prev => new Set(prev).add(laneIndex))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const laneIndex = LANE_KEYS.indexOf(key)
      if (laneIndex !== -1) {
        // Remove from ref so the key can be pressed again
        pressedKeysRef.current.delete(laneIndex)
        setPressedKeys(prev => {
          const next = new Set(prev)
          next.delete(laneIndex)
          return next
        })
        // Release hold tiles when key is released
        releaseTile(laneIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState.isPlaying, gameState.isPaused, hitTile, releaseTile, pauseGame])

  // Debug info for UI
  const currentSpotifyPos = spotifyPositionRef.current
  const smoothedPos = smoothedSpotifyPositionRef.current
  const isUsingSpotify = currentSpotifyPos !== undefined
  const canSpawnDebug = isUsingSpotify
    ? (currentSpotifyPos !== undefined && 
       currentSpotifyPos >= 0 && 
       spotifySyncedRef.current &&
       gameState.gameTime >= -(pattern?.settings?.spawnOffset ?? DEFAULT_SPAWN_OFFSET))
    : true
  
  // Calculate sync metrics
  const syncDifference = isUsingSpotify && currentSpotifyPos !== undefined
    ? gameState.gameTime - currentSpotifyPos
    : null
  const smoothedSyncDifference = isUsingSpotify && smoothedPos !== undefined
    ? gameState.gameTime - smoothedPos
    : null
  
  // Track jitter (variation in sync difference) - simple moving average
  const jitterRef = useRef<number[]>([])
  if (syncDifference !== null) {
    jitterRef.current.push(Math.abs(syncDifference))
    if (jitterRef.current.length > 60) { // Keep last 60 frames (~1 second at 60fps)
      jitterRef.current.shift()
    }
  }
  const avgJitter = jitterRef.current.length > 0
    ? jitterRef.current.reduce((a, b) => a + b, 0) / jitterRef.current.length
    : 0
  
  // Estimate latency (time since last position update)
  const latency = isUsingSpotify && lastSpotifyPositionTimeRef.current > 0
    ? (performance.now() - lastSpotifyPositionTimeRef.current) / 1000
    : null
  
  const debugInfo = {
    gameTime: gameState.gameTime,
    spotifyPosition: currentSpotifyPos,
    smoothedPosition: smoothedPos,
    spotifySynced: spotifySyncedRef.current,
    isUsingSpotify: isUsingSpotify,
    spawnedTilesCount: spawnedTilesRef.current.size,
    activeTilesCount: gameState.tiles.length,
    patternTilesCount: pattern?.tiles?.length ?? 0,
    canSpawn: canSpawnDebug,
    spawnOffset: pattern?.settings?.spawnOffset ?? DEFAULT_SPAWN_OFFSET,
    firstTileTime: pattern?.tiles?.[0]?.time ?? 0,
    nextTileToSpawn: (() => {
      if (!pattern?.tiles) return null
      // Find next tile that hasn't been spawned yet, sorted by time
      const sortedTiles = [...pattern.tiles].sort((a, b) => a.time - b.time)
      const nextTile = sortedTiles.find(t => !spawnedTilesRef.current.has(t.id) && t.time > gameState.gameTime)
      return nextTile?.time ?? null
    })(),
    // Debug: show first few tiles of pattern
    firstFewTiles: pattern?.tiles?.slice(0, 10).map(t => ({ time: t.time, lane: t.lane, type: t.type })) ?? [],
    // Check if pattern tiles are sorted
    tilesSorted: (() => {
      if (!pattern?.tiles || pattern.tiles.length < 2) return true
      for (let i = 1; i < pattern.tiles.length; i++) {
        if (pattern.tiles[i].time < pattern.tiles[i - 1].time) return false
      }
      return true
    })(),
    syncDifference: syncDifference,
    smoothedSyncDifference: smoothedSyncDifference,
    jitter: avgJitter,
    latency: latency
  }

  return {
    gameState,
    startGame,
    pauseGame,
    endGame,
    hitTile,
    releaseTile,
    pattern,
    mode,
    audioRef,
    speed,
    pressedKeys,
    debugInfo
  }
}
