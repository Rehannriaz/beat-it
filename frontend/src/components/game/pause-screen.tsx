'use client'

import { motion } from 'framer-motion'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

interface PauseScreenProps {
  theme: Theme
  onResume: () => void
  onQuit: () => void
}

export function PauseScreen({ theme, onResume, onQuit }: PauseScreenProps) {
  const styles = themeStyles[theme]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <motion.h2
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`text-4xl font-bold mb-8 ${styles.font}`}
        style={{ 
          color: styles.textColor,
          textShadow: `0 0 40px ${styles.glowColor}`
        }}
      >
        PAUSED
      </motion.h2>

      <div className="space-y-4">
        <motion.button
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={onResume}
          className="w-48 px-8 py-3 rounded-lg text-lg font-bold uppercase tracking-wider block"
          style={{
            background: styles.laneColors[0],
            color: '#000',
            boxShadow: `0 0 20px ${styles.laneColors[0]}80`
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Resume
        </motion.button>

        <motion.button
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={onQuit}
          className="w-48 px-8 py-3 rounded-lg text-lg font-bold uppercase tracking-wider block"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: styles.textColor,
            border: `2px solid ${styles.textColor}40`
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Quit
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-sm opacity-50"
        style={{ color: styles.textColor }}
      >
        Press ESC to resume
      </motion.p>
    </motion.div>
  )
}
