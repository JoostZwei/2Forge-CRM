const express = require('express');
const cors    = require('cors');
const { sql } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const now   = () => new Date().toISOString();
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const n     = v => (v === undefined || v === '') ? null : v;   // null coerce
const b     = v => !!v;                                         // boolean coerce

// Stages koji podrazumijevaju da je ponuda vec izasla van tvrtke
const OFFER_STAGES = new Set([
  'Ponuda poslana', 'Sastanak dogovoren', 'Sastanak odrzan',
  'Pregovori', 'Ugovor potpisan', 'Dobiveno',
]);
// Stages koji se racunaju kao zatvoreni (ne ulaze u otvoreni pipeline)
const CLOSED_STAGES = new Set(['Izgubljeno', 'Diskvalificiran', 'Ugovor potpisan', 'Dobiveno']);

function requiresOib(d) {
  return b(d.ponuda_poslana) || OFFER_STAGES.has(d.stage);
}

// ── join helpers ──────────────────────────────────────────────────────────────
async function withCompany(rows) {
  if (!rows.length) return rows;
  const cos = await sql`SELECT id, name FROM companies`;
  const map = Object.fromEntries(cos.map(c => [c.id, c.name]));
  return rows.map(r => ({ ...r, company_name: map[r.company_id] || null }));
}
async function withContact(rows) {
  if (!rows.length) return rows;
  const cts = await sql`SELECT id, first_name, last_name FROM contacts`;
  const map = Object.fromEntries(cts.map(c => [c.id, `${c.first_name} ${c.last_name}`]));
  return rows.map(r => ({ ...r, contact_name: map[r.contact_id] || null }));
}

