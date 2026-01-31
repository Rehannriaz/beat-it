/**
 * Pattern JSON format types for rhythm game patterns
 * These types define the structure for beat-synchronized game patterns
 */

export type TileType = 'normal' | 'hold' | 'rapid';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PatternMetadata {
  songId: string;
  songTitle?: string;
  artist?: string;
  duration: number; // Total song duration in seconds
  bpm: number; // Beats per minute
  timeSignature?: string; // e.g., "4/4", "3/4"
  difficulty: Difficulty;
  generatedAt: string; // ISO 8601 timestamp
  generatorVersion?: string;
}

export interface PatternSettings {
  laneCount: number; // Number of lanes (default: 4)
  hitZoneY: number; // Y position of hit zone (percentage)
  hitTolerance: number; // Tolerance for hitting (percentage)
  tileSpeed: number; // Base tile movement speed
  spawnOffset: number; // Seconds before hit time to spawn tile
  playbackSpeed?: number; // Default: 1.0 (normal speed), 1.5 = 1.5x, 0.75 = 0.75x
}

export interface BasePatternTile {
  id: string; // Unique tile identifier
  time: number; // Time in seconds when tile should be hit
  lane: number; // Lane index (0-3)
  type: TileType; // Tile type
  beatStrength?: number; // 0-1, strength of the beat (for visual effects)
}

export interface NormalTile extends BasePatternTile {
  type: 'normal';
}

export interface HoldTile extends BasePatternTile {
  type: 'hold';
  holdDuration: number; // Duration to hold (seconds)
}

export interface RapidTile extends BasePatternTile {
  type: 'rapid';
  rapidCount: number; // Number of rapid hits required
  rapidInterval: number; // Time between rapid hits (seconds)
}

export type PatternTile = NormalTile | HoldTile | RapidTile;

export interface GamePattern {
  version: string;
  metadata: PatternMetadata;
  settings: PatternSettings;
  tiles: PatternTile[]; // Sorted by time (ascending)
}

/**
 * Helper function to validate a pattern tile
 */
export function isValidPatternTile(tile: PatternTile, laneCount: number): boolean {
  if (tile.lane < 0 || tile.lane >= laneCount) {
    return false;
  }
  if (tile.time < 0) {
    return false;
  }
  if (tile.beatStrength !== undefined && (tile.beatStrength < 0 || tile.beatStrength > 1)) {
    return false;
  }
  
  switch (tile.type) {
    case 'hold':
      if (!tile.holdDuration || tile.holdDuration <= 0) {
        return false;
      }
      break;
    case 'rapid':
      if (!tile.rapidCount || tile.rapidCount < 2) {
        return false;
      }
      if (!tile.rapidInterval || tile.rapidInterval <= 0) {
        return false;
      }
      break;
  }
  
  return true;
}

/**
 * Helper function to calculate spawn time for a tile
 */
export function getSpawnTime(tile: PatternTile, settings: PatternSettings): number {
  const playbackSpeed = settings.playbackSpeed || 1.0;
  const adjustedTime = tile.time / playbackSpeed;
  const adjustedSpawnOffset = settings.spawnOffset / playbackSpeed;
  return adjustedTime - adjustedSpawnOffset;
}
