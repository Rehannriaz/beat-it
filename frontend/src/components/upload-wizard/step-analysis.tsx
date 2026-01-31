'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Music, Clock, Zap } from 'lucide-react'
import { useAnalyzeSong } from '@/hooks/useSongs'
import type { Theme } from '@/lib/game-types'
import type { Song, AudioFeatures } from '@/types/api'
import { themeStyles } from '@/lib/game-types'

interface StepAnalysisProps {
  theme: Theme
  song: Song
  onComplete: (features: AudioFeatures) => void
}

export function StepAnalysis({ theme, song, onComplete }: StepAnalysisProps) {
  const analyzeMutation = useAnalyzeSong()
  const styles = themeStyles[theme]

  useEffect(() => {
    analyzeMutation.mutate(song.id, {
      onSuccess: (features) => {
        onComplete(features)
      },
    })
  }, [song.id])

  const features = analyzeMutation.data

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center py-4">
        {analyzeMutation.isPending ? (
          <>
            <Loader2
              className="w-16 h-16 mx-auto mb-4 animate-spin"
              style={{ color: styles.glowColor }}
            />
            <p className="text-lg font-medium" style={{ color: styles.textColor }}>
              Analyzing audio...
            </p>
            <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
              Extracting BPM, beats, and energy levels
            </p>
          </>
        ) : analyzeMutation.isError ? (
          <>
            <p className="text-red-400 text-lg font-medium mb-2">
              Analysis failed
            </p>
            <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
              Please try again or upload a different file
            </p>
          </>
        ) : features ? (
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl"
              style={{ background: `${styles.glowColor}10` }}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Music className="w-6 h-6" style={{ color: styles.glowColor }} />
                <span className="text-lg font-semibold" style={{ color: styles.textColor }}>
                  {song.title}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Zap className="w-5 h-5 mx-auto mb-1" style={{ color: styles.laneColors[0] }} />
                  <p className="text-2xl font-bold" style={{ color: styles.textColor }}>
                    {Math.round(features.bpm)}
                  </p>
                  <p className="text-xs opacity-60" style={{ color: styles.textColor }}>
                    BPM
                  </p>
                </div>

                <div className="text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1" style={{ color: styles.laneColors[1] }} />
                  <p className="text-2xl font-bold" style={{ color: styles.textColor }}>
                    {Math.floor(features.duration / 60)}:{String(Math.floor(features.duration % 60)).padStart(2, '0')}
                  </p>
                  <p className="text-xs opacity-60" style={{ color: styles.textColor }}>
                    Duration
                  </p>
                </div>

                <div className="text-center">
                  <Music className="w-5 h-5 mx-auto mb-1" style={{ color: styles.laneColors[2] }} />
                  <p className="text-2xl font-bold" style={{ color: styles.textColor }}>
                    {features.beat_times.length}
                  </p>
                  <p className="text-xs opacity-60" style={{ color: styles.textColor }}>
                    Beats
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {features.segments.slice(0, 6).map((segment, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${styles.laneColors[i % 4]}20`,
                    color: styles.laneColors[i % 4],
                  }}
                >
                  {segment.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}
