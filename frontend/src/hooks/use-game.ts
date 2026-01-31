'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Tile, GameState } from '@/lib/game-types'
import { LANE_KEYS, LANE_COUNT, HIT_ZONE_Y, HIT_TOLERANCE } from '@/lib/game-types'

const INITIAL_SPEED = 0.4
const SPEED_INCREMENT = 0.02
const SPAWN_INTERVAL_BASE = 800
const MIN_SPAWN_INTERVAL = 300

export function useGame() {
  const [gameState, setGameState] = useState<GameState>({
    tiles: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    speed: INITIAL_SPEED
  })

  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const spawnTimerRef = useRef<number>(0)
  const tileIdRef = useRef<number>(0)

  const spawnTile = useCallback(() => {
    const lane = Math.floor(Math.random() * LANE_COUNT)
    const newTile: Tile = {
      id: `tile-${tileIdRef.current++}`,
      lane,
      y: -15,
      hit: false,
      missed: false
    }
    setGameState(prev => ({
      ...prev,
      tiles: [...prev.tiles, newTile]
    }))
  }, [])

  const hitTile = useCallback((lane: number) => {
    setGameState(prev => {
      const hitIndex = prev.tiles.findIndex(
        tile => 
          tile.lane === lane && 
          !tile.hit && 
          !tile.missed &&
          Math.abs(tile.y - HIT_ZONE_Y) <= HIT_TOLERANCE
      )

      if (hitIndex === -1) {
        // Missed press - reset combo
        return { ...prev, combo: 0 }
      }

      const newTiles = [...prev.tiles]
      newTiles[hitIndex] = { ...newTiles[hitIndex], hit: true }

      const newCombo = prev.combo + 1
      const baseScore = 100
      const comboMultiplier = Math.floor(newCombo / 10) + 1
      const scoreIncrease = baseScore * comboMultiplier

      return {
        ...prev,
        tiles: newTiles,
        score: prev.score + scoreIncrease,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        speed: Math.min(prev.speed + SPEED_INCREMENT * 0.01, 1.2)
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
      speed: INITIAL_SPEED
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
      const deltaTime = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // Spawn tiles
      spawnTimerRef.current += deltaTime
      const spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        SPAWN_INTERVAL_BASE - gameState.speed * 300
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
            y: tile.y + prev.speed * deltaTime * 0.05
          }))
          .map(tile => {
            // Mark as missed if past hit zone
            if (!tile.hit && !tile.missed && tile.y > HIT_ZONE_Y + HIT_TOLERANCE + 5) {
              return { ...tile, missed: true }
            }
            return tile
          })
          .filter(tile => tile.y < 110)

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
    if (!gameState.isPlaying || gameState.isPaused) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const laneIndex = LANE_KEYS.indexOf(key)
      
      if (laneIndex !== -1) {
        e.preventDefault()
        hitTile(laneIndex)
      }

      if (e.key === 'Escape') {
        pauseGame()
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
