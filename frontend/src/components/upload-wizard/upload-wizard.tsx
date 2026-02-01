'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepUpload } from './step-upload'
import { StepAnalysis } from './step-analysis'
import { StepGenerate } from './step-generate'
import { StepComplete } from './step-complete'
import type { Theme } from '@/lib/game-types'
import type { Song, AudioFeatures } from '@/types/api'
import { themeStyles } from '@/lib/game-types'

export type WizardStep = 'upload' | 'analysis' | 'generate' | 'complete'

interface UploadWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (song: Song) => void
  theme: Theme
}

export function UploadWizard({ isOpen, onClose, onComplete, theme }: UploadWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [uploadedSong, setUploadedSong] = useState<Song | null>(null)
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null)
  const styles = themeStyles[theme]

  const handleUploadComplete = (song: Song) => {
    setUploadedSong(song)
    setStep('analysis')
  }

  const handleAnalysisComplete = (features: AudioFeatures) => {
    setAudioFeatures(features)
    setStep('generate')
  }

  const handleGenerateComplete = (song: Song) => {
    setUploadedSong(song)
    setStep('complete')
  }

  const handlePlayNow = () => {
    if (uploadedSong) {
      onComplete(uploadedSong)
    }
    handleClose()
  }

  const handleClose = () => {
    setStep('upload')
    setUploadedSong(null)
    setAudioFeatures(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg mx-2 sm:mx-4 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(20,20,30,0.95)',
          border: `1px solid ${styles.glowColor}40`,
          boxShadow: `0 0 40px ${styles.glowColor}20`,
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 sm:top-4 right-2 sm:right-4"
          onClick={handleClose}
          style={{ color: styles.textColor }}
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        <div className="mb-4 sm:mb-6 pr-8 sm:pr-12">
          <h2
            className="text-xl sm:text-2xl font-bold mb-2"
            style={{ color: styles.textColor }}
          >
            Upload Song
          </h2>
          <div className="flex gap-2">
            {(['upload', 'analysis', 'generate', 'complete'] as WizardStep[]).map((s, i) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: i <= ['upload', 'analysis', 'generate', 'complete'].indexOf(step)
                    ? styles.glowColor
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <StepUpload
              key="upload"
              theme={theme}
              onComplete={handleUploadComplete}
            />
          )}
          {step === 'analysis' && uploadedSong && (
            <StepAnalysis
              key="analysis"
              theme={theme}
              song={uploadedSong}
              onComplete={handleAnalysisComplete}
            />
          )}
          {step === 'generate' && uploadedSong && audioFeatures && (
            <StepGenerate
              key="generate"
              theme={theme}
              song={uploadedSong}
              audioFeatures={audioFeatures}
              onComplete={handleGenerateComplete}
            />
          )}
          {step === 'complete' && uploadedSong && (
            <StepComplete
              key="complete"
              theme={theme}
              song={uploadedSong}
              onPlayNow={handlePlayNow}
              onBackToMenu={handleClose}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
