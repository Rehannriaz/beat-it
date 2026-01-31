'use client'

import { useState, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useGame3D } from '@/hooks/use-game-3d'
import { HUD3D } from './hud-3d'
import { StartScreen3D, PauseScreen3D, GameOverScreen3D } from './overlays-3d'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

// Dynamically import Scene3D to avoid SSR issues with Three.js
const Scene3D = dynamic(
  () => import('./scene-3d').then(mod => ({ default: mod.Scene3D })),
  { ssr: false }
)

function LoadingScreen({ theme }: { theme: Theme }) {
  const styles = themeStyles[theme]
  
  return (
    <div 
      className="w-full h-full flex items-center justify-center"
      style={{ background: theme === 'minimal' ? '#000' : '#0f0c29' }}
    >
      <div className="text-center">
        <div 
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: styles.glowColor, borderTopColor: 'transparent' }}
        />
        <p style={{ color: styles.textColor }}>Loading 3D Scene...</p>
      </div>
    </div>
  )
}

export function RhythmGame3D() {
  const [theme, setTheme] = useState<Theme>('vaporwave')
  const { gameState, startGame, pauseGame, endGame } = useGame3D()

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* 3D Scene */}
      <Suspense fallback={<LoadingScreen theme={theme} />}>
        <Scene3D gameState={gameState} theme={theme} />
      </Suspense>

      {/* HUD - only show when playing */}
      {gameState.isPlaying && !gameState.isPaused && (
        <HUD3D gameState={gameState} theme={theme} />
      )}

      {/* Overlays */}
      <AnimatePresence mode="wait">
        {!gameState.isPlaying && !gameState.gameOver && (
          <StartScreen3D
            key="start"
            theme={theme}
            onStart={startGame}
            onThemeChange={setTheme}
          />
        )}

        {gameState.isPaused && (
          <PauseScreen3D
            key="pause"
            theme={theme}
            onResume={pauseGame}
            onQuit={endGame}
          />
        )}

        {gameState.gameOver && (
          <GameOverScreen3D
            key="gameover"
            gameState={gameState}
            theme={theme}
            onRestart={startGame}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
