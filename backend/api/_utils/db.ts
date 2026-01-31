import { Pool, PoolClient } from 'pg';

// Serverless-optimized connection
// Reuse connection across warm invocations
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const isSupabase = (process.env.DB_HOST || '').includes('supabase.co');

    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 1, // Serverless: keep pool small
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err.message);
      pool = null;
    });
  }
  return pool;
}

export const db = {
  query: (text: string, params?: unknown[]) => getPool().query(text, params),

  getClient: async (): Promise<PoolClient> => {
    return getPool().connect();
  },

  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  healthCheck: async (): Promise<boolean> => {
    try {
      await getPool().query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },
};
