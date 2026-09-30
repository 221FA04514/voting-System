const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Explicitly load root .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

let pool;
let isPgMem = false;

// Configure SSL options for Aiven or cloud PostgreSQL
function getSslConfig() {
  if (process.env.DATABASE_SSL === 'false' || process.env.PGSSLMODE === 'disable') {
    return false;
  }

  if (process.env.PGSSLCA) {
    let caCert = process.env.PGSSLCA;
    if (fs.existsSync(caCert)) {
      caCert = fs.readFileSync(caCert, 'utf-8');
    }
    return {
      rejectUnauthorized: false,
      ca: caCert
    };
  }

  // Aiven PostgreSQL SSL configuration
  return {
    rejectUnauthorized: false
  };
}

const rawDbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';

if (rawDbUrl && !rawDbUrl.startsWith('YOUR_') && rawDbUrl.startsWith('postgres')) {
  const sslConfig = getSslConfig();
  
  // Clean connection string so ssl object options (rejectUnauthorized: false) take precedence over URL query
  const cleanDbUrl = rawDbUrl.replace(/(\?|&)sslmode=[^&]*/g, '');

  pool = new Pool({
    connectionString: cleanDbUrl,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  console.log('🔗 Connecting to PostgreSQL database (Aiven Cloud)...');
} else {
  // Fallback to in-memory PostgreSQL via pg-mem for local dev testing
  try {
    const { newDb } = require('pg-mem');
    const memDb = newDb();
    const pgMemAdapter = memDb.adapters.createPg();
    pool = new pgMemAdapter.Pool();
    isPgMem = true;
    console.log('⚡ Using in-memory PostgreSQL emulator (pg-mem) for local dev.');
  } catch (err) {
    console.error('Failed to initialize in-memory fallback database:', err);
    throw err;
  }
}

/**
 * Execute a query with parameters
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  isPgMem
};
