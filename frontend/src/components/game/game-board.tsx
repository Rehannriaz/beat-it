'use client'

import { useState, useEffect } from 'react'
import { GameLane } from './game-lane'
import type { GameState, Theme } from '@/lib/game-types'
import { themeStyles, LANE_COUNT, LANE_KEYS } from '@/lib/game-types'

interface GameBoardProps {
  gameState: GameState
  theme: Theme
  onHit: (lane: number) => void
}

export function GameBoard({ gameState, theme, onHit }: GameBoardProps) {
  const styles = themeStyles[theme]
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const laneIndex = LANE_KEYS.indexOf(key)
      if (laneIndex !== -1) {
        setPressedKeys(prev => new Set(prev).add(laneIndex))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const laneIndex = LANE_KEYS.indexOf(key)
      if (laneIndex !== -1) {
        setPressedKeys(prev => {
          const next = new Set(prev)
          next.delete(laneIndex)
          return next
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return (
    <div 
      className="relative w-full max-w-md h-[70vh] mx-auto rounded-lg overflow-hidden border border-white/20"
      style={{
        background: styles.background,
        boxShadow: `0 0 60px ${styles.glowColor}40, inset 0 0 100px rgba(0,0,0,0.5)`
      }}
    >
      {/* Scanlines effect for retro/cyberpunk */}
      {(theme === 'retro' || theme === 'cyberpunk') && (
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
          }}
        />
      )}

      {/* Vaporwave grid effect */}
      {theme === 'vaporwave' && (
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,113,206,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,113,206,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg) translateY(-50%)',
            transformOrigin: 'bottom'
          }}
        />
      )}

      {/* Lanes container */}
      <div className="relative h-full flex">
        {Array.from({ length: LANE_COUNT }).map((_, index) => (
          <GameLane
            key={index}
            laneIndex={index}
            tiles={gameState.tiles.filter(tile => tile.lane === index)}
            theme={theme}
            onHit={onHit}
            isPressed={pressedKeys.has(index)}
          />
        ))}
      </div>

      {/* Top gradient fade */}
      <div 
        className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${styles.background.split(',')[1]?.replace(')', '') || '#0a0a0f'} 0%, transparent 100%)`
        }}
      />
    </div>
  )
}
