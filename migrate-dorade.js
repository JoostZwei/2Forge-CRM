/**
 * Aditivna migracija (ne briše postojeće podatke): dodaje nova polja na deals
 * potrebna za dorade prodajnog pipeline-a.
 * Pokretanje: node migrate-dorade.js
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Spajam se na Neon...');

  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS vrijednost_jednokratno NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS tip_posla TEXT DEFAULT 'recurring'`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS oib TEXT`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS pravni_subjekt TEXT`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS datum_zadnje_komunikacije TEXT`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS smjer_zadnje_komunikacije TEXT`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS na_potezu TEXT`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS valjanost_ponude TEXT`;

  console.log('✓ Nova polja dodana na deals (postojeći podaci netaknuti)');

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'deals' ORDER BY ordinal_position`;
  console.log('Trenutni stupci deals:', cols.map(c => c.column_name).join(', '));
}

run().catch(e => { console.error('GREŠKA:', e.message); process.exit(1); });
