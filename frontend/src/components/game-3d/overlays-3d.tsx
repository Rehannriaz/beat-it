'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { Theme } from '@/lib/game-types'
import type { GameState3D } from '@/hooks/use-game-3d'
import type { GamePattern } from '@/lib/pattern-types'
import { themeStyles, LANE_KEYS } from '@/lib/game-types'
import { Play, Pause, RotateCcw, Home, Music, Infinity, Loader2, Upload } from 'lucide-react'

interface StartScreen3DProps {
  theme: Theme
  onStart: () => void
  onThemeChange: (theme: Theme) => void
  pattern?: GamePattern | null
  patternLoading?: boolean
  usePattern?: boolean
  onToggleMode?: () => void
  onUploadClick?: () => void
  onSpotifyClick?: () => void
}

const themes: Theme[] = ['vaporwave', 'retro', 'cyberpunk', 'minimal']

export function StartScreen3D({
  theme,
  onStart,
  onThemeChange,
  pattern,
  patternLoading,
  usePattern = true,
  onToggleMode,
  onUploadClick,
  onSpotifyClick
}: StartScreen3DProps) {
  const styles = themeStyles[theme]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.8) 100%)'
      }}
    >
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-2 px-4 text-center ${styles.font}`}
        style={{
          color: styles.textColor,
          textShadow: `0 0 40px ${styles.glowColor}, 0 0 80px ${styles.glowColor}`
        }}
      >
        RHYTHM RUSH
      </motion.h1>

      <motion.p
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 opacity-60 px-4"
        style={{ color: styles.textColor }}
      >
        3D Edition
      </motion.p>

      {/* Mode selector */}
      {onToggleMode && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 px-4"
        >
          <button
            onClick={onToggleMode}
            className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center gap-1 sm:gap-2 ${
              usePattern ? 'scale-105' : 'opacity-50 hover:opacity-80'
            }`}
            style={{
              borderColor: usePattern ? styles.glowColor : 'transparent',
              background: usePattern ? `${styles.glowColor}20` : 'rgba(255,255,255,0.05)',
              color: styles.textColor,
            }}
          >
            {patternLoading ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            ) : (
              <Music className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
            <span className="text-xs sm:text-sm font-medium">Pattern</span>
          </button>
          <button
            onClick={onToggleMode}
            className={`px-3 sm:px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center gap-1 sm:gap-2 ${
              !usePattern ? 'scale-105' : 'opacity-50 hover:opacity-80'
            }`}
            style={{
              borderColor: !usePattern ? styles.glowColor : 'transparent',
              background: !usePattern ? `${styles.glowColor}20` : 'rgba(255,255,255,0.05)',
              color: styles.textColor,
            }}
          >
            <Infinity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Endless</span>
          </button>
        </motion.div>
      )}

      {/* Upload and Spotify buttons */}
      {(onUploadClick || onSpotifyClick) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.37 }}
          className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 px-4 w-full sm:w-auto"
        >
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 w-full sm:w-auto"
              style={{
                borderColor: styles.laneColors[2],
                background: `${styles.laneColors[2]}20`,
                color: styles.textColor,
              }}
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">Upload Your Song</span>
            </button>
          )}
          {onSpotifyClick && (
            <button
              onClick={onSpotifyClick}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 w-full sm:w-auto"
              style={{
                borderColor: '#1DB954',
                background: '#1DB95420',
                color: styles.textColor,
              }}
            >
              <Music className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#1DB954' }} />
              <span className="text-sm sm:text-base font-medium">Search Spotify</span>
            </button>
          )}
        </motion.div>
      )}

      {/* Pattern info */}
      {usePattern && pattern && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.38 }}
          className="text-center mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 rounded-lg mx-4 sm:mx-0 max-w-md"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: styles.textColor
          }}
        >
          <p className="text-base sm:text-lg font-semibold break-words">{pattern.metadata.songTitle}</p>
          <p className="text-xs sm:text-sm opacity-60 break-words">
            {pattern.metadata.artist} • {pattern.metadata.bpm} BPM • {pattern.tiles.length} tiles
          </p>
        </motion.div>
      )}

      {/* Theme selector */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8 px-4 max-w-2xl"
      >
        {themes.map((t) => (
          <button
            key={t}
            onClick={() => onThemeChange(t)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all duration-300 ${
              t === theme ? 'scale-110' : 'opacity-50 hover:opacity-80'
            }`}
            style={{
              borderColor: t === theme ? themeStyles[t].glowColor : 'transparent',
              background: t === theme
                ? `${themeStyles[t].glowColor}20`
                : 'rgba(255,255,255,0.05)',
              color: themeStyles[t].textColor,
              boxShadow: t === theme ? `0 0 20px ${themeStyles[t].glowColor}40` : 'none'
            }}
          >
            <span className="text-xs sm:text-sm font-medium">{themeStyles[t].name}</span>
          </button>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 px-4"
      >
        {LANE_KEYS.map((key, i) => (
          <div
            key={key}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center border-2"
            style={{
              borderColor: styles.laneColors[i],
              background: `${styles.laneColors[i]}20`,
              boxShadow: `0 0 15px ${styles.laneColors[i]}40`
            }}
          >
            <span
              className="text-base sm:text-lg md:text-xl font-bold"
              style={{ color: styles.laneColors[i] }}
            >
              {key}
            </span>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="px-4 w-full sm:w-auto"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl w-full sm:w-auto"
          disabled={usePattern && patternLoading}
          style={{
            background: styles.glowColor,
            color: '#000',
            boxShadow: `0 0 30px ${styles.glowColor}60`
          }}
        >
          {patternLoading && usePattern ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 animate-spin" />
              <span className="hidden sm:inline">LOADING...</span>
              <span className="sm:hidden">LOADING</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2" />
              <span className="hidden sm:inline">START GAME</span>
              <span className="sm:hidden">START</span>
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  )
}

interface PauseScreen3DProps {
  theme: Theme
  onResume: () => void
  onQuit: () => void
}

export function PauseScreen3D({ theme, onResume, onQuit }: PauseScreen3DProps) {
  const styles = themeStyles[theme]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="text-center"
      >
        <Pause 
          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-4"
          style={{ color: styles.textColor }}
        />
        <h2
          className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 px-4 ${styles.font}`}
          style={{ 
            color: styles.textColor,
            textShadow: `0 0 20px ${styles.glowColor}`
          }}
        >
          PAUSED
        </h2>

        <div className="flex flex-col gap-4">
          <Button
            onClick={onResume}
            size="lg"
            className="px-8"
            style={{
              background: styles.glowColor,
              color: '#000'
            }}
          >
            <Play className="w-5 h-5 mr-2" />
            Resume
          </Button>
          <Button
            onClick={onQuit}
            variant="outline"
            size="lg"
            className="px-8 bg-transparent"
            style={{
              borderColor: styles.textColor,
              color: styles.textColor
            }}
          >
            <Home className="w-5 h-5 mr-2" />
            Quit
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface GameOverScreen3DProps {
  gameState: GameState3D
  theme: Theme
  onRestart: () => void
}

export function GameOverScreen3D({ gameState, theme, onRestart }: GameOverScreen3DProps) {
  const styles = themeStyles[theme]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="text-center"
      >
        <h2
          className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 px-4 ${styles.font}`}
          style={{ 
            color: styles.textColor,
            textShadow: `0 0 30px ${styles.glowColor}`
          }}
        >
          GAME OVER
        </h2>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 px-4">
          <div>
            <p 
              className="text-xs sm:text-sm uppercase tracking-widest opacity-60"
              style={{ color: styles.textColor }}
            >
              Final Score
            </p>
            <p
              className="text-3xl sm:text-4xl md:text-5xl font-bold"
              style={{ 
                color: styles.textColor,
                textShadow: `0 0 20px ${styles.glowColor}`
              }}
            >
              {gameState.score.toLocaleString()}
            </p>
          </div>

          <div>
            <p 
              className="text-xs sm:text-sm uppercase tracking-widest opacity-60"
              style={{ color: styles.textColor }}
            >
              Max Combo
            </p>
            <p
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: styles.laneColors[0] }}
            >
              {gameState.maxCombo}x
            </p>
          </div>
        </div>

        <Button
          onClick={onRestart}
          size="lg"
          className="px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto mx-4 sm:mx-0"
          style={{
            background: styles.glowColor,
            color: '#000',
            boxShadow: `0 0 30px ${styles.glowColor}60`
          }}
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Play Again
        </Button>
      </motion.div>
    </motion.div>
  )
}
