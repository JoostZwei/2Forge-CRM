const { neon } = require('@neondatabase/serverless');

// local dev: učitaj .env
try { require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); } catch {}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL nije postavljen. Dodaj ga u .env fajl.');
}

const sql = neon(process.env.DATABASE_URL || '');

module.exports = { sql };
