/**
 * Jednokratna migracija: NeDB → Neon PostgreSQL
 * Pokretanje: node migrate.js
 * (DATABASE_URL mora biti postavljen u .env ili environment)
 */

require('dotenv').config();
const { neon }     = require('@neondatabase/serverless');
const Datastore    = require('@seald-io/nedb');
const path         = require('path');

const sql = neon(process.env.DATABASE_URL);
const dir = path.join(__dirname, 'server/data');

function loadDb(name) {
  return new Promise((resolve, reject) => {
    const ds = new Datastore({ filename: path.join(dir, `${name}.db`), autoload: true });
    ds.find({}, (err, docs) => err ? reject(err) : resolve(docs));
  });
}

const n = v => (v === undefined || v === '') ? null : v;
const b = v => !!v;

async function run() {
  console.log('Spajam se na Neon...');

  // ── Kreiraj tablice ─────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, industry TEXT, website TEXT,
      phone TEXT, address TEXT, created_at TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      email TEXT, phone TEXT, position TEXT, company_id TEXT, created_at TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY, title TEXT, stage TEXT, value NUMERIC DEFAULT 0,
      contact_id TEXT, company_id TEXT,
      datum_upita TEXT, tvrtka TEXT, ime_kontakta TEXT, email TEXT, telefon TEXT,
      izvor_leada TEXT, tip_usluge TEXT, vlasnik TEXT,
      upitnik_poslan BOOLEAN DEFAULT FALSE, datum_upitnika TEXT,
      upitnik_vracen BOOLEAN DEFAULT FALSE, datum_vracanja TEXT,
      ponuda_poslana BOOLEAN DEFAULT FALSE, datum_ponude TEXT,
      datum_sastanka TEXT, slj_korak TEXT, datum_slj_koraka TEXT,
      proc_volumen TEXT, razlog_gubitka TEXT, komentar TEXT,
      prospekt_id TEXT, created_at TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      due_date TEXT, done BOOLEAN DEFAULT FALSE,
      contact_id TEXT, deal_id TEXT, created_at TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY, body TEXT NOT NULL,
      contact_id TEXT, deal_id TEXT, created_at TEXT
    )`;
  console.log('✓ Tablice kreirane');

  // ── Migracija podataka ───────────────────────────────────────────────────────
  const [companies, contacts, deals, tasks, notes] = await Promise.all([
    loadDb('companies'), loadDb('contacts'), loadDb('deals'),
    loadDb('tasks'), loadDb('notes'),
  ]);

  // Brišemo stare podatke (idempotentno pokretanje)
  await sql`TRUNCATE companies, contacts, deals, tasks, notes`;

  // Companies
  for (const c of companies) {
    await sql`INSERT INTO companies (id,name,industry,website,phone,address,created_at)
              VALUES (${c._id},${c.name},${n(c.industry)},${n(c.website)},${n(c.phone)},${n(c.address)},${n(c.created_at)})`;
  }
  console.log(`✓ Companies: ${companies.length}`);

  // Contacts
  for (const c of contacts) {
    await sql`INSERT INTO contacts (id,first_name,last_name,email,phone,position,company_id,created_at)
              VALUES (${c._id},${c.first_name},${c.last_name},${n(c.email)},${n(c.phone)},${n(c.position)},${n(c.company_id)},${n(c.created_at)})`;
  }
  console.log(`✓ Contacts: ${contacts.length}`);

  // Deals
  for (const d of deals) {
    await sql`INSERT INTO deals
      (id,title,stage,value,contact_id,company_id,
       datum_upita,tvrtka,ime_kontakta,email,telefon,
       izvor_leada,tip_usluge,vlasnik,
       upitnik_poslan,datum_upitnika,upitnik_vracen,datum_vracanja,
       ponuda_poslana,datum_ponude,datum_sastanka,
       slj_korak,datum_slj_koraka,proc_volumen,
       razlog_gubitka,komentar,prospekt_id,created_at)
      VALUES
      (${d._id},${n(d.title)},${n(d.stage)},${parseFloat(d.value)||0},${n(d.contact_id)},${n(d.company_id)},
       ${n(d.datum_upita)},${n(d.tvrtka)},${n(d.ime_kontakta)},${n(d.email)},${n(d.telefon)},
       ${n(d.izvor_leada)},${n(d.tip_usluge)},${n(d.vlasnik)},
       ${b(d.upitnik_poslan)},${n(d.datum_upitnika)},${b(d.upitnik_vracen)},${n(d.datum_vracanja)},
       ${b(d.ponuda_poslana)},${n(d.datum_ponude)},${n(d.datum_sastanka)},
       ${n(d.slj_korak)},${n(d.datum_slj_koraka)},${n(d.proc_volumen)},
       ${n(d.razlog_gubitka)},${n(d.komentar)},${n(d.prospekt_id)},${n(d.created_at)})`;
  }
  console.log(`✓ Deals: ${deals.length}`);

  // Tasks
  for (const t of tasks) {
    await sql`INSERT INTO tasks (id,title,description,due_date,done,contact_id,deal_id,created_at)
              VALUES (${t._id},${t.title},${n(t.description)},${n(t.due_date)},${b(t.done)},${n(t.contact_id)},${n(t.deal_id)},${n(t.created_at)})`;
  }
  console.log(`✓ Tasks: ${tasks.length}`);

  // Notes
  for (const note of notes) {
    await sql`INSERT INTO notes (id,body,contact_id,deal_id,created_at)
              VALUES (${note._id},${note.body},${n(note.contact_id)},${n(note.deal_id)},${n(note.created_at)})`;
  }
  console.log(`✓ Notes: ${notes.length}`);

  console.log('\n🎉 Migracija završena! Svi podaci su u Neon bazi.');
}

run().catch(e => { console.error('GREŠKA:', e.message); process.exit(1); });
