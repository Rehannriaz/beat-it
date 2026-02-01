// frontend/src/components/spotify-wizard/step-search.tsx

'use client';

import { motion } from 'framer-motion';
import { TrackSearch } from '@/components/spotify/track-search';
import { SpotifyLogin } from '@/components/spotify/spotify-login';
import { useSpotifyAuth } from '@/hooks/use-spotify-auth';
import type { Theme } from '@/lib/game-types';
import type { SpotifyTrack } from '@/lib/spotify/types';
import { themeStyles } from '@/lib/game-types';

interface StepSearchProps {
  theme: Theme;
  onTrackSelect: (track: SpotifyTrack) => void;
}

export function StepSearch({ theme, onTrackSelect }: StepSearchProps) {
  const { isLoggedIn } = useSpotifyAuth();
  const styles = themeStyles[theme];

  if (!isLoggedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="text-center py-4 sm:py-6 md:py-8 px-2"
      >
        <p className="mb-3 sm:mb-4 text-sm sm:text-base" style={{ color: styles.textColor }}>
          Connect to Spotify to search for songs
        </p>
        <SpotifyLogin />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <TrackSearch onTrackSelect={onTrackSelect as (track: unknown) => void} />
    </motion.div>
  );
}
