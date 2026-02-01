import { Router, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

const router = Router();

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/callback';

/**
 * @swagger
 * /api/callback:
 *   get:
 *     summary: Spotify OAuth callback
 *     description: Handles the OAuth callback from Spotify and redirects to frontend with code
 *     tags:
 *       - Spotify Auth
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Spotify
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error from Spotify OAuth
 *     responses:
 *       302:
 *         description: Redirects to frontend with code or error
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, error, state } = req.query;

    // Frontend URL - adjust this to match your frontend URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Use state parameter to preserve the original page, or default to /spotify-test
    const redirectPath = state ? decodeURIComponent(state as string) : '/spotify-test';
    const redirectUrl = new URL(redirectPath, frontendUrl);

    if (error) {
      // Redirect to frontend with error
      redirectUrl.searchParams.set('error', error as string);
      return res.redirect(redirectUrl.toString());
    }

    if (code) {
      // Redirect to frontend with code - frontend will handle token exchange
      redirectUrl.searchParams.set('code', code as string);
      // Preserve state parameter so frontend knows where to redirect after auth
      if (state) {
        redirectUrl.searchParams.set('state', state as string);
      }
      return res.redirect(redirectUrl.toString());
    }

    // No code or error, redirect to spotify-test page
    return res.redirect(new URL('/spotify-test', frontendUrl).toString());
  } catch (err) {
    throw new AppError('Callback handling failed', 500);
  }
});

/**
 * @swagger
 * /api/auth/spotify/token:
 *   post:
 *     summary: Exchange authorization code for access token
 *     description: Exchanges Spotify authorization code for access and refresh tokens
 *     tags:
 *       - Spotify Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Spotify
 *     responses:
 *       200:
 *         description: Tokens returned successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/auth/spotify/token', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('Authorization code is required', 400);
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new AppError('Spotify credentials not configured', 500);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: { message: 'Token exchange failed' } }));
      throw new AppError((errorData as { error?: { message?: string } }).error?.message || 'Failed to exchange authorization code', tokenResponse.status);
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Return tokens to client
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('Token exchange failed', 500);
  }
});

export const spotifyAuthRoutes = router;
