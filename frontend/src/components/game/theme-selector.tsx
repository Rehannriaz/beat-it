'use client'

import { motion } from 'framer-motion'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

interface ThemeSelectorProps {
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
}

const themes: Theme[] = ['vaporwave', 'retro', 'cyberpunk', 'minimal']

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {themes.map(theme => {
        const styles = themeStyles[theme]
        const isSelected = currentTheme === theme

        return (
          <motion.button
            key={theme}
            onClick={() => onThemeChange(theme)}
            className="relative px-4 py-2 rounded-lg font-medium text-sm uppercase tracking-wider transition-all"
            style={{
              background: isSelected 
                ? styles.laneColors[0] 
                : 'rgba(255,255,255,0.1)',
              color: isSelected ? '#000' : styles.textColor,
              boxShadow: isSelected 
                ? `0 0 20px ${styles.laneColors[0]}80` 
                : 'none'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {styles.name}
            {isSelected && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 rounded-lg"
                style={{
                  border: `2px solid ${styles.laneColors[0]}`,
                  boxShadow: `0 0 10px ${styles.laneColors[0]}`
                }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
