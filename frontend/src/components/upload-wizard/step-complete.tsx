'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Play, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Theme } from '@/lib/game-types'
import type { Song } from '@/types/api'
import { themeStyles } from '@/lib/game-types'

interface StepCompleteProps {
  theme: Theme
  song: Song
  onPlayNow: () => void
  onBackToMenu: () => void
}

export function StepComplete({ theme, song, onPlayNow, onBackToMenu }: StepCompleteProps) {
  const styles = themeStyles[theme]
  const pattern = song.pattern

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <CheckCircle
          className="w-20 h-20 mx-auto"
          style={{ color: styles.glowColor }}
        />
      </motion.div>

      <div>
        <h3
          className="text-2xl font-bold mb-1"
          style={{ color: styles.textColor }}
        >
          Pattern Ready!
        </h3>
        <p className="opacity-60" style={{ color: styles.textColor }}>
          Your song is ready to play
        </p>
      </div>

      <div
        className="p-4 rounded-xl"
        style={{ background: `${styles.glowColor}10` }}
      >
        <p className="font-semibold text-lg" style={{ color: styles.textColor }}>
          {song.title}
        </p>
        {song.artist && (
          <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
            {song.artist}
          </p>
        )}
        {pattern && (
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <span style={{ color: styles.laneColors[0] }}>
              {pattern.metadata.bpm} BPM
            </span>
            <span style={{ color: styles.laneColors[1] }}>
              {pattern.tiles.length} tiles
            </span>
            <span style={{ color: styles.laneColors[2] }}>
              {pattern.metadata.difficulty}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onBackToMenu}
          variant="outline"
          className="flex-1 bg-transparent"
          style={{
            borderColor: styles.textColor,
            color: styles.textColor,
          }}
        >
          <Home className="w-4 h-4 mr-2" />
          Menu
        </Button>
        <Button
          onClick={onPlayNow}
          className="flex-1"
          style={{
            background: styles.glowColor,
            color: '#000',
          }}
        >
          <Play className="w-4 h-4 mr-2" />
          Play Now
        </Button>
      </div>
    </motion.div>
  )
}
