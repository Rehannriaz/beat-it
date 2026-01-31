import type { VercelRequest, VercelResponse } from '@vercel/node';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// Helper to run middleware
function runMiddleware(req: VercelRequest, res: VercelResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function createHandler(handler: Handler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Run CORS
      await runMiddleware(req, res, cors);

      // Handle preflight
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Run the actual handler
      await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ status: 'error', message });
    }
  };
}
