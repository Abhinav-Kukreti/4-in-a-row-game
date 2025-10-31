import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Add connection retry logic
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Handle connection errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't crash the app, just log it
});

// Create tables if they don't exist
const initDatabase = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          games_played INTEGER DEFAULT 0,
          games_won INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(50) UNIQUE NOT NULL,
          player1_username VARCHAR(50),
          player2_username VARCHAR(50),
          winner VARCHAR(50),
          game_duration INTEGER,
          moves_count INTEGER,
          board_state JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP
        );
      `);

      console.log('✅ Database tables initialized');
      break;
    } catch (error) {
      retries--;
      console.error(`❌ Database initialization error (${retries} retries left):`, error.message);
      if (retries === 0) {
        console.error('⚠️ Could not initialize database. App will continue but database features may not work.');
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }
};

initDatabase();

// Helper function for safe query execution
export const safeQuery = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database query error:', error.message);
    return { rows: [], error: error.message };
  }
};

export default pool;
