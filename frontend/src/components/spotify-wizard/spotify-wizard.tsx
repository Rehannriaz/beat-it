// frontend/src/components/spotify-wizard/spotify-wizard.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepSearch } from './step-search';
import { StepGenerate } from './step-generate';
import type { Theme } from '@/lib/game-types';
import type { SpotifyTrack } from '@/lib/spotify/types';
import type { GamePattern } from '@/lib/pattern-types';
import { themeStyles } from '@/lib/game-types';

type WizardStep = 'search' | 'generate';

interface SpotifyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (track: SpotifyTrack, pattern: GamePattern) => void;
  theme: Theme;
}

export function SpotifyWizard({ isOpen, onClose, onComplete, theme }: SpotifyWizardProps) {
  const [step, setStep] = useState<WizardStep>('search');
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const styles = themeStyles[theme];

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setStep('generate');
  };

  const handleGenerateComplete = (pattern: GamePattern) => {
    if (selectedTrack) {
      onComplete(selectedTrack, pattern);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep('search');
    setSelectedTrack(null);
    onClose();
  };

  const handleBack = () => {
    setStep('search');
    setSelectedTrack(null);
  };

  if (!isOpen) return null;

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
          <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: styles.textColor }}>
            {step === 'search' ? 'Search Spotify' : 'Generate Pattern'}
          </h2>
          <div className="flex gap-2">
            {(['search', 'generate'] as WizardStep[]).map((s, i) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background:
                    i <= ['search', 'generate'].indexOf(step)
                      ? styles.glowColor
                      : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        </div>

        {step === 'generate' && (
          <button
            onClick={handleBack}
            className="text-xs sm:text-sm opacity-60 hover:opacity-100 mb-3 sm:mb-4"
            style={{ color: styles.textColor }}
          >
            ← Back to search
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 'search' && (
            <StepSearch key="search" theme={theme} onTrackSelect={handleTrackSelect} />
          )}
          {step === 'generate' && selectedTrack && (
            <StepGenerate
              key="generate"
              theme={theme}
              track={selectedTrack}
              onComplete={handleGenerateComplete}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
