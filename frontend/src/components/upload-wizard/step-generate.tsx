'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGeneratePattern } from '@/hooks/useSongs'
import type { Theme } from '@/lib/game-types'
import type { Song, AudioFeatures } from '@/types/api'
import { themeStyles } from '@/lib/game-types'

interface StepGenerateProps {
  theme: Theme
  song: Song
  audioFeatures: AudioFeatures
  onComplete: (song: Song) => void
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

const difficultyInfo: Record<Difficulty, { label: string; description: string; color: string }> = {
  easy: {
    label: 'Easy',
    description: 'Relaxed pace, simple patterns',
    color: '#4ade80',
  },
  medium: {
    label: 'Medium',
    description: 'Moderate challenge, some holds',
    color: '#facc15',
  },
  hard: {
    label: 'Hard',
    description: 'Fast pace, complex patterns',
    color: '#f97316',
  },
  expert: {
    label: 'Expert',
    description: 'Maximum intensity, for pros',
    color: '#ef4444',
  },
}

export function StepGenerate({ theme, song, audioFeatures, onComplete }: StepGenerateProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const generateMutation = useGeneratePattern()
  const styles = themeStyles[theme]

  const handleGenerate = async () => {
    try {
      const updatedSong = await generateMutation.mutateAsync({
        id: song.id,
        difficulty,
        provider: 'algorithmic',
      })
      onComplete(updatedSong)
    } catch (error) {
      console.error('Generation failed:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <p className="text-sm mb-3 opacity-60" style={{ color: styles.textColor }}>
          Select difficulty level
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(difficultyInfo) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              disabled={generateMutation.isPending}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                difficulty === d ? 'scale-[1.02]' : 'opacity-60 hover:opacity-80'
              }`}
              style={{
                borderColor: difficulty === d ? difficultyInfo[d].color : 'transparent',
                background: difficulty === d
                  ? `${difficultyInfo[d].color}15`
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <p
                className="font-bold text-lg"
                style={{ color: difficultyInfo[d].color }}
              >
                {difficultyInfo[d].label}
              </p>
              <p
                className="text-xs opacity-70"
                style={{ color: styles.textColor }}
              >
                {difficultyInfo[d].description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div
        className="p-3 rounded-lg text-center text-sm"
        style={{
          background: 'rgba(255,255,255,0.05)',
          color: styles.textColor,
        }}
      >
        <p className="opacity-60">
          Pattern will be generated for <strong>{song.title}</strong> at{' '}
          <strong>{Math.round(audioFeatures.bpm)} BPM</strong>
        </p>
      </div>

      {generateMutation.isError && (
        <p className="text-red-400 text-sm text-center">
          Generation failed. Please try again.
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
        className="w-full"
        style={{
          background: styles.glowColor,
          color: '#000',
        }}
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Pattern...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Pattern
          </>
        )}
      </Button>
    </motion.div>
  )
}
