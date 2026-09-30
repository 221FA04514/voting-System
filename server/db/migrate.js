const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

async function migrate() {
  console.log('📦 Running PostgreSQL schema migrations...');

  try {
    const migrationSqlPath = path.join(__dirname, 'migrations', '001_init_schema.sql');
    const sql = fs.readFileSync(migrationSqlPath, 'utf-8');

    // Run Migration Schema SQL
    await query(sql);
    console.log('✅ Migration 001_init_schema.sql applied successfully.');

    // Seed default mentor user if no user exists
    const existingUsers = await query('SELECT id FROM users LIMIT 1');
    if (existingUsers.rows.length === 0) {
      const initialEmail = (process.env.MENTOR_INITIAL_EMAIL || 'mentor@voting.com').toLowerCase().trim();
      const initialPassword = process.env.MENTOR_INITIAL_PASSWORD || 'mentor123';

      if (!process.env.MENTOR_INITIAL_PASSWORD && process.env.NODE_ENV === 'production') {
        console.warn('⚠️ WARNING: MENTOR_INITIAL_PASSWORD not set. Defaulting to "mentor123".');
      }

      const hash = bcrypt.hashSync(initialPassword, bcrypt.genSaltSync(10));
      await query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [initialEmail, hash, 'Mentor Administrator', 'mentor']
      );
      console.log(`✅ Default mentor user created: ${initialEmail}`);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

// Run directly if called via CLI
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('🎉 Migration completed.');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { migrate };
