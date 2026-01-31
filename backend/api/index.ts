import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from './_utils/handler';

export default createHandler(async (req: VercelRequest, res: VercelResponse) => {
  res.status(200).json({
    name: 'Hamburg Hackathon API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
    },
  });
});
