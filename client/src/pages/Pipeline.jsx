import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const SC = {
  'Novi upit':               { bg:'#EFF6FF', cl:'#1D4ED8', dt:'#3B82F6' },
  'Cekamo odgovor klijenta': { bg:'#FFFBEB', cl:'#B45309', dt:'#F59E0B' },
  'Upitnik poslan':          { bg:'#EEF2FF', cl:'#3730A3', dt:'#6366F1' },
  'Upitnik vracen':          { bg:'#ECFEFF', cl:'#155E75', dt:'#06B6D4' },
  'Ponuda poslana':          { bg:'#F5F3FF', cl:'#5B21B6', dt:'#8B5CF6' },
  'Sastanak dogovoren':      { bg:'#F7FEE7', cl:'#3F6212', dt:'#84CC16' },
  'Sastanak odrzan':         { bg:'#F0FDF4', cl:'#14532D', dt:'#22C55E' },
  'Pregovori':               { bg:'#FFF7ED', cl:'#9A3412', dt:'#F97316' },
  'Izgubljeno':              { bg:'#FEF2F2', cl:'#7F1D1D', dt:'#EF4444' },
  'Diskvalificiran':         { bg:'#F8FAFC', cl:'#334155', dt:'#64748B' },
};
const SL = {
  'Novi upit':               'Novi upit',
  'Cekamo odgovor klijenta': 'Čekamo odgovor klijenta',
  'Upitnik poslan':          'Upitnik poslan',
  'Upitnik vracen':          'Upitnik vraćen',
  'Ponuda poslana':          'Ponuda poslana',
  'Sastanak dogovoren':      'Sastanak dogovoren',
  'Sastanak odrzan':         'Sastanak održan',
  'Pregovori':               'Pregovori',
  'Izgubljeno':              'Izgubljeno',
  'Diskvalificiran':         'Diskvalificiran',
};
const SK = Object.keys(SC);
const IZVOR   = ['Web forma','Hladni poziv','Topli lead','Preporučena','Sajam','Drugo'];
const TIPOVI  = ['fulfilment','MTU','mikro-skladištenje','skladištenje i transport','skladištenje','najam skladišnog prostora','B2B dedicated'];
const VL_DEFAULTS = ['Wanda','Matija'];
const LS_CUSTOM  = 'crm_vlasnici_custom';
const LS_DELETED = 'crm_vlasnici_deleted';

function loadVlasnici() {
  try {
    const custom  = JSON.parse(localStorage.getItem(LS_CUSTOM))  || [];
    const deleted = JSON.parse(localStorage.getItem(LS_DELETED)) || [];
    return { custom, deleted };
  } catch { return { custom: [], deleted: [] }; }
}
function getVlasnici(custom, deleted) {
  return [...VL_DEFAULTS, ...custom].filter(v => !deleted.includes(v));
}
const RAZLOZI = ['Ne pružamo uslugu','Nema kapaciteta','Klijent nije odgovorio','Cijena','Konkurencija','Drugo'];

function sc(k) { return SC[k] || { bg:'#F1F5F9', cl:'#475569', dt:'#94A3B8' }; }
function sl(k) { return SL[k] || k; }

function toInputDate(s) {
  if (!s) return '';
  const p = s.split('.');
  if (p.length !== 3) return '';
  return `${p[2].trim()}-${p[1].trim().padStart(2,'0')}-${p[0].trim().padStart(2,'0')}`;
}
function fromInputDate(s) {
  if (!s) return '';
  const p = s.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : '';
}
function dsort(s, fallback = 0) {
  if (!s) return fallback;
  const p = s.split('.');
  return p.length < 3 ? fallback : parseInt(p[2])*10000 + parseInt(p[1])*100 + parseInt(p[0]);
}

