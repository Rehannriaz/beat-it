// API Response Types

export type HealthResponse = {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
  };
};

// Re-export pattern types for convenience
export type {
  GamePattern,
  PatternMetadata,
  PatternSettings,
  PatternTile,
  TileType,
  Difficulty,
} from '@/lib/pattern-types';

// Song types
export type Song = {
  id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  bpm: number | null;
  difficulty: string;
  fileUrl: string;
  filePath: string;
  pattern: import('@/lib/pattern-types').GamePattern | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiResponse<T> = {
  data: T;
};

export type UploadSongInput = {
  file: File;
  title?: string;
  artist?: string;
  duration?: number;
  bpm?: number;
  difficulty?: string;
};

export type AudioFeatures = {
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
};

export type GeneratePatternInput = {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  provider?: 'openai' | 'gemini' | 'algorithmic';
};
