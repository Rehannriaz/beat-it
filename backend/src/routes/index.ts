import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route modules
// Example:
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);

export const routes = router;
