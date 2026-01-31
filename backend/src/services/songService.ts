import { songRepository } from '../repositories/songRepository';
import { uploadToStorage, deleteFromStorage } from '../config/supabase';
import { AppError } from '../utils/AppError';
import type { Song, CreateSongInput, GamePattern } from '../types/song';

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
};
