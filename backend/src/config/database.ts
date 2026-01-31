import { Pool, PoolClient } from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';

// Force IPv4 globally - fixes Docker IPv6 connectivity issues with Supabase
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const host = process.env.DB_HOST || 'localhost';
const isSupabase = host.includes('supabase.co');

console.log(`Connecting to database at ${host}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}`);

const pool = new Pool({
  host,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hackathon_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('Database connected successfully'));
pool.on('error', (err) => console.error('Database connection error:', err.message));

export const db = {
  query: async (text: string, params?: unknown[]) => {
    return pool.query(text, params);
  },

  getClient: async (): Promise<PoolClient> => {
    return pool.connect();
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

  close: async () => {
    await pool.end();
  },
};
