import { supabase } from '../config/supabase';
import type { Song, CreateSongInput, GamePattern } from '../types/song';

const mapRowToSong = (row: any): Song => ({
  id: row.id,
  title: row.title,
  artist: row.artist,
  duration: row.duration ? parseFloat(row.duration) : null,
  bpm: row.bpm,
  difficulty: row.difficulty,
  fileUrl: row.file_url,
  filePath: row.file_path,
  pattern: row.pattern,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const songRepository = {
  async findAll(): Promise<Song[]> {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch songs: ${error.message}`);
    return (data || []).map(mapRowToSong);
  },

  async findById(id: string): Promise<Song | null> {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch song: ${error.message}`);
    }
    return data ? mapRowToSong(data) : null;
  },

  async create(input: CreateSongInput): Promise<Song> {
    const { data, error } = await supabase
      .from('songs')
      .insert({
        title: input.title,
        artist: input.artist || null,
        duration: input.duration || null,
        bpm: input.bpm || null,
        difficulty: input.difficulty || 'medium',
        file_url: input.fileUrl,
        file_path: input.filePath,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create song: ${error.message}`);
    return mapRowToSong(data);
  },

  async updatePattern(id: string, pattern: GamePattern): Promise<Song | null> {
    const { data, error } = await supabase
      .from('songs')
      .update({
        pattern,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update pattern: ${error.message}`);
    }
    return data ? mapRowToSong(data) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete song: ${error.message}`);
    return (count ?? 1) > 0;
  },
};
