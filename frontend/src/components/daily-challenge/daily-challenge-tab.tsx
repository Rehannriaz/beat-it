'use client'

import { motion } from 'framer-motion'
import { Play, Music, Loader2, AlertCircle } from 'lucide-react'
import { useDailyChallenge, useLeaderboard, useUserBestScore } from '@/hooks'
import { CountdownTimer } from './countdown-timer'
import { LeaderboardList } from './leaderboard-list'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

interface DailyChallengeTabProps {
  theme: Theme
  onPlay: (trackId: string) => void
  onSpotifyAuth: () => void
}

export function DailyChallengeTab({ theme, onPlay, onSpotifyAuth }: DailyChallengeTabProps) {
  const styles = themeStyles[theme]
  const { challengeInfo, isLoading, countdownFormatted, hasSpotifyAuth } = useDailyChallenge()
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    challengeInfo?.date || ''
  )
  const { data: userBest } = useUserBestScore(challengeInfo?.date || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: styles.glowColor }} />
      </div>
    )
  }

  if (!hasSpotifyAuth) {
    return (
      <div className="text-center py-8 px-4">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-60" style={{ color: styles.textColor }} />
        <h3 className="text-lg font-bold mb-2" style={{ color: styles.textColor }}>
          Spotify Connection Required
        </h3>
        <p className="text-sm opacity-60 mb-6" style={{ color: styles.textColor }}>
          Connect your Spotify account to play the daily challenge
        </p>
        <button
          onClick={onSpotifyAuth}
          className="px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 mx-auto"
          style={{ background: '#1DB954', color: '#000' }}
        >
          <Music className="w-5 h-5" />
          Connect Spotify
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto px-4"
    >
      {/* Today's Challenge Header */}
      <div className="text-center mb-6">
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: styles.textColor }}
        >
          Today's Challenge
        </h2>
        <CountdownTimer
          timeFormatted={countdownFormatted}
          textColor={styles.textColor}
          glowColor={styles.glowColor}
        />
      </div>

      {/* Song Card */}
      {challengeInfo?.trackId && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${styles.glowColor}30`,
          }}
        >
          <div className="flex items-center gap-4">
            {challengeInfo.albumArt && (
              <img
                src={challengeInfo.albumArt}
                alt="Album art"
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3
                className="font-bold truncate"
                style={{ color: styles.textColor }}
              >
                {challengeInfo.trackName}
              </h3>
              <p
                className="text-sm opacity-60 truncate"
                style={{ color: styles.textColor }}
              >
                {challengeInfo.artistName}
              </p>
            </div>
          </div>

          <button
            onClick={() => onPlay(challengeInfo.trackId!)}
            className="w-full mt-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            style={{
              background: styles.glowColor,
              color: '#000',
              boxShadow: `0 0 20px ${styles.glowColor}40`,
            }}
          >
            <Play className="w-5 h-5" />
            Play Challenge
          </button>
        </div>
      )}

      {/* User's Best */}
      {userBest && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-center"
          style={{
            background: `${styles.glowColor}15`,
            border: `1px solid ${styles.glowColor}30`,
          }}
        >
          <span className="text-sm opacity-60" style={{ color: styles.textColor }}>
            Your Best Today:
          </span>
          <span className="ml-2 font-bold" style={{ color: styles.laneColors[0] }}>
            {userBest.score.toLocaleString()}
          </span>
          <span className="ml-2 text-sm opacity-60" style={{ color: styles.textColor }}>
            ({userBest.accuracy.toFixed(1)}% • {userBest.max_combo}x)
          </span>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h3
          className="text-sm font-medium uppercase tracking-wider opacity-60 mb-3"
          style={{ color: styles.textColor }}
        >
          Leaderboard
        </h3>
        <LeaderboardList
          entries={leaderboard || []}
          isLoading={leaderboardLoading}
          textColor={styles.textColor}
          glowColor={styles.glowColor}
          laneColors={styles.laneColors}
        />
      </div>
    </motion.div>
  )
}
