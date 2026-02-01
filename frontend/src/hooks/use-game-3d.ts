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
const DEFAULT_SPAWN_OFFSET = 4

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
      
      // Perfect score only when tile is exactly aligned with pink stripe
      // Use a very tight tolerance for perfect - only when very close to hit zone Z
      // Good score when within hit tolerance but not perfectly aligned
      const perfectThreshold = 0.3 // Very tight - only when almost exactly at hit zone
      const hitType = distance <= perfectThreshold ? 'perfect' : 'good'

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

  const startGame = useCallback(() => {
    spawnedTilesRef.current = new Set()
    endlessTileIdRef.current = 0
    endlessSpawnTimerRef.current = 0
    lastTimeRef.current = performance.now()

    const currentPattern = patternRef.current
    console.log('[Game] Starting game', {
      mode: modeRef.current,
      hasPattern: !!currentPattern,
      patternTiles: currentPattern?.tiles?.length ?? 0,
      patternDuration: currentPattern?.metadata?.duration ?? 0,
      patternBpm: currentPattern?.metadata?.bpm ?? 0,
      firstTileTime: currentPattern?.tiles?.[0]?.time ?? 0,
      lastTileTime: currentPattern?.tiles?.[currentPattern?.tiles?.length - 1]?.time ?? 0,
      audioUrl: audioRef.current?.src ?? 'none'
    })

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
        let newGameTime = prev.gameTime + deltaTime

        // Handle audio playback start
        if (audioRef.current) {
          if (prev.gameTime < 0 && newGameTime >= 0) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
          }
        }

        // Sync to audio/Spotify only occasionally to avoid jitter
        // Only hard-sync when severely out of sync (> 1 second)
        const currentSpotifyPosition = spotifyPositionRef.current
        if (currentSpotifyPosition !== undefined && newGameTime >= 0) {
          const drift = Math.abs(currentSpotifyPosition - newGameTime)
          if (drift > 1.0) {
            newGameTime = currentSpotifyPosition
          }
        } else if (audioRef.current && !audioRef.current.paused && newGameTime >= 0) {
          const drift = Math.abs(audioRef.current.currentTime - newGameTime)
          if (drift > 1.0) {
            newGameTime = audioRef.current.currentTime
          }
        }

        let newTiles = [...prev.tiles]

        const currentMode = modeRef.current
        const currentPattern = patternRef.current
        const currentSpeed = speedRef.current
        const currentSpawnOffset = spawnOffsetRef.current
        const currentHitZoneZ = hitZoneZRef.current

        if (currentMode === 'pattern' && currentPattern?.tiles) {
          for (const patternTile of currentPattern.tiles) {
            const spawnTime = patternTile.time - currentSpawnOffset

            if (spawnTime <= newGameTime && !spawnedTilesRef.current.has(patternTile.id)) {
              spawnedTilesRef.current.add(patternTile.id)

              const timeUntilHit = patternTile.time - newGameTime
              // Calculate ideal Z position relative to hit zone
              // Tile should reach currentHitZoneZ at patternTile.time
              const idealZ = currentHitZoneZ - (currentSpeed * timeUntilHit)
              // Always use ideal position, but clamp to spawn distance if too far back
              const initialZ = Math.max(SPAWN_DISTANCE, idealZ)

              newTiles.push({
                id: patternTile.id,
                lane: patternTile.lane,
                z: initialZ,
                hit: false,
                missed: false,
                type: patternTile.type,
                beatStrength: patternTile.beatStrength ?? 0.5,
                targetTime: patternTile.time
              })
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
            // For pattern mode, always use precise time-based positioning
            // This ensures tiles are always in the correct position relative to hit zone
            if (currentMode === 'pattern' && currentPattern?.tiles) {
              const patternTile = currentPattern.tiles.find(pt => pt.id === tile.id)
              if (patternTile) {
                const timeUntilHit = patternTile.time - newGameTime
                // Calculate ideal Z position relative to hit zone
                // Hit zone is at currentHitZoneZ, so tile should reach currentHitZoneZ at patternTile.time
                const idealZ = currentHitZoneZ - (currentSpeed * timeUntilHit)
                
                // Always use precise positioning for pattern tiles
                // This ensures perfect sync without any visible corrections
                return {
                  ...tile,
                  z: idealZ
                }
              }
            }
            
            // Default movement for endless mode
            return {
              ...tile,
              z: tile.z + currentSpeed * deltaTime
            }
          })
          .map(tile => {
            // Mark as missed if tile has passed the hit zone
            if (!tile.hit && !tile.missed && tile.z > currentHitZoneZ + currentHitTolerance + 2) {
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
        hitTile(laneIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState.isPlaying, gameState.isPaused, hitTile, pauseGame])

  return {
    gameState,
    startGame,
    pauseGame,
    endGame,
    hitTile,
    pattern,
    mode,
    audioRef,
    speed
  }
}
