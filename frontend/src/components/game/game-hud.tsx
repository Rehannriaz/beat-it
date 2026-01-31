'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { GameState, Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

interface GameHUDProps {
  gameState: GameState
  theme: Theme
}

export function GameHUD({ gameState, theme }: GameHUDProps) {
  const styles = themeStyles[theme]

  const getComboText = () => {
    if (gameState.combo >= 50) return 'LEGENDARY!'
    if (gameState.combo >= 30) return 'AMAZING!'
    if (gameState.combo >= 20) return 'GREAT!'
    if (gameState.combo >= 10) return 'GOOD!'
    if (gameState.combo >= 5) return 'NICE!'
    return ''
  }

  return (
    <div className="w-full max-w-md mx-auto mb-4">
      <div className="flex justify-between items-start">
        {/* Score */}
        <div className="text-left">
          <div 
            className="text-sm uppercase tracking-wider opacity-60"
            style={{ color: styles.textColor }}
          >
            Score
          </div>
          <motion.div 
            key={gameState.score}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold tabular-nums"
            style={{ 
              color: styles.textColor,
              textShadow: `0 0 20px ${styles.glowColor}`
            }}
          >
            {gameState.score.toLocaleString()}
          </motion.div>
        </div>

        {/* Combo */}
        <div className="text-right">
          <div 
            className="text-sm uppercase tracking-wider opacity-60"
            style={{ color: styles.textColor }}
          >
            Combo
          </div>
          <motion.div 
            key={gameState.combo}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold tabular-nums"
            style={{ 
              color: gameState.combo >= 10 ? styles.laneColors[1] : styles.textColor,
              textShadow: gameState.combo >= 10 ? `0 0 30px ${styles.laneColors[1]}` : `0 0 20px ${styles.glowColor}`
            }}
          >
            {gameState.combo}x
          </motion.div>
        </div>
      </div>

      {/* Combo text */}
      <AnimatePresence>
        {getComboText() && (
          <motion.div
            key={getComboText()}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center mt-2 text-2xl font-bold uppercase tracking-wider"
            style={{ 
              color: styles.laneColors[0],
              textShadow: `0 0 30px ${styles.laneColors[0]}`
            }}
          >
            {getComboText()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
