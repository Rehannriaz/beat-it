'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause } from 'lucide-react'
import type { Theme } from '@/lib/game-types'
import type { GameState3D } from '@/hooks/use-game-3d'
import { themeStyles } from '@/lib/game-types'

interface HUD3DProps {
  gameState: GameState3D
  theme: Theme
  onPause?: () => void
}

// Pause button with hover effect
function PauseButton({ onClick, glowColor, textColor }: { onClick: () => void; glowColor: string; textColor: string }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.button
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 pointer-events-auto
                 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                 transition-all duration-200 cursor-pointer"
      style={{
        background: isHovered ? `${glowColor}60` : `${glowColor}30`,
        border: `2px solid ${glowColor}`,
        boxShadow: isHovered ? `0 0 30px ${glowColor}` : `0 0 15px ${glowColor}40`,
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      <Pause className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: textColor }} />
    </motion.button>
  )
}

function getComboText(combo: number): string | null {
  if (combo >= 50) return 'LEGENDARY!'
  if (combo >= 30) return 'AMAZING!'
  if (combo >= 15) return 'GREAT!'
  if (combo >= 5) return 'NICE!'
  return null
}

export function HUD3D({ gameState, theme, onPause }: HUD3DProps) {
  const styles = themeStyles[theme]
  const comboText = getComboText(gameState.combo)

  // Track visible states for auto-hiding feedback
  const [visibleComboText, setVisibleComboText] = useState<string | null>(null)
  const [visibleHitFeedback, setVisibleHitFeedback] = useState<typeof gameState.lastHitFeedback>(null)

  // Auto-hide combo text after 2 seconds
  useEffect(() => {
    if (comboText) {
      setVisibleComboText(comboText)
      const timer = setTimeout(() => {
        setVisibleComboText(null)
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setVisibleComboText(null)
    }
  }, [comboText, gameState.combo]) // Reset timer when combo changes

  // Auto-hide hit feedback after 2 seconds
  useEffect(() => {
    if (gameState.lastHitFeedback) {
      setVisibleHitFeedback(gameState.lastHitFeedback)
      const timer = setTimeout(() => {
        setVisibleHitFeedback(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState.lastHitFeedback?.time]) // Reset timer on each new hit

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Pause button - top center */}
      {onPause && (
        <PauseButton onClick={onPause} glowColor={styles.glowColor} textColor={styles.textColor} />
      )}

      {/* Score - compact on mobile to save space */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-1 sm:top-2 md:top-4 lg:top-6 left-1 sm:left-2 md:left-4 lg:left-6"
      >
        <p 
          className="text-[10px] sm:text-xs md:text-sm uppercase tracking-widest opacity-60"
          style={{ color: styles.textColor }}
        >
          Score
        </p>
        <p 
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tabular-nums"
          style={{ 
            color: styles.textColor,
            textShadow: `0 0 20px ${styles.glowColor}`
          }}
        >
          {gameState.score.toLocaleString()}
        </p>
      </motion.div>

      {/* Combo - compact on mobile to save space */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-1 sm:top-2 md:top-4 lg:top-6 right-1 sm:right-2 md:right-4 lg:right-6 text-right"
      >
        <p 
          className="text-[10px] sm:text-xs md:text-sm uppercase tracking-widest opacity-60"
          style={{ color: styles.textColor }}
        >
          Combo
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={gameState.combo}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tabular-nums"
            style={{ 
              color: styles.laneColors[gameState.combo % 4],
              textShadow: `0 0 20px ${styles.laneColors[gameState.combo % 4]}`
            }}
          >
            {gameState.combo}x
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Combo text feedback - smaller on mobile, auto-hides after 2s */}
      <AnimatePresence>
        {visibleComboText && (
          <motion.div
            key={`${visibleComboText}-${gameState.combo}`}
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.5, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 10 }}
            className="absolute top-[15%] sm:top-1/4 left-1/2 -translate-x-1/2 px-4"
          >
            <p
              className={`text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold ${styles.font}`}
              style={{
                color: styles.laneColors[gameState.combo % 4],
                textShadow: `0 0 30px ${styles.laneColors[gameState.combo % 4]}, 0 0 60px ${styles.laneColors[gameState.combo % 4]}`
              }}
            >
              {visibleComboText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hit feedback */}
      <AnimatePresence>
        {gameState.lastHitFeedback && (
          <motion.div
            key={gameState.lastHitFeedback.time}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-24 sm:bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 px-4"
          >
            <p
              className="text-lg sm:text-xl font-bold uppercase"
              style={{
                color: gameState.lastHitFeedback.type === 'miss' 
                  ? '#ff4444' 
                  : gameState.lastHitFeedback.type === 'perfect'
                    ? '#00ff88'
                    : styles.textColor,
                textShadow: gameState.lastHitFeedback.type === 'perfect'
                  ? '0 0 20px #00ff88'
                  : undefined
              }}
            >
              {gameState.lastHitFeedback.type === 'perfect' && 'PERFECT!'}
              {gameState.lastHitFeedback.type === 'good' && 'GOOD'}
              {gameState.lastHitFeedback.type === 'miss' && 'MISS'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed indicator - minimal on mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-1 sm:bottom-2 md:bottom-4 lg:bottom-6 left-1 sm:left-2 md:left-4 lg:left-6"
      >
        <p 
          className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest opacity-40"
          style={{ color: styles.textColor }}
        >
          Time: {gameState.gameTime.toFixed(1)}s
        </p>
      </motion.div>

      {/* Controls hint - hidden on mobile to save space */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-1 sm:bottom-2 md:bottom-4 lg:bottom-6 right-1 sm:right-2 md:right-4 lg:right-6 hidden md:block"
      >
        <p 
          className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest opacity-40"
          style={{ color: styles.textColor }}
        >
          D F J K to hit | ESC to pause
        </p>
      </motion.div>
    </div>
  )
}
