'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Theme } from '@/lib/game-types'
import type { GameState3D } from '@/hooks/use-game-3d'
import type { GamePattern } from '@/lib/pattern-types'
import type { SpotifyTrack } from '@/lib/spotify/types'
import { themeStyles, LANE_KEYS } from '@/lib/game-types'
import { spotifyApi } from '@/lib/spotify/api'
import { Play, Pause, RotateCcw, Home, Music, Infinity, Loader2, Upload, Heart, Check, ExternalLink } from 'lucide-react'
import { DailyChallengeTab } from '@/components/daily-challenge/daily-challenge-tab'

// Custom button component with proper hover effects
interface GameButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'outline'
  glowColor: string
  textColor: string
  children: React.ReactNode
  className?: string
}

function GameButton({ onClick, disabled, variant = 'primary', glowColor, textColor, children, className = '' }: GameButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseEnter = () => {
      if (variant === 'primary') {
        button.style.transform = 'scale(1.03)'
        button.style.filter = 'brightness(1.15)'
        button.style.boxShadow = `0 0 30px ${glowColor}, 0 0 50px ${glowColor}60`
      } else {
        button.style.transform = 'scale(1.03)'
        button.style.filter = 'brightness(1.1)'
        button.style.background = `${glowColor}30`
        button.style.borderColor = glowColor
        button.style.boxShadow = `0 0 20px ${glowColor}50`
      }
    }

    const handleMouseLeave = () => {
      if (variant === 'primary') {
        button.style.transform = 'scale(1)'
        button.style.filter = 'brightness(1)'
        button.style.boxShadow = `0 0 20px ${glowColor}60`
      } else {
        button.style.transform = 'scale(1)'
        button.style.filter = 'brightness(1)'
        button.style.background = 'rgba(255,255,255,0.05)'
        button.style.borderColor = `${textColor}60`
        button.style.boxShadow = `0 0 10px ${glowColor}20`
      }
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [variant, glowColor, textColor])

  const baseStyles = variant === 'primary'
    ? {
        background: glowColor,
        color: '#000',
        boxShadow: `0 0 20px ${glowColor}60`,
        transition: 'all 0.2s ease-out',
      }
    : {
        background: 'rgba(255,255,255,0.05)',
        color: textColor,
        borderColor: `${textColor}60`,
        borderWidth: '2px',
        boxShadow: `0 0 10px ${glowColor}20`,
        transition: 'all 0.2s ease-out',
      }

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl
                  cursor-pointer select-none pointer-events-auto
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${variant === 'outline' ? 'border-2' : ''}
                  ${className}`}
      style={baseStyles}
    >
      {children}
    </button>
  )
}

// Hover button for upload/spotify style buttons
interface HoverButtonProps {
  onClick: () => void
  color: string
  textColor: string
  children: React.ReactNode
}

function HoverButton({ onClick, color, textColor, children }: HoverButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseEnter = () => {
      button.style.transform = 'scale(1.03)'
      button.style.background = `${color}35`
      button.style.boxShadow = `0 0 25px ${color}60`
    }

    const handleMouseLeave = () => {
      button.style.transform = 'scale(1)'
      button.style.background = `${color}20`
      button.style.boxShadow = `0 0 15px ${color}30`
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [color])

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2
                 flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer pointer-events-auto
                 transition-all duration-200 ease-out"
      style={{
        borderColor: color,
        background: `${color}20`,
        color: textColor,
        boxShadow: `0 0 15px ${color}30`,
      }}
    >
      {children}
    </button>
  )
}

// Mode toggle button
interface ModeButtonProps {
  onClick: () => void
  isActive: boolean
  glowColor: string
  textColor: string
  children: React.ReactNode
}

function ModeButton({ onClick, isActive, glowColor, textColor, children }: ModeButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseEnter = () => {
      if (!isActive) {
        button.style.borderColor = glowColor
        button.style.background = `${glowColor}12`
        button.style.opacity = '0.85'
        button.style.transform = 'scale(1.02)'
        button.style.boxShadow = `0 0 12px ${glowColor}30`
      }
    }

    const handleMouseLeave = () => {
      if (!isActive) {
        button.style.borderColor = 'transparent'
        button.style.background = 'rgba(255,255,255,0.05)'
        button.style.opacity = '0.5'
        button.style.transform = 'scale(1)'
        button.style.boxShadow = 'none'
      }
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isActive, glowColor])

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className="px-3 sm:px-4 py-2 rounded-lg border-2 flex items-center gap-1 sm:gap-2
                 cursor-pointer pointer-events-auto transition-all duration-200 ease-out"
      style={{
        borderColor: isActive ? glowColor : 'transparent',
        background: isActive ? `${glowColor}20` : 'rgba(255,255,255,0.05)',
        color: textColor,
        opacity: isActive ? 1 : 0.5,
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isActive ? `0 0 15px ${glowColor}40` : 'none',
      }}
    >
      {children}
    </button>
  )
}

// Theme selector button
interface ThemeButtonProps {
  onClick: () => void
  isActive: boolean
  theme: Theme
  children: React.ReactNode
}

function ThemeButton({ onClick, isActive, theme, children }: ThemeButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const themeStyle = themeStyles[theme]

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseEnter = () => {
      if (!isActive) {
        button.style.borderColor = themeStyle.glowColor
        button.style.background = `${themeStyle.glowColor}12`
        button.style.opacity = '0.85'
        button.style.transform = 'scale(1.05)'
        button.style.boxShadow = `0 0 15px ${themeStyle.glowColor}30`
      }
    }

    const handleMouseLeave = () => {
      if (!isActive) {
        button.style.borderColor = 'transparent'
        button.style.background = 'rgba(255,255,255,0.05)'
        button.style.opacity = '0.5'
        button.style.transform = 'scale(1)'
        button.style.boxShadow = 'none'
      }
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isActive, themeStyle.glowColor])

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 cursor-pointer pointer-events-auto
                 transition-all duration-200 ease-out"
      style={{
        borderColor: isActive ? themeStyle.glowColor : 'transparent',
        background: isActive ? `${themeStyle.glowColor}20` : 'rgba(255,255,255,0.05)',
        color: themeStyle.textColor,
        opacity: isActive ? 1 : 0.5,
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
        boxShadow: isActive ? `0 0 20px ${themeStyle.glowColor}40` : 'none',
      }}
    >
      {children}
    </button>
  )
}

interface TabNavProps {
  activeTab: 'home' | 'daily'
  onTabChange: (tab: 'home' | 'daily') => void
  textColor: string
  glowColor: string
}

function TabNav({ activeTab, onTabChange, textColor, glowColor }: TabNavProps) {
  return (
    <div className="flex gap-2 mb-6">
      {(['home', 'daily'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          style={{
            background: activeTab === tab ? glowColor : 'rgba(255,255,255,0.05)',
            color: activeTab === tab ? '#000' : textColor,
            opacity: activeTab === tab ? 1 : 0.6,
          }}
        >
          {tab === 'home' ? 'Home' : 'Daily Challenge'}
        </button>
      ))}
    </div>
  )
}

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
  onDailyPlay?: (trackId: string) => void
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
  onSpotifyClick,
  onDailyPlay
}: StartScreen3DProps) {
  const styles = themeStyles[theme]
  const [activeTab, setActiveTab] = useState<'home' | 'daily'>('home')

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

      {/* Tab Navigation */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          textColor={styles.textColor}
          glowColor={styles.glowColor}
        />
      </motion.div>

      {activeTab === 'home' ? (
        <>
          {/* Mode selector */}
          {onToggleMode && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 px-4"
            >
              <ModeButton
                onClick={onToggleMode}
                isActive={usePattern}
                glowColor={styles.glowColor}
                textColor={styles.textColor}
              >
                {patternLoading ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Music className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <span className="text-xs sm:text-sm font-medium">Pattern</span>
              </ModeButton>
              <ModeButton
                onClick={onToggleMode}
                isActive={!usePattern}
                glowColor={styles.glowColor}
                textColor={styles.textColor}
              >
                <Infinity className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">Endless</span>
              </ModeButton>
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
                <HoverButton
                  onClick={onUploadClick}
                  color={styles.laneColors[2]}
                  textColor={styles.textColor}
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base font-medium">Upload Your Song</span>
                </HoverButton>
              )}
              {onSpotifyClick && (
                <HoverButton
                  onClick={onSpotifyClick}
                  color="#1DB954"
                  textColor={styles.textColor}
                >
                  <Music className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#1DB954' }} />
                  <span className="text-sm sm:text-base font-medium">Search Spotify</span>
                </HoverButton>
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
              <ThemeButton
                key={t}
                onClick={() => onThemeChange(t)}
                isActive={t === theme}
                theme={t}
              >
                <span className="text-xs sm:text-sm font-medium">{themeStyles[t].name}</span>
              </ThemeButton>
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
            <GameButton
              onClick={onStart}
              disabled={usePattern && patternLoading}
              glowColor={styles.glowColor}
              textColor={styles.textColor}
              className="text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 w-full sm:w-auto"
            >
              {patternLoading && usePattern ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 animate-spin" />
                  <span className="hidden sm:inline">LOADING...</span>
                  <span className="sm:hidden">LOADING</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  <span className="hidden sm:inline">START GAME</span>
                  <span className="sm:hidden">START</span>
                </>
              )}
            </GameButton>
          </motion.div>
        </>
      ) : (
        <DailyChallengeTab
          theme={theme}
          onPlay={onDailyPlay || (() => {})}
          onSpotifyAuth={onSpotifyClick || (() => {})}
        />
      )}
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

        <div className="flex flex-col gap-4 px-4">
          <GameButton
            onClick={onResume}
            glowColor={styles.glowColor}
            textColor={styles.textColor}
            className="px-8 py-3 text-base"
          >
            <Play className="w-5 h-5" />
            Resume
          </GameButton>
          <GameButton
            onClick={onQuit}
            variant="outline"
            glowColor={styles.glowColor}
            textColor={styles.textColor}
            className="px-8 py-3 text-base"
          >
            <Home className="w-5 h-5" />
            Quit to Menu
          </GameButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface GameOverScreen3DProps {
  gameState: GameState3D
  theme: Theme
  onRestart: () => void
  onMenu?: () => void
  spotifyTrack?: SpotifyTrack | null
}

export function GameOverScreen3D({ gameState, theme, onRestart, onMenu, spotifyTrack }: GameOverScreen3DProps) {
  const styles = themeStyles[theme]
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if track is already saved when component mounts
  useEffect(() => {
    if (!spotifyTrack) return

    const checkSaved = async () => {
      setIsChecking(true)
      try {
        const [saved] = await spotifyApi.checkSavedTracks([spotifyTrack.id])
        setIsSaved(saved)
      } catch {
        // Silently fail - user might not have proper scopes
      } finally {
        setIsChecking(false)
      }
    }

    checkSaved()
  }, [spotifyTrack])

  const handleSaveTrack = async () => {
    if (!spotifyTrack || isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      if (isSaved) {
        await spotifyApi.removeTrack(spotifyTrack.id)
        setIsSaved(false)
      } else {
        await spotifyApi.saveTrack(spotifyTrack.id)
        setIsSaved(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update library')
    } finally {
      setIsSaving(false)
    }
  }

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
        className="text-center max-w-md w-full"
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

        {/* Spotify Track Card */}
        {spotifyTrack && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-4 mb-6 p-4 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${styles.glowColor}40`,
            }}
          >
            <div className="flex items-center gap-4">
              {/* Album Art */}
              {spotifyTrack.album.images[0] && (
                <img
                  src={spotifyTrack.album.images[0].url}
                  alt={spotifyTrack.album.name}
                  className="w-16 h-16 rounded-lg shadow-lg flex-shrink-0"
                />
              )}

              {/* Track Info */}
              <div className="flex-1 text-left min-w-0">
                <p
                  className="font-semibold truncate"
                  style={{ color: styles.textColor }}
                >
                  {spotifyTrack.name}
                </p>
                <p
                  className="text-sm opacity-70 truncate"
                  style={{ color: styles.textColor }}
                >
                  {spotifyTrack.artists.map(a => a.name).join(', ')}
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveTrack}
                disabled={isSaving || isChecking}
                className="flex-shrink-0 p-3 rounded-full transition-all duration-200 cursor-pointer pointer-events-auto disabled:opacity-50"
                style={{
                  background: isSaved ? '#1DB954' : 'rgba(255,255,255,0.1)',
                  color: isSaved ? '#000' : styles.textColor,
                }}
                title={isSaved ? 'Remove from Library' : 'Add to Library'}
              >
                {isSaving || isChecking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSaved ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Heart className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Success/Error Message */}
            {isSaved && !isSaving && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm mt-3 text-center"
                style={{ color: '#1DB954' }}
              >
                Added to your Spotify Library!
              </motion.p>
            )}
            {error && (
              <p className="text-sm mt-3 text-center text-red-400">
                {error}
              </p>
            )}

            {/* Open in Spotify Link */}
            <a
              href={spotifyTrack.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-3 text-sm opacity-60 hover:opacity-100 transition-opacity pointer-events-auto"
              style={{ color: styles.textColor }}
            >
              <ExternalLink className="w-4 h-4" />
              Open in Spotify
            </a>
          </motion.div>
        )}

        <div className="flex flex-col gap-3 sm:gap-4 px-4">
          <GameButton
            onClick={onRestart}
            glowColor={styles.glowColor}
            textColor={styles.textColor}
            className="px-6 sm:px-8 py-3 text-sm sm:text-base w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            Play Again
          </GameButton>

          {onMenu && (
            <GameButton
              onClick={onMenu}
              variant="outline"
              glowColor={styles.glowColor}
              textColor={styles.textColor}
              className="px-6 sm:px-8 py-3 text-sm sm:text-base w-full sm:w-auto"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              Back to Menu
            </GameButton>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
