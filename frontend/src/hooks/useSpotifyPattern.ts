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
        console.log('[SpotifyPattern] Got audio analysis:', {
          beats: analysis.beats?.length ?? 0,
          tatums: analysis.tatums?.length ?? 0,
          bars: analysis.bars?.length ?? 0,
          segments: analysis.segments?.length ?? 0,
        });
        features = transformSpotifyAnalysis(analysis);
        console.log('[SpotifyPattern] Transformed features:', {
          beat_times: features.beat_times.length,
          onset_times: features.onset_times.length,
          downbeat_times: features.downbeat_times.length,
          first_10_beats: features.beat_times.slice(0, 10),
          first_10_onsets: features.onset_times.slice(0, 10),
        });
      } catch (error) {
        // Audio Analysis API deprecated - fallback to basic features
        console.warn('[SpotifyPattern] Audio Analysis unavailable, using fallback generation:', error);

        // Try to get audio features for tempo (may also be deprecated)
        let audioFeatures: SpotifyAudioFeatures | null = null;
        try {
          audioFeatures = await spotifyApi.getAudioFeatures(track.id);
          console.log('[SpotifyPattern] Got audio features:', { tempo: audioFeatures?.tempo });
        } catch (err) {
          console.warn('[SpotifyPattern] Audio Features also unavailable, using default tempo:', err);
        }

        // Generate features from track info
        features = generateFeaturesFromTrack(track.duration_ms, audioFeatures);
        console.log('[SpotifyPattern] Generated fallback features:', {
          beat_times: features.beat_times.length,
          onset_times: features.onset_times.length,
          first_10_beats: features.beat_times.slice(0, 10),
        });
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
