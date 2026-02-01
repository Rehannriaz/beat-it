'use client'

import { useState, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useGame3D, useExamplePattern } from '@/hooks'
import { HUD3D } from './hud-3d'
import { StartScreen3D, PauseScreen3D, GameOverScreen3D } from './overlays-3d'
import { UploadWizard } from '@/components/upload-wizard'
import { SpotifyWizard } from '@/components/spotify-wizard'
import { SpotifyPlayer } from '@/components/spotify/spotify-player'
import type { Theme } from '@/lib/game-types'
import type { Song } from '@/types/api'
import type { GamePattern } from '@/lib/pattern-types'
import type { SpotifyTrack } from '@/lib/spotify/types'
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
  const [spotifyWizardOpen, setSpotifyWizardOpen] = useState(false)
  const [spotifyTrack, setSpotifyTrack] = useState<SpotifyTrack | null>(null)
  const [spotifyPattern, setSpotifyPattern] = useState<GamePattern | null>(null)
  const [spotifyPosition, setSpotifyPosition] = useState(0)

  const { data: examplePattern, isLoading: patternLoading } = useExamplePattern()

  // Use spotify pattern, uploaded pattern, or example pattern (in priority order)
  // BUT: if using Spotify, don't fall back to example pattern - only use spotifyPattern
  const activePattern = spotifyTrack 
    ? (spotifyPattern || null)  // Only use spotify pattern when using Spotify
    : (uploadedPattern || examplePattern)  // Use uploaded or example for non-Spotify

  // Wrapper for startGame that resets Spotify position
  const handleStartGame = () => {
    if (spotifyTrack) {
      setSpotifyPosition(0)
    }
    startGame()
  }

  const { gameState, startGame, pauseGame, endGame, hitTile, mode, speed, pressedKeys, debugInfo } = useGame3D({
    pattern: usePattern ? activePattern : null,
    mode: usePattern ? 'pattern' : 'endless',
    audioUrl: spotifyTrack ? null : (uploadedSong?.fileUrl ?? null),
    spotifyPosition: spotifyTrack ? spotifyPosition : undefined,
  })


  const handleUploadComplete = (song: Song) => {
    setUploadedSong(song)
    if (song.pattern) {
      setUploadedPattern(song.pattern)
      setUsePattern(true)
    }
    setUploadWizardOpen(false)
  }

  const handleSpotifyComplete = (track: SpotifyTrack, pattern: GamePattern) => {
    // Reset position when changing track
    setSpotifyPosition(0)
    setSpotifyTrack(track)
    setSpotifyPattern(pattern)
    setUploadedPattern(null) // Clear uploaded if any
    setUploadedSong(null)
    setUsePattern(true)
    setSpotifyWizardOpen(false)
  }

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* 3D Scene - tiles are clickable */}
      <Suspense fallback={<LoadingScreen theme={theme} />}>
        <Scene3D gameState={gameState} theme={theme} onTileHit={hitTile} speed={speed} pressedKeys={pressedKeys} />
      </Suspense>

      {/* HUD - only show when playing */}
      {gameState.isPlaying && !gameState.isPaused && (
        <>
          <HUD3D gameState={gameState} theme={theme} onPause={pauseGame} />
          {/* Debug panel */}
          <div className="absolute top-20 left-4 bg-black/90 text-white text-xs p-3 rounded font-mono z-50 max-w-sm overflow-auto max-h-96">
            <div className="font-bold mb-2 text-yellow-400">Debug Info</div>
            <div>GameTime: {debugInfo.gameTime.toFixed(2)}s</div>
            <div>Spotify Pos: {debugInfo.spotifyPosition !== undefined ? debugInfo.spotifyPosition.toFixed(2) : 'N/A'}s</div>
            <div>Spotify Synced: {debugInfo.spotifySynced ? '✅ Yes' : '❌ No'}</div>
            <div>Using Spotify: {debugInfo.isUsingSpotify ? 'Yes' : 'No'}</div>
            <div>Can Spawn: {debugInfo.canSpawn ? '✅ Yes' : '❌ No'}</div>
            <div>Spawned: {debugInfo.spawnedTilesCount} / {debugInfo.patternTilesCount}</div>
            <div>Active Tiles: {debugInfo.activeTilesCount}</div>
            <div>Spawn Offset: {debugInfo.spawnOffset.toFixed(2)}s</div>
            <div>First Tile Time: {debugInfo.firstTileTime.toFixed(2)}s</div>
            <div>Next Tile: {debugInfo.nextTileToSpawn !== null ? debugInfo.nextTileToSpawn.toFixed(2) + 's' : 'None'}</div>
            {spotifyTrack && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <div>Track: {spotifyTrack.name}</div>
                <div>Has Pattern: {spotifyPattern ? '✅ Yes' : '❌ No'}</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Upload Wizard */}
      <UploadWizard
        isOpen={uploadWizardOpen}
        onClose={() => setUploadWizardOpen(false)}
        onComplete={handleUploadComplete}
        theme={theme}
      />

      {/* Spotify Wizard */}
      <SpotifyWizard
        isOpen={spotifyWizardOpen}
        onClose={() => setSpotifyWizardOpen(false)}
        onComplete={handleSpotifyComplete}
        theme={theme}
      />

      {/* Spotify player - only pass trackUri when game is playing to avoid auto-play in menu */}
      {spotifyTrack && (
        <div className="hidden">
          <SpotifyPlayer
            trackUri={gameState.isPlaying ? spotifyTrack.uri : undefined}
            onPositionChange={setSpotifyPosition}
            isPaused={!gameState.isPlaying || gameState.isPaused}
            shouldReset={gameState.isPlaying}
          />
        </div>
      )}

      {/* Overlays */}
      <AnimatePresence mode="wait">
        {!gameState.isPlaying && !gameState.gameOver && (
          <StartScreen3D
            key="start"
            theme={theme}
            onStart={handleStartGame}
            onThemeChange={setTheme}
            pattern={activePattern}
            patternLoading={patternLoading}
            usePattern={usePattern}
            onToggleMode={() => setUsePattern(prev => !prev)}
            onUploadClick={() => setUploadWizardOpen(true)}
            onSpotifyClick={() => setSpotifyWizardOpen(true)}
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
            onRestart={handleStartGame}
            onMenu={endGame}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
