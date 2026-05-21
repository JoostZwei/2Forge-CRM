const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// helpers
const now = () => new Date().toISOString();
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// join company name onto docs that have company_id
async function withCompany(docs) {
  const companies = await db.companies.findAsync({});
  const map = Object.fromEntries(companies.map(c => [c._id, c.name]));
  return docs.map(d => ({ ...d, id: d._id, company_name: map[d.company_id] || null }));
}

async function withContact(docs) {
  const contacts = await db.contacts.findAsync({});
  const map = Object.fromEntries(contacts.map(c => [c._id, `${c.first_name} ${c.last_name}`]));
  return docs.map(d => ({ ...d, id: d._id, contact_name: map[d.contact_id] || null }));
}

// --- COMPANIES ---
app.get('/api/companies', async (req, res) => {
  const rows = await db.companies.findAsync({}).sort({ name: 1 });
  res.json(rows.map(r => ({ ...r, id: r._id })));
});

app.post('/api/companies', async (req, res) => {
  const { name, industry, website, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const doc = await db.companies.insertAsync({ name, industry, website, phone, address, created_at: now() });
  res.json({ id: doc._id });
});

app.put('/api/companies/:id', async (req, res) => {
  const { name, industry, website, phone, address } = req.body;
  await db.companies.updateAsync({ _id: req.params.id }, { $set: { name, industry, website, phone, address } });
  res.json({ ok: true });
});

app.delete('/api/companies/:id', async (req, res) => {
  await db.companies.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

// --- CONTACTS ---
app.get('/api/contacts', async (req, res) => {
  const rows = await db.contacts.findAsync({}).sort({ last_name: 1, first_name: 1 });
  res.json(await withCompany(rows));
});

app.post('/api/contacts', async (req, res) => {
  const { first_name, last_name, email, phone, position, company_id } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'Name required' });
  const doc = await db.contacts.insertAsync({ first_name, last_name, email, phone, position, company_id: company_id || null, created_at: now() });
  res.json({ id: doc._id });
});

app.put('/api/contacts/:id', async (req, res) => {
  const { first_name, last_name, email, phone, position, company_id } = req.body;
  await db.contacts.updateAsync({ _id: req.params.id }, { $set: { first_name, last_name, email, phone, position, company_id: company_id || null } });
  res.json({ ok: true });
});

app.delete('/api/contacts/:id', async (req, res) => {
  await db.contacts.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

// --- DEALS ---
app.get('/api/deals', async (req, res) => {
  const rows = await db.deals.findAsync({}).sort({ created_at: -1 });
  const withC = await withContact(rows);
  const withCo = await withCompany(withC);
  res.json(withCo);
});

app.post('/api/deals', async (req, res) => {
  const body = req.body;
  if (!body.title) return res.status(400).json({ error: 'Title required' });
  const payload = { ...body, value: parseFloat(body.value) || 0, stage: body.stage || 'lead', created_at: now() };
  delete payload._id;
  const doc = await db.deals.insertAsync(payload);
  res.json({ id: doc._id });
});

app.put('/api/deals/:id', async (req, res) => {
  const body = { ...req.body };
  if (body.value !== undefined) body.value = parseFloat(body.value) || 0;
  delete body._id;
  await db.deals.updateAsync({ _id: req.params.id }, { $set: body });
  res.json({ ok: true });
});

app.patch('/api/deals/:id/stage', async (req, res) => {
  await db.deals.updateAsync({ _id: req.params.id }, { $set: { stage: req.body.stage } });
  res.json({ ok: true });
});

app.delete('/api/deals/:id', async (req, res) => {
  await db.deals.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

// --- TASKS ---
app.get('/api/tasks', async (req, res) => {
  const rows = await db.tasks.findAsync({}).sort({ done: 1, due_date: 1, created_at: -1 });
  res.json(await withContact(rows));
});

app.post('/api/tasks', async (req, res) => {
  const { title, description, due_date, contact_id, deal_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const doc = await db.tasks.insertAsync({ title, description, due_date: due_date || null, done: false, contact_id: contact_id || null, deal_id: deal_id || null, created_at: now() });
  res.json({ id: doc._id });
});

app.put('/api/tasks/:id', async (req, res) => {
  const { title, description, due_date, contact_id, deal_id } = req.body;
  await db.tasks.updateAsync({ _id: req.params.id }, { $set: { title, description, due_date: due_date || null, contact_id: contact_id || null, deal_id: deal_id || null } });
  res.json({ ok: true });
});

app.patch('/api/tasks/:id/done', async (req, res) => {
  await db.tasks.updateAsync({ _id: req.params.id }, { $set: { done: !!req.body.done } });
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', async (req, res) => {
  await db.tasks.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

// --- NOTES ---
app.get('/api/notes', async (req, res) => {
  const query = {};
  if (req.query.contact_id) query.contact_id = req.query.contact_id;
  if (req.query.deal_id) query.deal_id = req.query.deal_id;
  const rows = await db.notes.findAsync(query).sort({ created_at: -1 });
  res.json(rows.map(r => ({ ...r, id: r._id })));
});

app.post('/api/notes', async (req, res) => {
  const { body, contact_id, deal_id } = req.body;
  if (!body) return res.status(400).json({ error: 'Body required' });
  const doc = await db.notes.insertAsync({ body, contact_id: contact_id || null, deal_id: deal_id || null, created_at: now() });
  res.json({ id: doc._id });
});

app.delete('/api/notes/:id', async (req, res) => {
  await db.notes.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

// --- STATS ---
app.get('/api/stats', async (req, res) => {
  const [contacts, companies, deals, tasks] = await Promise.all([
    db.contacts.countAsync({}),
    db.companies.countAsync({}),
    db.deals.findAsync({}),
    db.tasks.countAsync({ done: false }),
  ]);
  const openDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length;
  const pipelineValue = deals.filter(d => d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0);
  res.json({ contacts, companies, openDeals, pipelineValue, pendingTasks: tasks });
});

// Serve React build (production) ─────────────────────────────────────────────
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, '0.0.0.0', () => console.log(`CRM server: http://0.0.0.0:${PORT}`));
