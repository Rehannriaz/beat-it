// backend/src/types/spotify.ts

export interface AudioFeaturesInput {
  bpm: number;
  duration: number;
  beat_times: number[];
  downbeat_times: number[];
  onset_times: number[];
  onset_strengths: number[];
  energy_curve: number[];
  energy_segments: { start: number; end: number; level: string }[];
  bass_energy: number[];
  mid_energy: number[];
  high_energy: number[];
  segments: { start: number; end: number; label: string }[];
  intensity_curve: number[];
}

export interface GenerateSpotifyPatternRequest {
  trackId: string;
  title: string;
  artist: string;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  features: AudioFeaturesInput;
}

export interface GenerateSpotifyPatternResponse {
  success: boolean;
  pattern?: import('./song').GamePattern;
  error?: string;
}
