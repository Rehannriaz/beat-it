import { Router } from 'express';
import { db } from '../config/database';
import { songRoutes } from './songRoutes';
import { spotifyAuthRoutes } from './spotifyAuth';

const router = Router();

// Inline example pattern to avoid file system issues in production
const examplePattern = {
  version: '1.0',
  metadata: {
    songId: 'example-song-001',
    songTitle: 'Example Song',
    artist: 'Example Artist',
    duration: 120.0,
    bpm: 128,
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
    { id: 'tile-0', time: 0.5, lane: 0, type: 'normal', beatStrength: 0.7 },
    { id: 'tile-1', time: 1.0, lane: 2, type: 'normal', beatStrength: 1.0 },
    { id: 'tile-2', time: 1.5, lane: 1, type: 'normal', beatStrength: 0.6 },
    { id: 'tile-3', time: 2.0, lane: 3, type: 'hold', beatStrength: 0.9, holdDuration: 0.8 },
    { id: 'tile-4', time: 2.5, lane: 0, type: 'normal', beatStrength: 0.5 },
    { id: 'tile-5', time: 3.0, lane: 1, type: 'rapid', beatStrength: 1.0, rapidCount: 3, rapidInterval: 0.12 },
    { id: 'tile-6', time: 4.0, lane: 2, type: 'normal', beatStrength: 0.8 },
    { id: 'tile-7', time: 4.5, lane: 3, type: 'normal', beatStrength: 0.4 },
    { id: 'tile-8', time: 5.0, lane: 0, type: 'hold', beatStrength: 0.95, holdDuration: 1.2 },
    { id: 'tile-9', time: 6.0, lane: 1, type: 'rapid', beatStrength: 0.9, rapidCount: 4, rapidInterval: 0.1 },
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
  const dbHealthy = await db.healthCheck();
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
