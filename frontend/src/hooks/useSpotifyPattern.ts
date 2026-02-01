// frontend/src/hooks/useSpotifyPattern.ts

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { spotifyApi } from '@/lib/spotify/api';
import { transformSpotifyAnalysis, generateFeaturesFromTrack } from '@/lib/spotify/transform';
import type { GamePattern } from '@/lib/pattern-types';
import type { SpotifyTrack, SpotifyAudioFeatures } from '@/lib/spotify/types';

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
      let features;

      // Try to get detailed audio analysis first
      try {
        const analysis = await spotifyApi.getAudioAnalysis(track.id);
        features = transformSpotifyAnalysis(analysis);
      } catch {
        // Audio Analysis API deprecated - fallback to basic features
        console.log('Audio Analysis unavailable, using fallback generation');

        // Try to get audio features for tempo (may also be deprecated)
        let audioFeatures: SpotifyAudioFeatures | null = null;
        try {
          audioFeatures = await spotifyApi.getAudioFeatures(track.id);
        } catch {
          console.log('Audio Features also unavailable, using default tempo');
        }

        // Generate features from track info
        features = generateFeaturesFromTrack(track.duration_ms, audioFeatures);
      }

      // Call backend to generate pattern
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
