'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, User, Loader2, Trophy } from 'lucide-react'
import { useAuth, useSubmitScore } from '@/hooks'
import { AuthModal } from '@/components/auth/auth-modal'

interface ScoreSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  score: number
  accuracy: number
  maxCombo: number
  challengeDate: string
  spotifyTrackId: string
  textColor: string
  glowColor: string
  laneColors: string[]
}

export function ScoreSubmitModal({
  isOpen,
  onClose,
  score,
  accuracy,
  maxCombo,
  challengeDate,
  spotifyTrackId,
  textColor,
  glowColor,
  laneColors,
}: ScoreSubmitModalProps) {
  const [showAuth, setShowAuth] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { profile, isAuthenticated } = useAuth()
  const submitScore = useSubmitScore()

  const handleSubmitAsUser = async () => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    await submitScore.mutateAsync({
      challenge_date: challengeDate,
      spotify_track_id: spotifyTrackId,
      score,
      accuracy,
      max_combo: maxCombo,
    })
    setSubmitted(true)
  }

  const handleSubmitAsGuest = async () => {
    if (!guestName.trim() || guestName.length < 2) return

    await submitScore.mutateAsync({
      challenge_date: challengeDate,
      spotify_track_id: spotifyTrackId,
      score,
      accuracy,
      max_combo: maxCombo,
      guest_name: guestName.trim(),
    })
    setSubmitted(true)
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md rounded-2xl p-6"
          style={{
            background: 'rgba(20,20,30,0.95)',
            border: `1px solid ${glowColor}40`,
            boxShadow: `0 0 60px ${glowColor}30`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: textColor }}
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: '#FFD700' }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
                Score Submitted!
              </h2>
              <p className="opacity-60 mb-6" style={{ color: textColor }}>
                Check the leaderboard to see your rank
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-lg font-medium"
                style={{ background: glowColor, color: '#000' }}
              >
                View Leaderboard
              </button>
            </div>
          ) : (
            <>
              <h2
                className="text-2xl font-bold text-center mb-6"
                style={{ color: textColor }}
              >
                Challenge Complete!
              </h2>

              {/* Score display */}
              <div className="text-center mb-6 space-y-2">
                <div>
                  <div className="text-sm opacity-60" style={{ color: textColor }}>Score</div>
                  <div
                    className="text-4xl font-bold"
                    style={{ color: laneColors[0], textShadow: `0 0 20px ${laneColors[0]}60` }}
                  >
                    {score.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-center gap-8">
                  <div>
                    <div className="text-sm opacity-60" style={{ color: textColor }}>Accuracy</div>
                    <div className="text-xl font-bold" style={{ color: laneColors[1] }}>
                      {accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60" style={{ color: textColor }}>Max Combo</div>
                    <div className="text-xl font-bold" style={{ color: laneColors[2] }}>
                      {maxCombo}x
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="border-t pt-6 space-y-4"
                style={{ borderColor: `${textColor}20` }}
              >
                <p className="text-center text-sm opacity-60" style={{ color: textColor }}>
                  Submit your score to the leaderboard
                </p>

                {/* Sign in option */}
                <button
                  onClick={handleSubmitAsUser}
                  disabled={submitScore.isPending}
                  className="w-full py-3 rounded-lg font-medium transition-all
                           disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: glowColor, color: '#000' }}
                >
                  {submitScore.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      {isAuthenticated
                        ? `Submit as ${profile?.display_name || 'User'}`
                        : 'Sign in with Email'
                      }
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: `${textColor}20` }} />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2" style={{ background: 'rgba(20,20,30,0.95)', color: textColor }}>
                      or
                    </span>
                  </div>
                </div>

                {/* Guest option */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value.slice(0, 20))}
                    placeholder="Enter nickname"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10
                             focus:border-opacity-50 focus:outline-none transition-colors"
                    style={{ color: textColor }}
                  />
                  <button
                    onClick={handleSubmitAsGuest}
                    disabled={!guestName.trim() || guestName.length < 2 || submitScore.isPending}
                    className="px-4 py-3 rounded-lg font-medium transition-all
                             disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: textColor,
                      border: `1px solid ${textColor}30`,
                    }}
                  >
                    Submit
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full text-sm opacity-60 hover:opacity-100 transition-opacity py-2"
                  style={{ color: textColor }}
                >
                  Skip
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
        textColor={textColor}
        glowColor={glowColor}
      />
    </>
  )
}
