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
  targetTime: number // When tile should be hit (in seconds)
}

export interface GameState3D {
  tiles: Tile3D[]
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  gameTime: number // Current game time in seconds
  lastHitFeedback: { lane: number; type: 'perfect' | 'good' | 'miss'; time: number } | null
}

// Default settings (used when no pattern provided)
const DEFAULT_SPEED = 15
const DEFAULT_HIT_TOLERANCE = 3
const DEFAULT_SPAWN_OFFSET = 4 // seconds before hit time to spawn

const HIT_ZONE_Z = 0
const SPAWN_DISTANCE = -70

export type UseGame3DOptions = {
  pattern?: GamePattern | null
  mode?: 'pattern' | 'endless'
}

export function useGame3D(options: UseGame3DOptions = {}) {
  const { pattern, mode = pattern ? 'pattern' : 'endless' } = options

  // Get spawn offset from pattern or default
  const spawnOffset = pattern?.settings?.spawnOffset ?? DEFAULT_SPAWN_OFFSET

  // In pattern mode, speed must be calculated so tiles reach hit zone at exact target time
  // Speed = distance / time = |SPAWN_DISTANCE| / spawnOffset
  const speed = mode === 'pattern' && pattern
    ? Math.abs(SPAWN_DISTANCE) / spawnOffset
    : DEFAULT_SPEED

  const hitTolerance = pattern?.settings?.hitTolerance
    ? pattern.settings.hitTolerance / 4
    : DEFAULT_HIT_TOLERANCE


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

  // Store pattern in ref to avoid effect re-runs on object reference changes
  const patternRef = useRef(pattern)
  const modeRef = useRef(mode)
  const speedRef = useRef(speed)
  const spawnOffsetRef = useRef(spawnOffset)
  const hitToleranceRef = useRef(hitTolerance)

  // Update refs when values change
  patternRef.current = pattern
  modeRef.current = mode
  speedRef.current = speed
  spawnOffsetRef.current = spawnOffset
  hitToleranceRef.current = hitTolerance

  // For endless mode
  const endlessSpawnTimerRef = useRef<number>(0)
  const endlessTileIdRef = useRef<number>(0)

  const hitTile = useCallback((lane: number) => {
    setGameState(prev => {
      const hittableTiles = prev.tiles.filter(
        tile =>
          tile.lane === lane &&
          !tile.hit &&
          !tile.missed &&
          tile.z >= -hitTolerance && tile.z <= hitTolerance + 1
      )

      if (hittableTiles.length === 0) {
        return {
          ...prev,
          combo: 0,
          lastHitFeedback: { lane, type: 'miss', time: Date.now() }
        }
      }

      const closestTile = hittableTiles.reduce((closest, tile) =>
        Math.abs(tile.z) < Math.abs(closest.z) ? tile : closest
      )

      const distance = Math.abs(closestTile.z)
      const hitType = distance < 1.2 ? 'perfect' : 'good'

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
  }, [hitTolerance])

  const startGame = useCallback(() => {
    spawnedTilesRef.current = new Set()
    endlessTileIdRef.current = 0
    endlessSpawnTimerRef.current = 0
    setGameState({
      tiles: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      gameTime: 0,
      lastHitFeedback: null
    })
  }, [])

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPlaying: false, gameOver: true }))
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) return

    const gameLoop = (timestamp: number) => {
      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      setGameState(prev => {
        const newGameTime = prev.gameTime + deltaTime
        let newTiles = [...prev.tiles]

        // Spawn tiles based on mode (use refs to avoid stale closures)
        const currentMode = modeRef.current
        const currentPattern = patternRef.current
        const currentSpeed = speedRef.current
        const currentSpawnOffset = spawnOffsetRef.current

        if (currentMode === 'pattern' && currentPattern?.tiles) {
          // Pattern mode: spawn tiles based on their time
          for (const patternTile of currentPattern.tiles) {
            const spawnTime = patternTile.time - currentSpawnOffset

            if (
              spawnTime <= newGameTime &&
              !spawnedTilesRef.current.has(patternTile.id)
            ) {
              spawnedTilesRef.current.add(patternTile.id)

              // Calculate initial Z position based on time until hit
              // This handles tiles that should have spawned before game started
              const timeUntilHit = patternTile.time - newGameTime
              const idealZ = -(currentSpeed * timeUntilHit)
              // Clamp to spawn distance (don't spawn past hit zone or too far)
              const initialZ = Math.max(SPAWN_DISTANCE, Math.min(-5, idealZ))

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
          // Endless mode: spawn randomly
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

        // Update tile positions
        const currentHitTolerance = hitToleranceRef.current
        const updatedTiles = newTiles
          .map(tile => ({
            ...tile,
            z: tile.z + currentSpeed * deltaTime
          }))
          .map(tile => {
            if (!tile.hit && !tile.missed && tile.z > HIT_ZONE_Z + currentHitTolerance + 2) {
              return { ...tile, missed: true }
            }
            return tile
          })
          .filter(tile => tile.z < 15)

        // Check for missed tiles
        const newlyMissed = updatedTiles.filter(
          tile => tile.missed && !prev.tiles.find(t => t.id === tile.id)?.missed
        )

        let newCombo = prev.combo
        if (newlyMissed.length > 0) {
          newCombo = 0
        }

        // Check if pattern is complete
        if (currentMode === 'pattern' && currentPattern?.tiles) {
          const allSpawned = currentPattern.tiles.every(t => spawnedTilesRef.current.has(t.id))
          const allProcessed = updatedTiles.every(t => t.hit || t.missed)

          if (allSpawned && allProcessed && updatedTiles.length === 0) {
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
  }, [gameState.isPlaying, gameState.isPaused]) // Using refs for pattern/mode/speed to avoid effect re-runs

  // Keyboard controls
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
    mode
  }
}
