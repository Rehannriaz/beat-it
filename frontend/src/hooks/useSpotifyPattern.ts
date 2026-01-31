// frontend/src/hooks/useSpotifyPattern.ts

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { spotifyApi } from '@/lib/spotify/api';
import { transformSpotifyAnalysis } from '@/lib/spotify/transform';
import type { GamePattern } from '@/lib/pattern-types';
import type { SpotifyTrack } from '@/lib/spotify/types';

interface GenerateSpotifyPatternInput {
  track: SpotifyTrack;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface GeneratePatternResponse {
  data: GamePattern;
}

export function useSpotifyPattern() {
  return useMutation({
    mutationFn: async ({ track, difficulty }: GenerateSpotifyPatternInput) => {
      // 1. Fetch audio analysis from Spotify
      const analysis = await spotifyApi.getAudioAnalysis(track.id);

      // 2. Transform to AudioFeatures format
      const features = transformSpotifyAnalysis(analysis);

      // 3. Call backend to generate pattern
      const response = await api.post<GeneratePatternResponse>(
        '/spotify/generate-pattern',
        {
          trackId: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          duration: track.duration_ms / 1000,
          difficulty,
          features,
        }
      );

      return response.data;
    },
  });
}
