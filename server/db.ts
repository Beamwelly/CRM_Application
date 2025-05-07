import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Ensure env vars are loaded

// Define a more flexible type for query parameters
type NodePgPrimitive = string | number | boolean | Date | Buffer | null | undefined; // Allow undefined
export type QueryParamValue = NodePgPrimitive | NodePgPrimitive[]; // Export this type

// Create connection configuration using environment variables
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Export a query function that uses the pool, accepting the flexible parameter type
export const query = async (text: string, params?: QueryParamValue[]): Promise<QueryResult> => {
  const start = Date.now();
  let client: PoolClient | null = null; // Define client variable outside try block
  try {
    client = await pool.connect(); // Get a client from the pool
    const res: QueryResult = await client.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration: `${duration}ms`, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query:', { text, error });
    throw error; // Re-throw the error after logging
  } finally {
    if (client) {
      client.release(); // Release the client back to the pool if it was acquired
    }
  }
};

// Export the pool itself if needed for transactions
export const getPool = (): Pool => pool; 