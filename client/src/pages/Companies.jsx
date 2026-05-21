import { useEffect, useState } from 'react';
import { api } from '../api.js';

function Modal({ company, onSave, onClose }) {
  const [form, setForm] = useState(company || { name: '', industry: '', website: '', phone: '', address: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (company?.id) await api.updateCompany(company.id, form);
    else await api.createCompany(form);
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{company?.id ? 'Uredi tvrtku' : 'Nova tvrtka'}</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Naziv *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Industrija</label>
              <input value={form.industry || ''} onChange={e => set('industry', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Website</label>
            <input value={form.website || ''} onChange={e => set('website', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Adresa</label>
            <input value={form.address || ''} onChange={e => set('address', e.target.value)} />
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

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => api.getCompanies().then(setCompanies);
  useEffect(() => { load(); }, []);

  const filtered = companies
    .filter(c =>
      `${c.name} ${c.industry || ''}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'hr'));

  const del = async (id) => {
    if (confirm('Obrisati tvrtku?')) { await api.deleteCompany(id); load(); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tvrtke</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Nova tvrtka</button>
      </div>
      <div className="search-bar">
        <input placeholder="Pretraži tvrtke…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">🏢</div>Nema tvrtki.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Naziv</th>
                  <th>Industrija</th>
                  <th>Telefon</th>
                  <th>Website</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.industry || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.website ? <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>{c.website}</a> : '—'}</td>
                    <td>
                      <div className="action-row">
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(c)}>Uredi</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Briši</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && (
        <Modal
          company={modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
