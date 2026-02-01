import { Router } from 'express';
import { supabase } from '../config/supabase';
import { songRoutes } from './songRoutes';
import { spotifyAuthRoutes } from './spotifyAuth';
import { spotifyRoutes } from './spotifyRoutes';

const router = Router();

// Inline example pattern to avoid file system issues in production
const examplePattern = {
  version: '1.0',
  metadata: {
    songId: 'example-song-001',
    songTitle: 'Example Song',
    artist: 'Example Artist',
    duration: 60.0,
    bpm: 120,
    timeSignature: '4/4',
    difficulty: 'medium',
    generatedAt: '2024-01-15T10:30:00Z',
    generatorVersion: '1.0.0',
  },
  settings: {
    laneCount: 4,
    hitZoneY: 85,
    hitTolerance: 12,
    tileSpeed: 0.4,
    spawnOffset: 2.0,
    playbackSpeed: 1.0,
  },
  tiles: [
    // Section 1: Intro with normal tiles (slow pace)
    { id: 'tile-0', time: 2.0, lane: 0, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-1', time: 3.0, lane: 1, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-2', time: 4.0, lane: 2, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-3', time: 5.0, lane: 3, type: 'normal', beatStrength: 0.8 },

    // Section 2: First hold tile demo
    { id: 'tile-4', time: 7.0, lane: 1, type: 'hold', beatStrength: 1.0, holdDuration: 1.5 },
    { id: 'tile-5', time: 10.0, lane: 2, type: 'normal', beatStrength: 0.7 },

    // Section 3: First rapid tile demo
    { id: 'tile-6', time: 12.0, lane: 0, type: 'rapid', beatStrength: 1.0, rapidCount: 3, rapidInterval: 0.2 },
    { id: 'tile-7', time: 14.0, lane: 3, type: 'normal', beatStrength: 0.6 },

    // Section 4: Mixed pattern
    { id: 'tile-8', time: 16.0, lane: 0, type: 'normal', beatStrength: 0.9 },
    { id: 'tile-9', time: 17.5, lane: 2, type: 'normal', beatStrength: 0.9 },
    { id: 'tile-10', time: 19.0, lane: 1, type: 'hold', beatStrength: 1.0, holdDuration: 2.0 },
    { id: 'tile-11', time: 22.0, lane: 3, type: 'normal', beatStrength: 0.7 },

    // Section 5: Rapid fire section
    { id: 'tile-12', time: 24.0, lane: 2, type: 'rapid', beatStrength: 1.0, rapidCount: 4, rapidInterval: 0.15 },
    { id: 'tile-13', time: 27.0, lane: 0, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-14', time: 28.5, lane: 1, type: 'normal', beatStrength: 0.8 },

    // Section 6: Long hold
    { id: 'tile-15', time: 30.0, lane: 3, type: 'hold', beatStrength: 1.0, holdDuration: 3.0 },
    { id: 'tile-16', time: 35.0, lane: 0, type: 'normal', beatStrength: 0.7 },

    // Section 7: Relaxed succession
    { id: 'tile-17', time: 37.0, lane: 0, type: 'normal', beatStrength: 0.9 },
    { id: 'tile-18', time: 38.0, lane: 1, type: 'normal', beatStrength: 0.9 },
    { id: 'tile-19', time: 39.0, lane: 2, type: 'normal', beatStrength: 0.9 },
    { id: 'tile-20', time: 40.0, lane: 3, type: 'normal', beatStrength: 0.9 },

    // Section 8: Hold with rapid combo
    { id: 'tile-21', time: 43.0, lane: 0, type: 'hold', beatStrength: 1.0, holdDuration: 1.5 },
    { id: 'tile-22', time: 46.0, lane: 2, type: 'rapid', beatStrength: 1.0, rapidCount: 5, rapidInterval: 0.12 },

    // Section 9: All lanes active (spaced out)
    { id: 'tile-23', time: 49.0, lane: 0, type: 'normal', beatStrength: 1.0 },
    { id: 'tile-24', time: 50.0, lane: 1, type: 'normal', beatStrength: 1.0 },
    { id: 'tile-25', time: 51.0, lane: 2, type: 'normal', beatStrength: 1.0 },
    { id: 'tile-26', time: 52.0, lane: 3, type: 'normal', beatStrength: 1.0 },

    // Section 10: Medium holds
    { id: 'tile-27', time: 55.0, lane: 1, type: 'hold', beatStrength: 0.9, holdDuration: 1.2 },
    { id: 'tile-28', time: 58.0, lane: 2, type: 'hold', beatStrength: 0.9, holdDuration: 1.2 },

    // Section 11: Rapid with different counts
    { id: 'tile-29', time: 62.0, lane: 3, type: 'rapid', beatStrength: 1.0, rapidCount: 2, rapidInterval: 0.25 },
    { id: 'tile-30', time: 65.0, lane: 0, type: 'rapid', beatStrength: 1.0, rapidCount: 6, rapidInterval: 0.1 },

    // Section 12: Final pattern
    { id: 'tile-31', time: 69.0, lane: 1, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-32', time: 70.5, lane: 2, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-33', time: 72.0, lane: 0, type: 'hold', beatStrength: 1.0, holdDuration: 2.5 },
    { id: 'tile-34', time: 76.0, lane: 3, type: 'rapid', beatStrength: 1.0, rapidCount: 4, rapidInterval: 0.12 },

    // Section 13: Outro
    { id: 'tile-35', time: 79.0, lane: 0, type: 'normal', beatStrength: 0.7 },
    { id: 'tile-36', time: 80.5, lane: 1, type: 'normal', beatStrength: 0.7 },
    { id: 'tile-37', time: 82.0, lane: 2, type: 'normal', beatStrength: 0.7 },
    { id: 'tile-38', time: 83.5, lane: 3, type: 'normal', beatStrength: 0.7 },
    { id: 'tile-39', time: 85.0, lane: 1, type: 'hold', beatStrength: 1.0, holdDuration: 2.0 },
  ],
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and its services
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/health', async (req, res) => {
  let dbHealthy = false;
  try {
    const { error } = await supabase.from('songs').select('id').limit(1);
    dbHealthy = !error;
  } catch {
    dbHealthy = false;
  }
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});

// Mount route modules
router.use('/songs', songRoutes);
router.use('/', spotifyAuthRoutes); // Spotify auth routes (callback and token exchange)
router.use('/spotify', spotifyRoutes);

/**
 * @swagger
 * /patterns/example:
 *   get:
 *     summary: Get example pattern
 *     description: Returns a sample game pattern for testing
 *     tags:
 *       - Patterns
 *     responses:
 *       200:
 *         description: Example pattern data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GamePattern'
 */
router.get('/patterns/example', (req, res) => {
  res.json(examplePattern);
});

export const routes = router;
