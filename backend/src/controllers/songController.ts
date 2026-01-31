import { Request, Response, NextFunction } from 'express';
import { songService } from '../services/songService';
import { AppError } from '../utils/AppError';

export const songController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const songs = await songService.getAllSongs();
      res.json({ data: songs });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const song = await songService.getSongById(req.params.id);
      res.json({ data: song });
    } catch (error) {
      next(error);
    }
  },

  async getPattern(req: Request, res: Response, next: NextFunction) {
    try {
      const pattern = await songService.getPatternById(req.params.id);
      if (!pattern) {
        res.json({ data: null, message: 'No pattern available for this song' });
        return;
      }
      res.json({ data: pattern });
    } catch (error) {
      next(error);
    }
  },

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const { title, artist, duration, bpm, difficulty } = req.body;

      const song = await songService.uploadSong(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        {
          title,
          artist,
          duration: duration ? parseFloat(duration) : undefined,
          bpm: bpm ? parseInt(bpm) : undefined,
          difficulty,
        }
      );

      res.status(201).json({ data: song });
    } catch (error) {
      next(error);
    }
  },

  async updatePattern(req: Request, res: Response, next: NextFunction) {
    try {
      const { pattern } = req.body;
      if (!pattern) {
        throw new AppError('Pattern data is required', 400);
      }

      const song = await songService.updatePattern(req.params.id, pattern);
      res.json({ data: song });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await songService.deleteSong(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const features = await songService.analyzeSong(req.params.id);
      res.json({ data: features });
    } catch (error) {
      next(error);
    }
  },

  async generatePattern(req: Request, res: Response, next: NextFunction) {
    try {
      const { difficulty, provider } = req.body;
      if (!difficulty) {
        throw new AppError('Difficulty is required', 400);
      }

      const song = await songService.generatePattern(
        req.params.id,
        difficulty,
        provider
      );
      res.json({ data: song });
    } catch (error) {
      next(error);
    }
  },
};
