'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useGame3D, useExamplePattern, useGameSounds, useAuth } from '@/hooks'
import { HUD3D } from './hud-3d'
import { StartScreen3D, PauseScreen3D, GameOverScreen3D } from './overlays-3d'
import { ComboCelebration } from './combo-celebration'
import { UploadWizard } from '@/components/upload-wizard'
import { SpotifyWizard } from '@/components/spotify-wizard'
import { SpotifyPlayer } from '@/components/spotify/spotify-player'
import { ScoreSubmitModal } from '@/components/daily-challenge/score-submit-modal'
import { AuthModal } from '@/components/auth/auth-modal'
import { getTodayUTC } from '@/lib/daily-challenge'
import type { Theme } from '@/lib/game-types'
import type { Song } from '@/types/api'
import type { GamePattern } from '@/lib/pattern-types'
import type { SpotifyTrack } from '@/lib/spotify/types'
import { themeStyles } from '@/lib/game-types'
import { User, LogOut } from 'lucide-react'

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
  const [isDailyChallenge, setIsDailyChallenge] = useState(false)
  const [dailyTrackId, setDailyTrackId] = useState<string | null>(null)
  const [showScoreSubmit, setShowScoreSubmit] = useState(false)
  const [dailyError, setDailyError] = useState<string | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const { user, profile, signOut, isAuthenticated, loading: authLoading } = useAuth()
  const { playHit, playComboMilestone, checkMilestone } = useGameSounds()
  const prevComboRef = useRef(0)

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

  const { gameState, startGame, pauseGame, endGame, hitTile, mode, speed, pressedKeys, accuracy } = useGame3D({
    pattern: usePattern ? activePattern : null,
    mode: usePattern ? 'pattern' : 'endless',
    audioUrl: spotifyTrack ? null : (uploadedSong?.fileUrl ?? null),
    spotifyPosition: spotifyTrack ? spotifyPosition : undefined,
  })

  // Play sounds on hit feedback
  useEffect(() => {
    if (gameState.lastHitFeedback) {
      playHit(gameState.lastHitFeedback.type)
    }
  }, [gameState.lastHitFeedback, playHit])

  // Track combo for milestone detection
  useEffect(() => {
    const prevCombo = prevComboRef.current
    prevComboRef.current = gameState.combo

    if (checkMilestone(prevCombo, gameState.combo)) {
      playComboMilestone()
    }
  }, [gameState.combo, checkMilestone, playComboMilestone])

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

  const handleDailyPlay = async (trackId: string) => {
    try {
      setDailyError(null)  // Clear any previous error
      setIsDailyChallenge(true)
      setDailyTrackId(trackId)

      // Fetch the track from Spotify
      const { spotifyApi } = await import('@/lib/spotify/api')
      const track = await spotifyApi.getTrack(trackId)

      // Generate pattern for this track using the same logic as useSpotifyPattern
      const { transformSpotifyAnalysis, generateFeaturesFromTrack } = await import('@/lib/spotify/transform')
      const { api } = await import('@/lib/api')

      let features
      try {
        const analysis = await spotifyApi.getAudioAnalysis(trackId)
        features = transformSpotifyAnalysis(analysis)
      } catch {
        // Audio Analysis API may be deprecated - fallback to basic features
        let audioFeatures = null
        try {
          audioFeatures = await spotifyApi.getAudioFeatures(trackId)
        } catch {
          // Audio Features also unavailable, will use default tempo
        }
        features = generateFeaturesFromTrack(track.duration_ms, audioFeatures)
      }

      // Call backend to generate pattern
      const response = await api.post<{ data: GamePattern }>(
        '/spotify/generate-pattern',
        {
          trackId: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          duration: track.duration_ms / 1000,
          difficulty: 'medium',
          features,
        }
      )
      const pattern = response.data

      // Set up like handleSpotifyComplete but for daily
      setSpotifyPosition(0)
      setSpotifyTrack(track)
      setSpotifyPattern(pattern)
      setUploadedPattern(null)
      setUploadedSong(null)
      setUsePattern(true)

      // Start the game
      startGame()
    } catch (error) {
      console.error('Failed to start daily challenge:', error)
      setDailyError(error instanceof Error ? error.message : 'Failed to start daily challenge')
      // Reset state on error
      setIsDailyChallenge(false)
      setDailyTrackId(null)
    }
  }

  // Show score submit modal when daily challenge ends
  useEffect(() => {
    if (gameState.gameOver && isDailyChallenge && dailyTrackId) {
      setShowScoreSubmit(true)
    }
  }, [gameState.gameOver, isDailyChallenge, dailyTrackId])

  const styles = themeStyles[theme]

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Auth Button - Top Right */}
      {!gameState.isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-30"
        >
          {authLoading ? (
            <div
              className="px-4 py-2 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: styles.glowColor, borderTopColor: 'transparent' }}
              />
            </div>
          ) : isAuthenticated ? (
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-lg"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${styles.glowColor}40`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${styles.glowColor}30` }}
                >
                  <User className="w-4 h-4" style={{ color: styles.glowColor }} />
                </div>
                <span
                  className="text-sm font-medium max-w-[120px] truncate"
                  style={{ color: styles.textColor }}
                >
                  {profile?.display_name || user?.email?.split('@')[0] || 'User'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                         transition-all duration-200 cursor-pointer hover:opacity-80"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: styles.textColor,
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                       transition-all duration-200 cursor-pointer"
              style={{
                background: styles.glowColor,
                color: '#000',
                boxShadow: `0 0 20px ${styles.glowColor}60`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = `0 0 30px ${styles.glowColor}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = `0 0 20px ${styles.glowColor}60`
              }}
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </motion.div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
        textColor={styles.textColor}
        glowColor={styles.glowColor}
      />

      {/* 3D Scene - tiles are clickable */}
      <Suspense fallback={<LoadingScreen theme={theme} />}>
        <Scene3D gameState={gameState} theme={theme} onTileHit={hitTile} speed={speed} pressedKeys={pressedKeys} />
      </Suspense>

      {/* HUD - only show when playing */}
      {gameState.isPlaying && !gameState.isPaused && (
        <HUD3D gameState={gameState} theme={theme} onPause={pauseGame} />
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

      {/* Score Submit Modal for Daily Challenge */}
      {showScoreSubmit && dailyTrackId && (
        <ScoreSubmitModal
          isOpen={showScoreSubmit}
          onClose={() => {
            setShowScoreSubmit(false)
            setIsDailyChallenge(false)
          }}
          score={gameState.score}
          accuracy={accuracy}
          maxCombo={gameState.maxCombo}
          challengeDate={getTodayUTC()}
          spotifyTrackId={dailyTrackId}
          textColor={themeStyles[theme].textColor}
          glowColor={themeStyles[theme].glowColor}
          laneColors={themeStyles[theme].laneColors}
        />
      )}

      {/* Combo celebrations */}
      {gameState.isPlaying && !gameState.isPaused && (
        <ComboCelebration
          combo={gameState.combo}
          theme={theme}
        />
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
            onDailyPlay={handleDailyPlay}
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
            spotifyTrack={spotifyTrack}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