// ── Status badge with inline dropdown ────────────────────────────────────────
function StatusBadge({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const c = sc(status);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <div className="sbadge" style={{ background:c.bg, color:c.cl }}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
        <span className="sdot" style={{ background:c.dt }} />
        {sl(status)}
      </div>
      {open && (
        <div style={{ position:'fixed', background:'#fff', border:'1px solid #E2E8F0', borderRadius:10,
          boxShadow:'0 8px 24px rgba(15,23,42,.12)', zIndex:200, padding:5, minWidth:210 }}
          onClick={e => e.stopPropagation()}>
          {SK.map(k => (
            <div key={k} className="sdi"
              onClick={() => { onChange(k); setOpen(false); }}>
              <span className="sdi-dot" style={{ background:sc(k).dt }} />
              {sl(k)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Date field (display input + hidden date input) ────────────────────────────
function DateField({ label, value, onChange }) {
  const hidId = useRef('df_' + Math.random().toString(36).slice(2));
  const [disp, setDisp] = useState(value || '');
  useEffect(() => { setDisp(value || ''); }, [value]);
  return (
    <div className="fg">
      {label && <div className="flabel">{label}</div>}
      <div style={{ position:'relative' }}>
        <input className="finput" value={disp} readOnly placeholder="DD.MM.YYYY"
          style={{ cursor:'pointer', background:'#fff' }}
          onClick={() => { const el = document.getElementById(hidId.current); if (el?.showPicker) el.showPicker(); }} />
        <input type="date" id={hidId.current} value={toInputDate(disp)}
          onChange={e => { const d = fromInputDate(e.target.value); setDisp(d); onChange(d); }}
          style={{ position:'absolute', width:0, height:0, opacity:0, pointerEvents:'none' }} />
      </div>
    </div>
  );
}

// ── Vlasnik custom dropdown ───────────────────────────────────────────────────
function VlasnikDropdown({ value, onChange, vlasnici, onAdd, onDelete }) {
  const [open, setOpen]       = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [pos, setPos]         = useState({ top:0, left:0, width:0 });
  const btnRef  = useRef();
  const dropRef = useRef();
  const newRef  = useRef();

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const openDrop = () => {
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(o => !o);
    setShowNew(false);
    setNewName('');
  };

  const select = (v) => { onChange(v); setOpen(false); setShowNew(false); setNewName(''); };

  const confirmNew = () => {
    const n = newName.trim();
    if (n) { onAdd(n); select(n); }
    else   { setShowNew(false); setNewName(''); }
  };

  return (
    <div className="fg">
      <div className="flabel">Vlasnik</div>
      <div>
        <div ref={btnRef} className={'vl-btn' + (open ? ' open' : '')} onClick={openDrop}>
          <span className={'vl-lbl' + (value ? '' : ' ph')}>{value || '— odaberi —'}</span>
          <span className="vl-caret">▾</span>
        </div>
        {showNew && (
          <input ref={newRef} className="finput" autoFocus placeholder="Upiši ime vlasnika…"
            style={{ marginTop:6 }} value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNew(); } if (e.key === 'Escape') { setShowNew(false); setNewName(''); } }}
            onBlur={confirmNew} />
        )}
      </div>
      {open && (
        <div ref={dropRef} style={{ position:'fixed', background:'#fff', border:'1px solid #E2E8F0',
          borderRadius:8, boxShadow:'0 8px 24px rgba(15,23,42,.12)', zIndex:1500, overflow:'hidden',
          top: pos.top, left: pos.left, width: pos.width }}>
          {vlasnici.map(v => (
            <div key={v} className={'vl-item' + (v === value ? ' sel' : '')} onClick={() => select(v)}>
              <span className="vl-name">{v}</span>
              <button className="vl-del" onClick={e => { e.stopPropagation(); onDelete(v); if (value === v) onChange(''); }}>✕</button>
            </div>
          ))}
          <div className="vl-new" onClick={() => { setOpen(false); setShowNew(true); setTimeout(() => newRef.current?.focus(), 50); }}>
            + Novi vlasnik…
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const EMPTY = {
  datum_upita:'', tvrtka:'', ime_kontakta:'', email:'', telefon:'',
  izvor_leada:'', tip_usluge:'', stage:'Novi upit', vlasnik:'',
  upitnik_poslan:false, datum_upitnika:'', upitnik_vracen:false, datum_vracanja:'',
  ponuda_poslana:false, datum_ponude:'', datum_sastanka:'',
  slj_korak:'', datum_slj_koraka:'', proc_volumen:'', value:'',
  razlog_gubitka:'', komentar:'',
};

function Modal({ deal, onSave, onClose, onDelete, vlasnici, onAddVlasnik, onDeleteVlasnik }) {
  const isNew = !deal?.id;
  const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; };
  const [f, setF] = useState(isNew ? { ...EMPTY, datum_upita: today() } : { ...EMPTY, ...deal, value: deal.value || '' });
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const showRazlog = f.stage === 'Izgubljeno' || f.stage === 'Diskvalificiran';

  const submit = async (e) => {
    e.preventDefault();
    if (!f.stage) return;
    const payload = { ...f, value: parseFloat(f.value) || 0,
      title: f.tvrtka || f.ime_kontakta || 'Novi unos' };
    if (isNew) await api.createDeal(payload);
    else await api.updateDeal(deal.id, payload);
    onSave();
  };

  return (
    <div className="mo open" onClick={onClose}>
      <div className="modal" style={{ maxWidth:700 }} onClick={e => e.stopPropagation()}>
        <div className="mhdr">
          <div className="mtitle">{isNew ? 'Novi unos' : `Uredi unos #${deal.prospekt_id || deal.id}`}</div>
          <button className="mclose" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="mbody">

            {/* Osnovno */}
            <div className="fsec">
              <div className="fsec-t">Osnovno</div>
              <div className="frow c3">
                <DateField label="Datum upita" value={f.datum_upita} onChange={v => set('datum_upita', v)} />
                <div className="fg">
                  <div className="flabel">Izvor leada</div>
                  <select className="fselect" value={f.izvor_leada} onChange={e => set('izvor_leada', e.target.value)}>
                    <option value="">— odaberi —</option>
                    {IZVOR.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <div className="flabel">Tip usluge <span style={{ color:'#EF4444', marginLeft:2 }}>*</span></div>
                  <select className="fselect" required value={f.tip_usluge} onChange={e => set('tip_usluge', e.target.value)}>
                    <option value="">— odaberi —</option>
                    {TIPOVI.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="frow c2">
                <div className="fg">
                  <div className="flabel">Tvrtka</div>
                  <input className="finput" placeholder="Naziv tvrtke" value={f.tvrtka} onChange={e => set('tvrtka', e.target.value)} />
                </div>
                <div className="fg">
                  <div className="flabel">Ime kontakta</div>
                  <input className="finput" placeholder="Ime i prezime" value={f.ime_kontakta} onChange={e => set('ime_kontakta', e.target.value)} />
                </div>
              </div>
              <div className="frow c2">
                <div className="fg">
                  <div className="flabel">E-mail</div>
                  <input className="finput" type="email" placeholder="email@domena.com" value={f.email || ''} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="fg">
                  <div className="flabel">Telefon</div>
                  <input className="finput" placeholder="+385..." value={f.telefon || ''} onChange={e => set('telefon', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Status i vlasnik */}
            <div className="fsec">
              <div className="fsec-t">Status i vlasnik</div>
              <div className="frow c2">
                <div className="fg">
                  <div className="flabel">Status <span style={{ color:'#EF4444', marginLeft:2 }}>*</span></div>
                  <select className="fselect" required value={f.stage} onChange={e => set('stage', e.target.value)}>
                    {SK.map(k => <option key={k} value={k}>{sl(k)}</option>)}
                  </select>
                </div>
                <VlasnikDropdown
                  value={f.vlasnik}
                  onChange={v => set('vlasnik', v)}
                  vlasnici={vlasnici}
                  onAdd={onAddVlasnik}
                  onDelete={onDeleteVlasnik}
                />
              </div>
            </div>

            {/* Proces */}
            <div className="fsec">
              <div className="fsec-t">Proces</div>
              <div className="frow c2">
                <div className="fg">
                  <label className="fchk">
                    <input type="checkbox" checked={!!f.upitnik_poslan} onChange={e => set('upitnik_poslan', e.target.checked)} />
                    <span>Upitnik poslan</span>
                  </label>
                </div>
                <DateField label="Datum slanja upitnika" value={f.datum_upitnika} onChange={v => set('datum_upitnika', v)} />
              </div>
              <div className="frow c2">
                <div className="fg">
                  <label className="fchk">
                    <input type="checkbox" checked={!!f.upitnik_vracen} onChange={e => set('upitnik_vracen', e.target.checked)} />
                    <span>Upitnik vraćen</span>
                  </label>
                </div>
                <DateField label="Datum vraćanja" value={f.datum_vracanja} onChange={v => set('datum_vracanja', v)} />
              </div>
              <div className="frow c2">
                <div className="fg">
                  <label className="fchk">
                    <input type="checkbox" checked={!!f.ponuda_poslana} onChange={e => set('ponuda_poslana', e.target.checked)} />
                    <span>Ponuda poslana</span>
                  </label>
                </div>
                <DateField label="Datum slanja ponude" value={f.datum_ponude} onChange={v => set('datum_ponude', v)} />
              </div>
              <div className="frow c2">
                <DateField label="Datum sastanka" value={f.datum_sastanka} onChange={v => set('datum_sastanka', v)} />
                <DateField label="Datum sljedećeg koraka" value={f.datum_slj_koraka} onChange={v => set('datum_slj_koraka', v)} />
              </div>
              <div className="frow">
                <div className="fg">
                  <div className="flabel">Sljedeći korak</div>
                  <textarea className="ftarea" rows={2} value={f.slj_korak || ''} onChange={e => set('slj_korak', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Financije */}
            <div className="fsec">
              <div className="fsec-t">Financije</div>
              <div className="frow c2">
                <div className="fg">
                  <div className="flabel">Proc. mj. volumen (paketa)</div>
                  <input className="finput" type="number" min="0" placeholder="0" value={f.proc_volumen || ''} onChange={e => set('proc_volumen', e.target.value)} />
                </div>
                <div className="fg">
                  <div className="flabel">Proc. vrijednost (EUR/mj)</div>
                  <input className="finput" type="number" min="0" placeholder="0" value={f.value} onChange={e => set('value', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Razlog zatvaranja */}
            {showRazlog && (
              <div className="fsec">
                <div className="fsec-t">Razlog zatvaranja</div>
                <div className="frow">
                  <div className="fg">
                    <div className="flabel">Razlog gubitka / diskvalifikacije</div>
                    <select className="fselect" value={f.razlog_gubitka} onChange={e => set('razlog_gubitka', e.target.value)}>
                      <option value="">— odaberi —</option>
                      {RAZLOZI.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Napomene */}
            <div className="fsec">
              <div className="fsec-t">Napomene</div>
              <div className="frow">
                <div className="fg">
                  <div className="flabel">Komentar</div>
                  <textarea className="ftarea" rows={3} value={f.komentar || ''} onChange={e => set('komentar', e.target.value)} style={{ resize:'vertical' }} />
                </div>
              </div>
            </div>

          </div>
          <div className="mftr">
            {!isNew && <button type="button" className="btn-del" onClick={onDelete}>🗑 Obriši</button>}
            <button type="button" className="btn-cancel" onClick={onClose}>Odustani</button>
            <button type="submit" className="btn-save">Spremi</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function Confirm({ text, onYes, onNo }) {
  return (
    <div className="cfm-o open">
      <div className="cfm-box">
        <div className="cfm-ico">⚠️</div>
        <div className="cfm-title">Obriši unos?</div>
        <div className="cfm-text">{text}</div>
        <div className="cfm-acts">
          <button className="btn-cancel" onClick={onNo}>Odustani</button>
          <button className="btn-save" style={{ background:'#EF4444' }} onClick={onYes}>Obriši</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return <div className={'toast show ' + type}>{msg}</div>;
}

// ── Main Pipeline component ───────────────────────────────────────────────────
export default function Pipeline() {
  const [deals, setDeals]   = useState([]);
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast]   = useState(null);
  const [search, setSearch] = useState('');
  const [ownerF, setOwnerF] = useState('');
  const [tipF, setTipF]     = useState('');

  // ── Vlasnici (persisted in localStorage) ──────────────────────────────────
  const [vlCustom,  setVlCustom]  = useState(() => loadVlasnici().custom);
  const [vlDeleted, setVlDeleted] = useState(() => loadVlasnici().deleted);
  const vlasnici = getVlasnici(vlCustom, vlDeleted);

  const addVlasnik = (name) => {
    if (!name || vlasnici.includes(name)) return;
    const next = [...vlCustom, name];
    setVlCustom(next);
    localStorage.setItem(LS_CUSTOM, JSON.stringify(next));
  };
  const deleteVlasnik = (name) => {
    const next = [...vlDeleted, name];
    setVlDeleted(next);
    localStorage.setItem(LS_DELETED, JSON.stringify(next));
    // reset owner filter if it was showing the deleted owner
    if (ownerF === name) setOwnerF('');
  };
  const [spills, setSpills] = useState({});     // { status: true } for active filters
  const [sortKey, setSortKey] = useState('datum_upita');
  const [sortDir, setSortDir] = useState(1);
  const toastRef = useRef();

  const load = () => api.getDeals().then(setDeals);
  useEffect(() => { load(); }, []);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  };

  const handleSave = async () => {
    await load();
    setModal(null);
    showToast(modal?.id ? 'Unos ažuriran' : 'Novi unos dodan');
  };

  const handleDelete = async () => {
    await api.deleteDeal(confirm.id);
    await load();
    setConfirm(null);
    setModal(null);
    showToast('Unos obrisan');
  };

  const handleStatusChange = async (deal, newStage) => {
    await api.updateDealStage(deal.id, newStage);
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: newStage } : d));
    showToast('Status: ' + sl(newStage));
  };

  // Stats
  const active = deals.filter(d => d.stage !== 'Izgubljeno' && d.stage !== 'Diskvalificiran').length;
  const pipeline = deals.filter(d => d.stage !== 'Izgubljeno' && d.stage !== 'Diskvalificiran')
    .reduce((s, d) => s + (parseFloat(d.value) || 0), 0);
  const byS = {};
  deals.forEach(d => { byS[d.stage] = (byS[d.stage] || 0) + 1; });

  // Filters
  const togSpill = (k) => setSpills(prev => {
    const n = { ...prev };
    if (n[k]) delete n[k]; else n[k] = true;
    return n;
  });

  const filtered = deals.filter(d => {
    if (Object.keys(spills).length > 0 && !spills[d.stage]) return false;
    if (ownerF && d.vlasnik !== ownerF) return false;
    if (tipF && d.tip_usluge !== tipF) return false;
    if (search) {
      const hay = ((d.tvrtka||'')+(d.ime_kontakta||'')+(d.email||'')+(d.tip_usluge||'')+(d.stage||'')+(d.komentar||'')).toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
    if (sortKey === 'value' || sortKey === 'proc_volumen') {
      av = parseFloat(av) || 0; bv = parseFloat(bv) || 0;
    } else if (sortKey === 'datum_upita') {
      // empty dates go to the end regardless of sort direction
      av = dsort(av, sortDir === 1 ? 99999999 : -1);
      bv = dsort(bv, sortDir === 1 ? 99999999 : -1);
    } else {
      av = String(av).toLowerCase(); bv = String(bv).toLowerCase();
    }
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  const sortBy = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(1); }
  };
  const thCls = (key) => sortKey === key ? (sortDir === 1 ? 'sa' : 'sd') : '';

  // CSV export
  const exportCSV = () => {
    const hdrs = ['ID','Datum upita','Tvrtka','Ime kontakta','E-mail','Telefon','Izvor leada','Tip usluge','Status','Vlasnik','Upitnik poslan','Datum upitnika','Upitnik vracen','Datum vracanja','Ponuda poslana','Datum ponude','Datum sastanka','Sljedeci korak','Datum slj. koraka','Proc. volumen','Proc. vrijednost EUR/mj','Razlog gubitka','Komentar'];
    const rows = [hdrs.join(',')];
    sorted.forEach((d, i) => {
      const r = [i+1, d.datum_upita, d.tvrtka, d.ime_kontakta, d.email, d.telefon, d.izvor_leada, d.tip_usluge, sl(d.stage), d.vlasnik,
        d.upitnik_poslan ? 'DA' : 'NE', d.datum_upitnika, d.upitnik_vracen ? 'DA' : 'NE', d.datum_vracanja,
        d.ponuda_poslana ? 'DA' : 'NE', d.datum_ponude, d.datum_sastanka, d.slj_korak, d.datum_slj_koraka,
        d.proc_volumen, d.value, d.razlog_gubitka, d.komentar];
      rows.push(r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pipeline_2forge_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV preuzet');
  };

  return (
    <>
      <style>{`
        .sbadge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;cursor:pointer}
        .sbadge:hover{opacity:.85}
        .sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        .sdi{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;transition:background .1s}
        .sdi:hover{background:#F8FAFC}
        .sdi-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .dbadge{display:inline-block;width:18px;height:18px;border-radius:4px;font-size:10px;font-weight:700;line-height:18px;text-align:center}
        .dy{background:#DCFCE7;color:#15803D}
        .dn{background:#F1F5F9;color:#CBD5E1}
        .ochip{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}
        .ow{background:#FAF5FF;color:#7C3AED}
        .om{background:#EFF6FF;color:#1D4ED8}
        .oo{background:#F0FDF4;color:#15803D}
        .abtn{border:none;cursor:pointer;padding:0;border-radius:8px;font-size:17px;transition:all .15s;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0}
        .abtn.edit{background:#ECFDF5;color:#16A34A}
        .abtn.edit:hover{background:#D1FAE5;color:#15803D;transform:scale(1.08)}
        .abtn.del{background:#FEF2F2;color:#DC2626}
        .abtn.del:hover{background:#FEE2E2;color:#B91C1C;transform:scale(1.08)}
        .acts{display:flex;gap:5px;align-items:center}
        .spill{padding:4px 10px;border-radius:20px;font-size:11.5px;font-weight:600;cursor:pointer;border:2px solid transparent;transition:all .15s;white-space:nowrap;user-select:none}
        .spill.on{border-color:currentColor}
        .cnt{background:#EFF6FF;color:#2563EB;font-size:11px;font-weight:700;padding:2px 6px;border-radius:12px;margin-left:5px}
        .fsec{display:flex;flex-direction:column;gap:11px}
        .fsec-t{font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.7px;padding-bottom:6px;border-bottom:2px solid #EFF6FF}
        .frow{display:grid;gap:11px}
        .c2{grid-template-columns:1fr 1fr}
        .c3{grid-template-columns:1fr 1fr 1fr}
        .fg{display:flex;flex-direction:column;gap:4px}
        .flabel{font-size:12px;font-weight:600;color:#475569}
        .finput,.fselect,.ftarea{width:100%;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;color:#0F172A;outline:none;font-family:inherit;background:#F8FAFC;transition:border-color .15s}
        .finput:focus,.fselect:focus,.ftarea:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1);background:#fff}
        .ftarea{resize:vertical;min-height:68px;line-height:1.5}
        .fchk{display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;cursor:pointer;background:#F8FAFC;transition:all .15s}
        .fchk:hover{background:#fff;border-color:#CBD5E1}
        .fchk input{width:15px;height:15px;cursor:pointer;accent-color:#2563EB}
        .fchk span{font-size:14px;cursor:pointer;user-select:none}
        .mo{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto}
        .modal{background:#fff;border-radius:16px;width:100%;max-width:700px;box-shadow:0 20px 60px rgba(15,23,42,.22);margin:auto}
        .mhdr{padding:18px 22px 14px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between}
        .mtitle{font-size:17px;font-weight:700;color:#0F172A}
        .mclose{background:none;border:none;cursor:pointer;color:#94A3B8;font-size:20px;line-height:1;padding:4px;border-radius:6px;transition:all .15s}
        .mclose:hover{background:#F1F5F9;color:#475569}
        .mbody{padding:22px;display:flex;flex-direction:column;gap:18px;max-height:70vh;overflow-y:auto}
        .mftr{padding:14px 22px;border-top:1px solid #F1F5F9;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:#FAFBFC;border-radius:0 0 16px 16px}
        .btn-del{background:#FEF2F2;color:#DC2626;border:none;padding:8px 16px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer;margin-right:auto}
        .btn-del:hover{background:#FEE2E2}
        .btn-cancel{background:#F1F5F9;color:#475569;border:none;padding:8px 16px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer}
        .btn-cancel:hover{background:#E2E8F0}
        .btn-save{background:#2563EB;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer}
        .btn-save:hover{background:#1D4ED8}
        .cfm-o{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:2000;display:flex;align-items:center;justify-content:center}
        .cfm-box{background:#fff;border-radius:14px;padding:26px;max-width:340px;width:calc(100% - 48px);box-shadow:0 20px 60px rgba(15,23,42,.2);text-align:center}
        .cfm-ico{font-size:34px;margin-bottom:10px}
        .cfm-title{font-size:17px;font-weight:700;margin-bottom:6px}
        .cfm-text{font-size:14px;color:#64748B;margin-bottom:18px;line-height:1.5}
        .cfm-acts{display:flex;gap:10px;justify-content:center}
        .toast{position:fixed;bottom:22px;right:22px;background:#0F172A;color:#fff;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 8px 24px rgba(15,23,42,.2);z-index:3000}
        .toast.ok{border-left:3px solid #22C55E}
        .toast.err{border-left:3px solid #EF4444}
        thead th.sa::after{content:' ▲'}
        thead th.sd::after{content:' ▼'}
        thead th.ns{cursor:default}
        thead th.ns:hover{background:#F8FAFC!important;color:#64748B!important}
        .vl-btn{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;color:#0F172A;background:#F8FAFC;cursor:pointer;user-select:none;transition:all .15s}
        .vl-btn:hover,.vl-btn.open{border-color:#2563EB;background:#fff}
        .vl-btn.open{box-shadow:0 0 0 3px rgba(37,99,235,.1)}
        .vl-lbl{flex:1}.vl-lbl.ph{color:#94A3B8}
        .vl-caret{color:#94A3B8;font-size:10px;margin-left:6px;transition:transform .15s}
        .vl-btn.open .vl-caret{transform:rotate(180deg)}
        .vl-item{display:flex;align-items:center;padding:8px 8px 8px 12px;cursor:pointer;font-size:13.5px;transition:background .1s;gap:6px}
        .vl-item:hover{background:#F8FAFC}
        .vl-item.sel{background:#EFF6FF;color:#2563EB;font-weight:600}
        .vl-name{flex:1}
        .vl-del{background:none;border:none;cursor:pointer;color:#CBD5E1;width:22px;height:22px;border-radius:4px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
        .vl-del:hover{background:#FEF2F2;color:#EF4444}
        .vl-new{padding:8px 12px;cursor:pointer;font-size:13px;color:#2563EB;font-weight:600;border-top:1px solid #F1F5F9;transition:background .1s}
        .vl-new:hover{background:#EFF6FF}
      `}</style>

      {/* Stats bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E2E8F0', padding:'0 0 0 0', display:'flex', overflowX:'auto', flexShrink:0 }}>
        {[
          ['UKUPNO', deals.length, 'unosa'],
          ['AKTIVNI', active, 'u pipelineu'],
          ['PIPELINE', pipeline.toLocaleString('hr-HR') + ' €', 'EUR/mj procjena'],
          ['PREGOVORI', byS['Pregovori'] || 0, 'aktivno'],
          ['PONUDA POSLANA', byS['Ponuda poslana'] || 0, 'čeka odgovor'],
          ['ZATVORENO', (byS['Izgubljeno']||0)+(byS['Diskvalificiran']||0), 'izgub. + diskvalif.'],
        ].map(([lbl, val, sub]) => (
          <div key={lbl} style={{ padding:'13px 20px', borderRight:'1px solid #F1F5F9', display:'flex', flexDirection:'column', gap:3, whiteSpace:'nowrap', minWidth:130 }}>
            <div style={{ fontSize:'10.5px', fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px' }}>{lbl}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#1D4ED8', lineHeight:1, letterSpacing:'-.5px' }}>{val}</div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:'#F0F4F8', borderBottom:'1px solid #DDE3EA', padding:'10px 28px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', flexShrink:0 }}>
        <div style={{ position:'relative', flex:1, minWidth:200, maxWidth:290 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#94A3B8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pretraži tvrtku, ime, e-mail…"
            style={{ width:'100%', padding:'7px 12px 7px 33px', border:'1px solid #DDE3EA', borderRadius:8, fontSize:'13.5px', outline:'none', background:'#fff', color:'#0F172A' }} />
        </div>
        <select value={ownerF} onChange={e => setOwnerF(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #DDE3EA', borderRadius:8, fontSize:13, outline:'none', background:'#fff', cursor:'pointer', color:'#475569' }}>
          <option value="">Svi vlasnici</option>
          {vlasnici.map(v => <option key={v}>{v}</option>)}
        </select>
        <select value={tipF} onChange={e => setTipF(e.target.value)}
          style={{ padding:'7px 12px', border:'1px solid #DDE3EA', borderRadius:8, fontSize:13, outline:'none', background:'#fff', cursor:'pointer', color:'#475569' }}>
          <option value="">Svi tipovi</option>
          {TIPOVI.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize:'11.5px', fontWeight:600, color:'#94A3B8', whiteSpace:'nowrap' }}>Status:</span>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {SK.map(k => {
            const c = sc(k); const on = !!spills[k];
            return (
              <span key={k} className={'spill' + (on ? ' on' : '')}
                style={{ background:c.bg, color:c.cl, borderColor: on ? c.dt : 'transparent' }}
                onClick={() => togSpill(k)}>
                {sl(k)} <span className="cnt">{byS[k] || 0}</span>
              </span>
            );
          })}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={exportCSV}
            style={{ background:'rgba(255,255,255,.7)', color:'#475569', border:'1px solid #DDE3EA', padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer' }}>
            ↓ CSV
          </button>
          <button onClick={() => setModal({})}
            style={{ background:'#2563EB', color:'#fff', border:'none', padding:'8px 18px', borderRadius:8, fontSize:'13.5px', fontWeight:600, cursor:'pointer' }}>
            + Novi unos
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, padding:'20px 28px', background:'#F0F4F8', display:'flex', flexDirection:'column', minHeight:0, overflow:'auto' }}>
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(15,23,42,.06)', flex:1, overflow:'auto', minHeight:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:960 }}>
            <thead>
              <tr>
                {[
                  ['#', null, '36px'],
                  ['Datum upita', 'datum_upita', null],
                  ['Tvrtka / Kontakt', 'tvrtka', null],
                  ['Tip usluge', 'tip_usluge', null],
                  ['Upitnik', null, null],
                  ['Ponuda', null, null],
                  ['Status', 'stage', null],
                  ['Vlasnik', 'vlasnik', null],
                  ['Sljedeći korak', null, null],
                  ['Proc. vr. (EUR/mj)', 'value', null],
                  ['Akcije', null, null],
                ].map(([label, key, w]) => (
                  <th key={label}
                    className={(key ? thCls(key) : '') + (key ? '' : ' ns')}
                    style={{ background:'#F8FAFC', padding:'10px 14px', textAlign:'left', fontSize:'10.5px', fontWeight:700,
                      color:'#64748B', textTransform:'uppercase', letterSpacing:'.7px', borderBottom:'1px solid #E2E8F0',
                      whiteSpace:'nowrap', cursor: key ? 'pointer' : 'default', userSelect:'none',
                      position:'sticky', top:0, zIndex:10, ...(w ? {width:w} : {}) }}
                    onClick={() => key && sortBy(key)}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={11}>
                  <div style={{ padding:'60px 24px', textAlign:'center', color:'#94A3B8' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                    <h3 style={{ fontSize:16, fontWeight:600, color:'#475569', marginBottom:4 }}>Nema rezultata</h3>
                    <p style={{ fontSize:13 }}>Promijenite filtre ili dodajte novi unos.</p>
                  </div>
                </td></tr>
              ) : sorted.map((d, i) => {
                const vr = d.value ? Number(d.value).toLocaleString('hr-HR') + ' €' : '—';
                const owCls = d.vlasnik === 'Wanda' ? 'ow' : d.vlasnik === 'Matija' ? 'om' : 'oo';
                return (
                  <tr key={d.id} style={{ borderBottom:'1px solid #F1F5F9', transition:'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#EFF6FF'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle', color:'#CBD5E1', fontSize:'11.5px', fontWeight:700 }}>{i+1}</td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle', color:'#64748B', fontSize:12, whiteSpace:'nowrap' }}>{d.datum_upita || '—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      {d.tvrtka && <div style={{ fontWeight:600, color:'#0F172A' }}>{d.tvrtka}</div>}
                      {d.ime_kontakta && <div style={{ color:'#64748B', fontSize:12, marginTop:2 }}>{d.ime_kontakta}</div>}
                      {!d.tvrtka && !d.ime_kontakta && <span style={{ color:'#94A3B8' }}>—</span>}
                      {d.email && <a href={`mailto:${d.email}`} style={{ color:'#2563EB', fontSize:11, display:'block', marginTop:2 }}>{d.email}</a>}
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      <span style={{ fontSize:12, color:'#475569' }}>{d.tip_usluge || '—'}</span>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span className={'dbadge ' + (d.upitnik_poslan ? 'dy' : 'dn')}>{d.upitnik_poslan ? '✓' : '–'}</span>
                          <span style={{ fontSize:11, color:'#64748B' }}>poslan</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span className={'dbadge ' + (d.upitnik_vracen ? 'dy' : 'dn')}>{d.upitnik_vracen ? '✓' : '–'}</span>
                          <span style={{ fontSize:11, color:'#64748B' }}>vraćen</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle', textAlign:'center' }}>
                      <span className={'dbadge ' + (d.ponuda_poslana ? 'dy' : 'dn')}>{d.ponuda_poslana ? '✓' : '–'}</span>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      <StatusBadge status={d.stage} onChange={ns => handleStatusChange(d, ns)} />
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      {d.vlasnik
                        ? <span className={'ochip ' + owCls}>{d.vlasnik}</span>
                        : <span style={{ color:'#94A3B8', fontSize:12 }}>—</span>}
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      <div style={{ color:'#475569', fontSize:12, maxWidth:170, lineHeight:1.4 }}>{d.slj_korak || ''}</div>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle', fontWeight:700, color:'#1D4ED8' }}>{vr}</td>
                    <td style={{ padding:'11px 14px', fontSize:'13.5px', verticalAlign:'middle' }}>
                      <div className="acts">
                        <button className="abtn edit" title="Uredi" onClick={() => setModal(d)}>✎</button>
                        <button className="abtn del" title="Obriši"
                          onClick={() => setConfirm({ id: d.id, label: d.tvrtka || d.ime_kontakta || 'unos' })}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal !== null && (
        <Modal
          deal={modal?.id ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={() => modal?.id && setConfirm({ id: modal.id, label: modal.tvrtka || modal.ime_kontakta || 'unos' })}
          vlasnici={vlasnici}
          onAddVlasnik={addVlasnik}
          onDeleteVlasnik={deleteVlasnik}
        />
      )}

      {/* Confirm dialog */}
      {confirm && (
        <Confirm
          text={`Obrisati unos (${confirm.label})? Ova akcija se ne može poništiti.`}
          onYes={handleDelete}
          onNo={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}
