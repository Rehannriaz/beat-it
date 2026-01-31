import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from './_utils/handler';
import { db } from './_utils/db';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Health status
 */
export default createHandler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const dbHealthy = await db.healthCheck();

  res.status(200).json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});
