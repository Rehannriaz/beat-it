// backend/src/services/spotifyService.ts

import { config } from '../config';
import { AppError } from '../utils/AppError';
import type { AudioFeaturesInput, GenerateSpotifyPatternResponse } from '../types/spotify';
import type { GamePattern } from '../types/song';

export const spotifyService = {
  async generatePattern(
    trackId: string,
    title: string,
    artist: string,
    difficulty: string,
    features: AudioFeaturesInput
  ): Promise<GamePattern> {
    const response = await fetch(
      `${config.audioService.url}/generate-pattern-from-features`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          song_id: `spotify:${trackId}`,
          title,
          artist,
          difficulty,
        }),
      }
    );

    const data = (await response.json()) as GenerateSpotifyPatternResponse;

    if (!data.success || !data.pattern) {
      throw new AppError(data.error || 'Pattern generation failed', 500);
    }

    return data.pattern;
  },
};
