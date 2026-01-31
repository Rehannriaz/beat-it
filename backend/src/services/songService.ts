import { songRepository } from '../repositories/songRepository';
import { uploadToStorage, deleteFromStorage } from '../config/supabase';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import type { Song, CreateSongInput, GamePattern } from '../types/song';

interface AudioFeatures {
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

interface AnalyzeResponse {
  success: boolean;
  features?: AudioFeatures;
  error?: string;
}

interface GeneratePatternResponse {
  success: boolean;
  pattern?: GamePattern;
  error?: string;
}

export const songService = {
  async getAllSongs(): Promise<Song[]> {
    return songRepository.findAll();
  },

  async getSongById(id: string): Promise<Song> {
    const song = await songRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    return song;
  },

  async getPatternById(id: string): Promise<GamePattern | null> {
    const song = await songRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }
    return song.pattern;
  },

  async uploadSong(
    file: Buffer,
    fileName: string,
    contentType: string,
    metadata: Partial<CreateSongInput>
  ): Promise<Song> {
    const { url, path } = await uploadToStorage(file, fileName, contentType);

    const songInput: CreateSongInput = {
      title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
      artist: metadata.artist,
      duration: metadata.duration,
      bpm: metadata.bpm,
      difficulty: metadata.difficulty,
      fileUrl: url,
      filePath: path,
    };

    return songRepository.create(songInput);
  },

  async updatePattern(id: string, pattern: GamePattern): Promise<Song> {
    const song = await songRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    const updated = await songRepository.updatePattern(id, pattern);
    if (!updated) {
      throw new AppError('Failed to update pattern', 500);
    }
    return updated;
  },

  async deleteSong(id: string): Promise<void> {
    const song = await songRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    await deleteFromStorage(song.filePath);
    await songRepository.delete(id);
  },

  async analyzeSong(id: string): Promise<AudioFeatures> {
    const song = await songRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    const response = await fetch(`${config.audioService.url}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: song.fileUrl }),
    });

    const data: AnalyzeResponse = await response.json();

    if (!data.success || !data.features) {
      throw new AppError(data.error || 'Audio analysis failed', 500);
    }

    return data.features;
  },

  async generatePattern(
    id: string,
    difficulty: string,
    provider?: 'openai' | 'gemini'
  ): Promise<Song> {
    const song = await songRepository.findById(id);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    const response = await fetch(`${config.audioService.url}/generate-pattern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_url: song.fileUrl,
        title: song.title,
        artist: song.artist || 'Unknown',
        difficulty,
        song_id: song.id,
        provider,
      }),
    });

    const data: GeneratePatternResponse = await response.json();

    if (!data.success || !data.pattern) {
      throw new AppError(data.error || 'Pattern generation failed', 500);
    }

    const updated = await songRepository.updatePattern(id, data.pattern);
    if (!updated) {
      throw new AppError('Failed to save pattern', 500);
    }

    return updated;
  },
};
