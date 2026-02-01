// frontend/src/components/spotify-wizard/step-generate.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpotifyPattern } from '@/hooks/useSpotifyPattern';
import { SpotifyAPIDebug } from '@/components/spotify/spotify-api-debug';
import type { Theme } from '@/lib/game-types';
import type { SpotifyTrack } from '@/lib/spotify/types';
import type { GamePattern } from '@/lib/pattern-types';
import { themeStyles } from '@/lib/game-types';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const difficultyInfo: Record<Difficulty, { label: string; description: string; color: string }> = {
  easy: { label: 'Easy', description: 'Relaxed pace, simple patterns', color: '#4ade80' },
  medium: { label: 'Medium', description: 'Moderate challenge, some holds', color: '#facc15' },
  hard: { label: 'Hard', description: 'Fast pace, complex patterns', color: '#f97316' },
  expert: { label: 'Expert', description: 'Maximum intensity, for pros', color: '#ef4444' },
};

interface StepGenerateProps {
  theme: Theme;
  track: SpotifyTrack;
  onComplete: (pattern: GamePattern) => void;
}

export function StepGenerate({ theme, track, onComplete }: StepGenerateProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const generateMutation = useSpotifyPattern();
  const styles = themeStyles[theme];

  const handleGenerate = async () => {
    try {
      const pattern = await generateMutation.mutateAsync({ track, difficulty });
      onComplete(pattern);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Selected track info */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{ background: `${styles.glowColor}10` }}
      >
        {track.album.images[0] ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            className="w-12 h-12 rounded"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
            <Music className="w-6 h-6" />
          </div>
        )}
        <div>
          <p className="font-medium" style={{ color: styles.textColor }}>
            {track.name}
          </p>
          <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
            {track.artists.map((a) => a.name).join(', ')}
          </p>
        </div>
      </div>

      {/* Difficulty selection */}
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
              className={`p-4 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer ${
                difficulty === d ? 'scale-[1.02]' : 'opacity-60 hover:opacity-100 hover:scale-[1.02]'
              }`}
              style={{
                borderColor: difficulty === d 
                  ? difficultyInfo[d].color 
                  : 'transparent',
                background: difficulty === d 
                  ? `${difficultyInfo[d].color}15` 
                  : 'rgba(255,255,255,0.05)',
              }}
              onMouseEnter={(e) => {
                if (difficulty !== d && !generateMutation.isPending) {
                  e.currentTarget.style.borderColor = `${difficultyInfo[d].color}60`;
                  e.currentTarget.style.background = `${difficultyInfo[d].color}10`;
                }
              }}
              onMouseLeave={(e) => {
                if (difficulty !== d) {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
            >
              <p className="font-bold text-lg" style={{ color: difficultyInfo[d].color }}>
                {difficultyInfo[d].label}
              </p>
              <p className="text-xs opacity-70" style={{ color: styles.textColor }}>
                {difficultyInfo[d].description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {generateMutation.isError && (
        <p className="text-red-400 text-sm text-center">
          Generation failed. Please try again.
        </p>
      )}

      {/* Debug panel - collapsible */}
      <details className="mt-4">
        <summary className="text-sm opacity-60 cursor-pointer hover:opacity-100" style={{ color: styles.textColor }}>
          🔍 Debug: Test Spotify APIs
        </summary>
        <div className="mt-2">
          <SpotifyAPIDebug track={track} />
        </div>
      </details>

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
        className="w-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:hover:scale-100"
        style={{ background: styles.glowColor, color: '#000' }}
        onMouseEnter={(e) => {
          if (!generateMutation.isPending) {
            e.currentTarget.style.filter = 'brightness(1.1)';
            e.currentTarget.style.boxShadow = `0 0 20px ${styles.glowColor}60`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing & Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Pattern
          </>
        )}
      </Button>
    </motion.div>
  );
}
