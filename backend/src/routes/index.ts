import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../config/database';
import { songRoutes } from './songRoutes';

const router = Router();

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
  const patternPath = join(__dirname, '../data/example-pattern.json');
  const pattern = JSON.parse(readFileSync(patternPath, 'utf-8'));
  res.json(pattern);
});

export const routes = router;
