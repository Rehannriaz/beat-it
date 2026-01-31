// backend/src/routes/spotifyRoutes.ts

import { Router } from 'express';
import { spotifyController } from '../controllers/spotifyController';

const router = Router();

/**
 * @swagger
 * /spotify/generate-pattern:
 *   post:
 *     summary: Generate pattern from Spotify audio analysis
 *     description: Generates a game pattern using pre-analyzed audio features from Spotify's Audio Analysis API
 *     tags:
 *       - Spotify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackId
 *               - title
 *               - difficulty
 *               - features
 *             properties:
 *               trackId:
 *                 type: string
 *                 description: Spotify track ID
 *               title:
 *                 type: string
 *                 description: Song title
 *               artist:
 *                 type: string
 *                 description: Artist name
 *               duration:
 *                 type: number
 *                 description: Track duration in seconds
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, expert]
 *               features:
 *                 type: object
 *                 description: Transformed audio features from Spotify
 *     responses:
 *       200:
 *         description: Pattern generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GamePattern'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Pattern generation failed
 */
router.post('/generate-pattern', spotifyController.generatePattern);

export const spotifyRoutes = router;