// ── COMPANIES ─────────────────────────────────────────────────────────────────
app.get('/api/companies', async (req, res) => {
  try {
    res.json(await sql`SELECT * FROM companies ORDER BY name ASC`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, industry, website, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = newId();
    await sql`INSERT INTO companies (id,name,industry,website,phone,address,created_at)
              VALUES (${id},${name},${n(industry)},${n(website)},${n(phone)},${n(address)},${now()})`;
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/companies/:id', async (req, res) => {
  try {
    const { name, industry, website, phone, address } = req.body;
    await sql`UPDATE companies SET name=${name},industry=${n(industry)},website=${n(website)},
              phone=${n(phone)},address=${n(address)} WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    await sql`DELETE FROM companies WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CONTACTS ──────────────────────────────────────────────────────────────────
app.get('/api/contacts', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM contacts ORDER BY last_name ASC, first_name ASC`;
    res.json(await withCompany(rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, position, company_id } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ error: 'Name required' });
    const id = newId();
    await sql`INSERT INTO contacts (id,first_name,last_name,email,phone,position,company_id,created_at)
              VALUES (${id},${first_name},${last_name},${n(email)},${n(phone)},${n(position)},${n(company_id)},${now()})`;
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, position, company_id } = req.body;
    await sql`UPDATE contacts SET first_name=${first_name},last_name=${last_name},
              email=${n(email)},phone=${n(phone)},position=${n(position)},company_id=${n(company_id)}
              WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await sql`DELETE FROM contacts WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DEALS ─────────────────────────────────────────────────────────────────────
app.get('/api/deals', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM deals ORDER BY created_at ASC`;
    res.json(await withCompany(await withContact(rows)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/deals', async (req, res) => {
  try {
    const d = req.body;
    if (!d.title) return res.status(400).json({ error: 'Title required' });
    if (requiresOib(d) && !n(d.oib)) {
      return res.status(400).json({ error: 'OIB je obavezan prije nego ponuda izađe iz tvrtke.' });
    }
    const id = newId();
    await sql`INSERT INTO deals
      (id,title,stage,value,contact_id,company_id,
       datum_upita,tvrtka,ime_kontakta,email,telefon,
       izvor_leada,tip_usluge,vlasnik,
       upitnik_poslan,datum_upitnika,upitnik_vracen,datum_vracanja,
       ponuda_poslana,datum_ponude,datum_sastanka,
       slj_korak,datum_slj_koraka,proc_volumen,
       razlog_gubitka,komentar,prospekt_id,created_at,
       vrijednost_jednokratno,tip_posla,oib,pravni_subjekt,
       datum_zadnje_komunikacije,smjer_zadnje_komunikacije,na_potezu,valjanost_ponude)
      VALUES
      (${id},${n(d.title)},${n(d.stage)||'lead'},${parseFloat(d.value)||0},${n(d.contact_id)},${n(d.company_id)},
       ${n(d.datum_upita)},${n(d.tvrtka)},${n(d.ime_kontakta)},${n(d.email)},${n(d.telefon)},
       ${n(d.izvor_leada)},${n(d.tip_usluge)},${n(d.vlasnik)},
       ${b(d.upitnik_poslan)},${n(d.datum_upitnika)},${b(d.upitnik_vracen)},${n(d.datum_vracanja)},
       ${b(d.ponuda_poslana)},${n(d.datum_ponude)},${n(d.datum_sastanka)},
       ${n(d.slj_korak)},${n(d.datum_slj_koraka)},${n(d.proc_volumen)},
       ${n(d.razlog_gubitka)},${n(d.komentar)},${n(d.prospekt_id)},${now()},
       ${parseFloat(d.vrijednost_jednokratno)||0},${n(d.tip_posla)||'recurring'},${n(d.oib)},${n(d.pravni_subjekt)},
       ${n(d.datum_zadnje_komunikacije)},${n(d.smjer_zadnje_komunikacije)},${n(d.na_potezu)},${n(d.valjanost_ponude)})`;
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/deals/:id', async (req, res) => {
  try {
    const d = req.body;
    if (requiresOib(d) && !n(d.oib)) {
      return res.status(400).json({ error: 'OIB je obavezan prije nego ponuda izađe iz tvrtke.' });
    }
    await sql`UPDATE deals SET
      title=${n(d.title)},stage=${n(d.stage)},value=${parseFloat(d.value)||0},
      contact_id=${n(d.contact_id)},company_id=${n(d.company_id)},
      datum_upita=${n(d.datum_upita)},tvrtka=${n(d.tvrtka)},ime_kontakta=${n(d.ime_kontakta)},
      email=${n(d.email)},telefon=${n(d.telefon)},izvor_leada=${n(d.izvor_leada)},
      tip_usluge=${n(d.tip_usluge)},vlasnik=${n(d.vlasnik)},
      upitnik_poslan=${b(d.upitnik_poslan)},datum_upitnika=${n(d.datum_upitnika)},
      upitnik_vracen=${b(d.upitnik_vracen)},datum_vracanja=${n(d.datum_vracanja)},
      ponuda_poslana=${b(d.ponuda_poslana)},datum_ponude=${n(d.datum_ponude)},
      datum_sastanka=${n(d.datum_sastanka)},slj_korak=${n(d.slj_korak)},
      datum_slj_koraka=${n(d.datum_slj_koraka)},proc_volumen=${n(d.proc_volumen)},
      razlog_gubitka=${n(d.razlog_gubitka)},komentar=${n(d.komentar)},
      vrijednost_jednokratno=${parseFloat(d.vrijednost_jednokratno)||0},tip_posla=${n(d.tip_posla)||'recurring'},
      oib=${n(d.oib)},pravni_subjekt=${n(d.pravni_subjekt)},
      datum_zadnje_komunikacije=${n(d.datum_zadnje_komunikacije)},smjer_zadnje_komunikacije=${n(d.smjer_zadnje_komunikacije)},
      na_potezu=${n(d.na_potezu)},valjanost_ponude=${n(d.valjanost_ponude)}
      WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/deals/:id/stage', async (req, res) => {
  try {
    const newStage = req.body.stage;
    if (OFFER_STAGES.has(newStage)) {
      const [deal] = await sql`SELECT oib FROM deals WHERE id=${req.params.id}`;
      if (!deal || !n(deal.oib)) {
        return res.status(400).json({ error: 'OIB je obavezan prije nego ponuda izađe iz tvrtke.' });
      }
    }
    await sql`UPDATE deals SET stage=${newStage} WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    await sql`DELETE FROM deals WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TASKS ─────────────────────────────────────────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM tasks ORDER BY done ASC, due_date ASC, created_at DESC`;
    res.json(await withContact(rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, due_date, contact_id, deal_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const id = newId();
    await sql`INSERT INTO tasks (id,title,description,due_date,done,contact_id,deal_id,created_at)
              VALUES (${id},${title},${n(description)},${n(due_date)},false,${n(contact_id)},${n(deal_id)},${now()})`;
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { title, description, due_date, contact_id, deal_id } = req.body;
    await sql`UPDATE tasks SET title=${title},description=${n(description)},due_date=${n(due_date)},
              contact_id=${n(contact_id)},deal_id=${n(deal_id)} WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tasks/:id/done', async (req, res) => {
  try {
    await sql`UPDATE tasks SET done=${!!req.body.done} WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await sql`DELETE FROM tasks WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── NOTES ─────────────────────────────────────────────────────────────────────
app.get('/api/notes', async (req, res) => {
  try {
    const query = {};
    let rows;
    if (req.query.contact_id) {
      rows = await sql`SELECT * FROM notes WHERE contact_id=${req.query.contact_id} ORDER BY created_at DESC`;
    } else if (req.query.deal_id) {
      rows = await sql`SELECT * FROM notes WHERE deal_id=${req.query.deal_id} ORDER BY created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM notes ORDER BY created_at DESC`;
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { body, contact_id, deal_id } = req.body;
    if (!body) return res.status(400).json({ error: 'Body required' });
    const id = newId();
    await sql`INSERT INTO notes (id,body,contact_id,deal_id,created_at)
              VALUES (${id},${body},${n(contact_id)},${n(deal_id)},${now()})`;
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await sql`DELETE FROM notes WHERE id=${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [contacts, companies, deals, tasks] = await Promise.all([
      sql`SELECT COUNT(*) FROM contacts`,
      sql`SELECT COUNT(*) FROM companies`,
      sql`SELECT id, stage, value, vrijednost_jednokratno FROM deals`,
      sql`SELECT COUNT(*) FROM tasks WHERE done = false`,
    ]);
    const openDealRows   = deals.filter(d => !CLOSED_STAGES.has(d.stage));
    const openDeals      = openDealRows.length;
    const pipelineValue  = openDealRows.reduce((s,d) =>
      s + (parseFloat(d.value)||0) + (parseFloat(d.vrijednost_jednokratno)||0), 0);
    res.json({
      contacts:      parseInt(contacts[0].count),
      companies:     parseInt(companies[0].count),
      openDeals,
      pipelineValue,
      pendingTasks:  parseInt(tasks[0].count),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;
