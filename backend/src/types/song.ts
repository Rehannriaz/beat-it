export type TileType = 'normal' | 'hold' | 'rapid';

export type PatternTile = {
  id: string;
  time: number;
  lane: number;
  type: TileType;
  beatStrength: number;
  holdDuration?: number;
  rapidCount?: number;
  rapidInterval?: number;
};

export type PatternSettings = {
  laneCount: number;
  hitZoneY: number;
  hitTolerance: number;
  tileSpeed: number;
  spawnOffset: number;
  playbackSpeed: number;
};

export type PatternMetadata = {
  songId: string;
  songTitle: string;
  artist: string;
  duration: number;
  bpm: number;
  timeSignature: string;
  difficulty: string;
  generatedAt: string;
  generatorVersion: string;
};

export type GamePattern = {
  version: string;
  metadata: PatternMetadata;
  settings: PatternSettings;
  tiles: PatternTile[];
};

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  bpm: number | null;
  difficulty: string;
  fileUrl: string;
  filePath: string;
  pattern: GamePattern | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSongInput = {
  title: string;
  artist?: string;
  duration?: number;
  bpm?: number;
  difficulty?: string;
  fileUrl: string;
  filePath: string;
};

export type UpdateSongPatternInput = {
  pattern: GamePattern;
};
