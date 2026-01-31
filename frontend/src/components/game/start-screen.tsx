'use client'

import { motion } from 'framer-motion'
import type { Theme } from '@/lib/game-types'
import { themeStyles, LANE_KEYS } from '@/lib/game-types'

interface StartScreenProps {
  theme: Theme
  onStart: () => void
}

export function StartScreen({ theme, onStart }: StartScreenProps) {
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
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`text-5xl md:text-6xl font-bold mb-4 text-center ${styles.font}`}
        style={{ 
          color: styles.textColor,
          textShadow: `0 0 40px ${styles.glowColor}, 0 0 80px ${styles.glowColor}40`
        }}
      >
        RHYTHM RUSH
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg mb-8 opacity-70"
        style={{ color: styles.textColor }}
      >
        Hit the tiles when they reach the line
      </motion.p>

      {/* Key instructions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-3 mb-8"
      >
        {LANE_KEYS.map((key, index) => (
          <div
            key={key}
            className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: `${styles.laneColors[index]}30`,
              color: styles.laneColors[index],
              border: `2px solid ${styles.laneColors[index]}60`,
              boxShadow: `0 0 15px ${styles.laneColors[index]}40`
            }}
          >
            {key}
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onStart}
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
        Start Game
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 text-sm opacity-50"
        style={{ color: styles.textColor }}
      >
        Press ESC to pause • Click or tap lanes on mobile
      </motion.p>
    </motion.div>
  )
}
