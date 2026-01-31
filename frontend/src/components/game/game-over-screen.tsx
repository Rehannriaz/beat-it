'use client'

import { motion } from 'framer-motion'
import type { GameState, Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

interface GameOverScreenProps {
  gameState: GameState
  theme: Theme
  onRestart: () => void
}

export function GameOverScreen({ gameState, theme, onRestart }: GameOverScreenProps) {
  const styles = themeStyles[theme]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <motion.h2
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className={`text-4xl md:text-5xl font-bold mb-8 ${styles.font}`}
        style={{ 
          color: styles.textColor,
          textShadow: `0 0 40px ${styles.glowColor}`
        }}
      >
        GAME OVER
      </motion.h2>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center mb-8 space-y-4"
      >
        <div>
          <div className="text-sm uppercase tracking-wider opacity-60" style={{ color: styles.textColor }}>
            Final Score
          </div>
          <div 
            className="text-5xl font-bold"
            style={{ 
              color: styles.laneColors[0],
              textShadow: `0 0 30px ${styles.laneColors[0]}`
            }}
          >
            {gameState.score.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-sm uppercase tracking-wider opacity-60" style={{ color: styles.textColor }}>
            Max Combo
          </div>
          <div 
            className="text-3xl font-bold"
            style={{ 
              color: styles.laneColors[1],
              textShadow: `0 0 20px ${styles.laneColors[1]}`
            }}
          >
            {gameState.maxCombo}x
          </div>
        </div>
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onRestart}
        className="px-10 py-4 rounded-lg text-xl font-bold uppercase tracking-wider"
        style={{
          background: styles.laneColors[0],
          color: '#000',
          boxShadow: `0 0 30px ${styles.laneColors[0]}80`
        }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: `0 0 50px ${styles.laneColors[0]}`
        }}
        whileTap={{ scale: 0.95 }}
      >
        Play Again
      </motion.button>
    </motion.div>
  )
}
