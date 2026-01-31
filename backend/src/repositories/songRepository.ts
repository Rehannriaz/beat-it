import { db } from '../config/database';
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
    const { rows } = await db.query(
      'SELECT * FROM songs ORDER BY created_at DESC'
    );
    return rows.map(mapRowToSong);
  },

  async findById(id: string): Promise<Song | null> {
    const { rows } = await db.query('SELECT * FROM songs WHERE id = $1', [id]);
    return rows[0] ? mapRowToSong(rows[0]) : null;
  },

  async create(input: CreateSongInput): Promise<Song> {
    const { rows } = await db.query(
      `INSERT INTO songs (title, artist, duration, bpm, difficulty, file_url, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.title,
        input.artist || null,
        input.duration || null,
        input.bpm || null,
        input.difficulty || 'medium',
        input.fileUrl,
        input.filePath,
      ]
    );
    return mapRowToSong(rows[0]);
  },

  async updatePattern(id: string, pattern: GamePattern): Promise<Song | null> {
    const { rows } = await db.query(
      `UPDATE songs
       SET pattern = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(pattern)]
    );
    return rows[0] ? mapRowToSong(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM songs WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  },
};
