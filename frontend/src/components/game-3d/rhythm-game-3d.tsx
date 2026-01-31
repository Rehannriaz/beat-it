'use client'

import { useState, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useGame3D, useExamplePattern } from '@/hooks'
import { HUD3D } from './hud-3d'
import { StartScreen3D, PauseScreen3D, GameOverScreen3D } from './overlays-3d'
import { UploadWizard } from '@/components/upload-wizard'
import type { Theme } from '@/lib/game-types'
import type { Song } from '@/types/api'
import type { GamePattern } from '@/lib/pattern-types'
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
  const [usePattern, setUsePattern] = useState(true)
  const [uploadWizardOpen, setUploadWizardOpen] = useState(false)
  const [uploadedPattern, setUploadedPattern] = useState<GamePattern | null>(null)
  const [uploadedSong, setUploadedSong] = useState<Song | null>(null)

  const { data: examplePattern, isLoading: patternLoading } = useExamplePattern()

  // Use uploaded pattern if available, otherwise use example pattern
  const activePattern = uploadedPattern || examplePattern

  const { gameState, startGame, pauseGame, endGame, mode } = useGame3D({
    pattern: usePattern ? activePattern : null,
    mode: usePattern ? 'pattern' : 'endless',
    audioUrl: uploadedSong?.fileUrl ?? null
  })

  const handleUploadComplete = (song: Song) => {
    setUploadedSong(song)
    if (song.pattern) {
      setUploadedPattern(song.pattern)
      setUsePattern(true)
    }
    setUploadWizardOpen(false)
  }

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

      {/* Upload Wizard */}
      <UploadWizard
        isOpen={uploadWizardOpen}
        onClose={() => setUploadWizardOpen(false)}
        onComplete={handleUploadComplete}
        theme={theme}
      />

      {/* Overlays */}
      <AnimatePresence mode="wait">
        {!gameState.isPlaying && !gameState.gameOver && (
          <StartScreen3D
            key="start"
            theme={theme}
            onStart={startGame}
            onThemeChange={setTheme}
            pattern={activePattern}
            patternLoading={patternLoading}
            usePattern={usePattern}
            onToggleMode={() => setUsePattern(prev => !prev)}
            onUploadClick={() => setUploadWizardOpen(true)}
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
