'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Theme } from '@/lib/game-types'
import { LANE_KEYS, LANE_COUNT } from '@/lib/game-types'

export interface Tile3D {
  id: string
  lane: number
  z: number // distance from player (0 = at hit zone, negative = behind, positive = approaching)
  hit: boolean
  missed: boolean
  createdAt: number
}

export interface GameState3D {
  tiles: Tile3D[]
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  speed: number
  lastHitFeedback: { lane: number; type: 'perfect' | 'good' | 'miss'; time: number } | null
}

const INITIAL_SPEED = 15
const SPEED_INCREMENT = 0.3
const SPAWN_INTERVAL_BASE = 900
const MIN_SPAWN_INTERVAL = 350
const SPAWN_DISTANCE = -70 // Tiles spawn far away (negative Z = into the screen)
const HIT_ZONE_Z = 0 // Where the hit zone is (Z = 0)
const HIT_TOLERANCE = 3 // Units of tolerance for hitting

export function useGame3D() {
  const [gameState, setGameState] = useState<GameState3D>({
    tiles: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    speed: INITIAL_SPEED,
    lastHitFeedback: null
  })

  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const spawnTimerRef = useRef<number>(0)
  const tileIdRef = useRef<number>(0)

  const spawnTile = useCallback(() => {
    const lane = Math.floor(Math.random() * LANE_COUNT)
    const newTile: Tile3D = {
      id: `tile-${tileIdRef.current++}`,
      lane,
      z: SPAWN_DISTANCE,
      hit: false,
      missed: false,
      createdAt: Date.now()
    }
    setGameState(prev => ({
      ...prev,
      tiles: [...prev.tiles, newTile]
    }))
  }, [])

  const hitTile = useCallback((lane: number) => {
    setGameState(prev => {
      // Find tiles in this lane that are near the hit zone (z close to 0)
      const hittableTiles = prev.tiles.filter(
        tile => 
          tile.lane === lane && 
          !tile.hit && 
          !tile.missed &&
          tile.z >= -HIT_TOLERANCE && tile.z <= HIT_TOLERANCE + 1
      )

      if (hittableTiles.length === 0) {
        // Missed press - reset combo
        return { 
          ...prev, 
          combo: 0,
          lastHitFeedback: { lane, type: 'miss', time: Date.now() }
        }
      }

      // Find closest tile to hit zone (z = 0)
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
      const comboMultiplier = Math.floor(newCombo / 10) + 1
      const scoreIncrease = baseScore * comboMultiplier

      return {
        ...prev,
        tiles: newTiles,
        score: prev.score + scoreIncrease,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        speed: Math.min(prev.speed + SPEED_INCREMENT * 0.05, 25),
        lastHitFeedback: { lane, type: hitType, time: Date.now() }
      }
    })
  }, [])

  const startGame = useCallback(() => {
    tileIdRef.current = 0
    setGameState({
      tiles: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      speed: INITIAL_SPEED,
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
      const deltaTime = (timestamp - lastTimeRef.current) / 1000 // Convert to seconds
      lastTimeRef.current = timestamp

      // Spawn tiles
      spawnTimerRef.current += deltaTime * 1000
      const spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        SPAWN_INTERVAL_BASE - gameState.speed * 20
      )
      
      if (spawnTimerRef.current >= spawnInterval) {
        spawnTile()
        spawnTimerRef.current = 0
      }

      // Update tile positions
      setGameState(prev => {
        const updatedTiles = prev.tiles
          .map(tile => ({
            ...tile,
            z: tile.z + prev.speed * deltaTime // Move towards camera (positive Z)
          }))
          .map(tile => {
            // Mark as missed if past hit zone (z > hit zone + tolerance)
            if (!tile.hit && !tile.missed && tile.z > HIT_ZONE_Z + HIT_TOLERANCE + 2) {
              return { ...tile, missed: true }
            }
            return tile
          })
          .filter(tile => tile.z < 15) // Remove tiles that have passed the camera

        // Check for missed tiles
        const newlyMissed = updatedTiles.filter(
          tile => tile.missed && !prev.tiles.find(t => t.id === tile.id)?.missed
        )

        let newCombo = prev.combo
        if (newlyMissed.length > 0) {
          newCombo = 0
        }

        return {
          ...prev,
          tiles: updatedTiles,
          combo: newCombo
        }
      })

      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    lastTimeRef.current = performance.now()
    spawnTimerRef.current = 0
    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.speed, spawnTile])

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
    hitTile
  }
}
