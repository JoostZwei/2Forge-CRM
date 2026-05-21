import { useEffect, useState } from 'react';
import { api } from '../api.js';

// ── localStorage persistence for pipeline task done-state ─────────────────────
const LS_PIPE_DONE = 'crm_pipe_tasks_done';
function loadPipeDone() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_PIPE_DONE)) || []); }
  catch { return new Set(); }
}
function savePipeDone(set) {
  localStorage.setItem(LS_PIPE_DONE, JSON.stringify([...set]));
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dmy2iso(s) {
  if (!s) return '';
  const p = s.split('.');
  if (p.length < 3) return '';
  return `${p[2].trim()}-${p[1].trim().padStart(2,'0')}-${p[0].trim().padStart(2,'0')}`;
}
function fmtDate(s) {
  if (!s) return '';
  if (s.includes('-')) {
    const [y,m,d] = s.split('-');
    return `${d}.${m}.${y}`;
  }
  return s;
}
function isOverdue(iso) {
  if (!iso) return false;
  return iso < new Date().toISOString().slice(0, 10);
}

// ── Pipeline status labels & colors ──────────────────────────────────────────
const SC = {
  'Novi upit':'#3B82F6','Cekamo odgovor klijenta':'#F59E0B','Upitnik poslan':'#6366F1',
  'Upitnik vracen':'#06B6D4','Ponuda poslana':'#8B5CF6','Sastanak dogovoren':'#84CC16',
  'Sastanak odrzan':'#22C55E','Pregovori':'#F97316','Izgubljeno':'#EF4444','Diskvalificiran':'#64748B',
};
const SL = {
  'Novi upit':'Novi upit','Cekamo odgovor klijenta':'Čekamo odgovor klijenta',
  'Upitnik poslan':'Upitnik poslan','Upitnik vracen':'Upitnik vraćen',
  'Ponuda poslana':'Ponuda poslana','Sastanak dogovoren':'Sastanak dogovoren',
  'Sastanak odrzan':'Sastanak održan','Pregovori':'Pregovori',
  'Izgubljeno':'Izgubljeno','Diskvalificiran':'Diskvalificiran',
};

// ── Add/Edit task modal ───────────────────────────────────────────────────────
function TaskModal({ task, contacts, deals, onSave, onClose }) {
  const [form, setForm] = useState(
    task?.id ? task : { title: '', description: '', due_date: '', contact_id: '', deal_id: '' }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (task?.id) await api.updateTask(task.id, form);
    else await api.createTask(form);
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{task?.id ? 'Uredi zadatak' : 'Novi zadatak'}</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Naslov *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Opis</label>
            <textarea rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Rok</label>
              <input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Kontakt</label>
              <select value={form.contact_id || ''} onChange={e => set('contact_id', e.target.value)}>
                <option value="">—</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Deal</label>
            <select value={form.deal_id || ''} onChange={e => set('deal_id', e.target.value)}>
              <option value="">—</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.tvrtka || d.ime_kontakta || d.title}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Odustani</button>
            <button type="submit" className="btn btn-primary">Spremi</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Tasks component ──────────────────────────────────────────────────────
export default function Tasks() {
  const [tasks,    setTasks]    = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals,    setDeals]    = useState([]);
  const [modal,    setModal]    = useState(null);
  const [filter,   setFilter]   = useState('open');
  const [pipeDone, setPipeDone] = useState(loadPipeDone);

  const load = () =>
    Promise.all([api.getTasks(), api.getContacts(), api.getDeals()])
      .then(([t, c, d]) => { setTasks(t); setContacts(c); setDeals(d); });

  useEffect(() => { load(); }, []);

  const toggleManual = async (task) => {
    await api.toggleTask(task.id, !task.done);
    load();
  };
  const togglePipe = (dealId) => {
    setPipeDone(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId); else next.add(dealId);
      savePipeDone(next);
      return next;
    });
  };
  const delManual = async (id) => {
    if (window.confirm('Obrisati zadatak?')) { await api.deleteTask(id); load(); }
  };

  // Build pipeline tasks from deals with slj_korak filled in
  const pipeTasks = deals
    .filter(d => d.slj_korak && d.slj_korak.trim())
    .map(d => ({
      id:          'pipe_' + d.id,
      dealId:      d.id,
      source:      'pipeline',
      title:       d.slj_korak,
      context:     d.tvrtka || d.ime_kontakta || '—',
      stage:       d.stage,
      vlasnik:     d.vlasnik,
      due_date:    dmy2iso(d.datum_slj_koraka),
      due_display: d.datum_slj_koraka || '',
      done:        pipeDone.has(d.id),
    }))
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  const manualTasks = tasks.map(t => ({ ...t, source: 'manual' }));

  // Merge: pipeline tasks first (sorted by date), then manual tasks
  const allItems = [...pipeTasks, ...manualTasks];

  const filtered = allItems.filter(t => {
    if (filter === 'open') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const openCount = allItems.filter(t => !t.done).length;
  const doneCount = allItems.filter(t =>  t.done).length;

  return (
    <div>
      <style>{`
        .filter-tabs{display:flex;gap:4px;background:#F1F5F9;border-radius:10px;padding:4px;margin-bottom:20px;width:fit-content}
        .filter-tab{padding:7px 16px;border-radius:7px;font-size:13px;font-weight:500;border:none;background:none;color:#64748B;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:7px}
        .filter-tab.active{background:#fff;color:#0F172A;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.1)}
        .count-pip{background:#E2E8F0;color:#475569;border-radius:99px;padding:1px 8px;font-size:11px;font-weight:700;min-width:20px;text-align:center}
        .filter-tab.active .count-pip{background:#2563EB;color:#fff}
        .src-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;flex-shrink:0}
        .src-pipe{background:#EFF6FF;color:#2563EB}
        .src-manual{background:#F0FDF4;color:#166534}
        .stage-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:middle;flex-shrink:0}
        .t-ctx{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:12px;color:#64748B;margin-top:4px}
        .t-ctx-item{display:flex;align-items:center;gap:4px}
      `}</style>

      <div className="page-header">
        <h1>Zadaci</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Novi zadatak</button>
      </div>

      <div className="filter-tabs">
        {[['open','Otvoreni',openCount],['done','Završeni',doneCount],['all','Svi',allItems.length]].map(([v,l,n]) => (
          <button key={v} className={`filter-tab${filter===v?' active':''}`} onClick={() => setFilter(v)}>
            {l}<span className="count-pip">{n}</span>
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{filter === 'done' ? '🎉' : '✓'}</div>
            {filter === 'open' ? 'Nema otvorenih zadataka.' : filter === 'done' ? 'Nema završenih zadataka.' : 'Nema zadataka.'}
          </div>
        ) : filtered.map(t => (
          <div key={t.id} className={`task-item${t.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              className="task-checkbox"
              checked={!!t.done}
              onChange={() => t.source === 'pipeline' ? togglePipe(t.dealId) : toggleManual(t)}
            />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span className={`src-pill ${t.source === 'pipeline' ? 'src-pipe' : 'src-manual'}`}>
                  {t.source === 'pipeline' ? 'Pipeline' : 'Zadatak'}
                </span>
                <span className="task-title">{t.title}</span>
              </div>

              {t.source === 'pipeline' && (
                <div className="t-ctx">
                  <span className="t-ctx-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    {t.context}
                  </span>
                  {t.stage && (
                    <span className="t-ctx-item">
                      <span className="stage-dot" style={{ background: SC[t.stage] || '#94A3B8' }} />
                      {SL[t.stage] || t.stage}
                    </span>
                  )}
                  {t.vlasnik && (
                    <span className="t-ctx-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t.vlasnik}
                    </span>
                  )}
                </div>
              )}

              {t.source === 'manual' && t.description && (
                <div className="task-meta">{t.description}</div>
              )}

              <div className="task-meta" style={{ marginTop:4, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                {(t.due_date || t.due_display) && (
                  <span className={(isOverdue(t.due_date) && !t.done) ? 'task-due-overdue' : ''}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3,verticalAlign:'middle'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {t.source === 'pipeline'
                      ? (t.due_display || fmtDate(t.due_date))
                      : fmtDate(t.due_date)}
                  </span>
                )}
                {t.source === 'manual' && t.contact_name && (
                  <span>👤 {t.contact_name}</span>
                )}
              </div>
            </div>

            {t.source === 'manual' && (
              <div className="action-row" style={{ flexShrink:0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal(t)}>Uredi</button>
                <button className="btn btn-danger btn-sm" onClick={() => delManual(t.id)}>Briši</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal !== null && (
        <TaskModal
          task={modal}
          contacts={contacts}
          deals={deals}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
