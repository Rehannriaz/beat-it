// backend/src/controllers/spotifyController.ts

import { Request, Response, NextFunction } from 'express';
import { spotifyService } from '../services/spotifyService';
import type { GenerateSpotifyPatternRequest } from '../types/spotify';

export const spotifyController = {
  async generatePattern(
    req: Request<{}, {}, GenerateSpotifyPatternRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { trackId, title, artist, difficulty, features } = req.body;

      if (!trackId || !title || !difficulty || !features) {
        return res.status(400).json({
          error: 'Missing required fields: trackId, title, difficulty, features',
        });
      }

      const pattern = await spotifyService.generatePattern(
        trackId,
        title,
        artist || 'Unknown Artist',
        difficulty,
        features
      );

      return res.json({ data: pattern });
    } catch (error) {
      next(error);
    }
  },
};
