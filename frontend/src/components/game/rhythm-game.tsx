'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '@/hooks/use-game'
import { GameBoard } from './game-board'
import { GameHUD } from './game-hud'
import { ThemeSelector } from './theme-selector'
import { StartScreen } from './start-screen'
import { GameOverScreen } from './game-over-screen'
import { PauseScreen } from './pause-screen'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

export function RhythmGame() {
  const [theme, setTheme] = useState<Theme>('vaporwave')
  const { gameState, startGame, pauseGame, endGame, hitTile } = useGame()
  const styles = themeStyles[theme]

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-500"
      style={{ background: styles.background }}
    >
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated particles/stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: styles.laneColors[i % 4],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: `0 0 10px ${styles.laneColors[i % 4]}`
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Theme selector - only show when not playing */}
      {!gameState.isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mb-6"
        >
          <h2 
            className="text-center text-sm uppercase tracking-widest mb-4 opacity-60"
            style={{ color: styles.textColor }}
          >
            Select Theme
          </h2>
          <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
        </motion.div>
      )}

      {/* Game container */}
      <div className="relative z-10 w-full max-w-md">
        {/* HUD - only show when playing */}
        {gameState.isPlaying && !gameState.isPaused && (
          <GameHUD gameState={gameState} theme={theme} />
        )}

        {/* Game board */}
        <div className="relative">
          <GameBoard 
            gameState={gameState} 
            theme={theme} 
            onHit={hitTile}
          />

          {/* Overlays */}
          <AnimatePresence mode="wait">
            {!gameState.isPlaying && !gameState.gameOver && (
              <StartScreen 
                key="start"
                theme={theme} 
                onStart={startGame} 
              />
            )}

            {gameState.isPaused && (
              <PauseScreen
                key="pause"
                theme={theme}
                onResume={pauseGame}
                onQuit={endGame}
              />
            )}

            {gameState.gameOver && (
              <GameOverScreen
                key="gameover"
                gameState={gameState}
                theme={theme}
                onRestart={startGame}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Instructions */}
        {gameState.isPlaying && !gameState.isPaused && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4 text-sm opacity-50"
            style={{ color: styles.textColor }}
          >
            Press D, F, J, K or tap the lanes
          </motion.p>
        )}
      </div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`fixed top-4 left-4 text-lg font-bold ${styles.font}`}
        style={{ 
          color: styles.textColor,
          opacity: 0.3,
          textShadow: `0 0 10px ${styles.glowColor}`
        }}
      >
        RHYTHM RUSH
      </motion.h1>
    </div>
  )
}
