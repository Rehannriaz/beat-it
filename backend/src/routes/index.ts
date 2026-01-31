import { Router } from 'express';
import { db } from '../config/database';

const router = Router();

// Health check
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
// Example:
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);

export const routes = router;
