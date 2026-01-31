import { Pool, PoolClient } from 'pg';
import { lookup } from 'dns';
import dotenv from 'dotenv';

dotenv.config();

// Force IPv4 to avoid ENETUNREACH on platforms without IPv6 support
const ipv4Lookup = (
  hostname: string,
  options: object,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
) => {
  lookup(hostname, { family: 4 }, callback);
};

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hackathon_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

console.log(`Connecting to database at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = dbConfig.host.includes('supabase.co');

const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  // Force IPv4 for Supabase connections (many cloud platforms lack IPv6)
  ...(isSupabase && { lookup: ipv4Lookup }),
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),

  getClient: async (): Promise<PoolClient> => {
    const client = await pool.connect();
    return client;
  },

  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
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
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },

  close: () => pool.end(),
};
