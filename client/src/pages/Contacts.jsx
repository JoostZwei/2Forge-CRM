import { useEffect, useState } from 'react';
import { api } from '../api.js';

function initials(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

function NotePanel({ contact, onClose }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState('');

  const load = () => api.getNotes({ contact_id: contact.id }).then(setNotes);
  useEffect(() => { load(); }, [contact.id]);

  const add = async () => {
    if (!body.trim()) return;
    await api.createNote({ body, contact_id: contact.id });
    setBody('');
    load();
  };

  const del = async (id) => {
    await api.deleteNote(id);
    load();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2>Bilješke — {contact.first_name} {contact.last_name}</h2>
        <div style={{ marginBottom: 14 }}>
          <textarea
            rows={3}
            placeholder="Nova bilješka…"
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{ resize: 'vertical' }}
          />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={add}>Dodaj bilješku</button>
        </div>
        {notes.length === 0 ? (
          <div className="empty" style={{ padding: 20 }}>Nema bilješki.</div>
        ) : notes.map(n => (
          <div key={n.id} className="note-item">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="note-body">{n.body}</span>
              <button className="btn btn-danger btn-sm" style={{ marginLeft: 10, flexShrink: 0 }} onClick={() => del(n.id)}>×</button>
            </div>
            <div className="note-date">{new Date(n.created_at).toLocaleString('hr-HR')}</div>
          </div>
        ))}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Zatvori</button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ contact, companies, onSave, onClose }) {
  const [form, setForm] = useState(contact || { first_name: '', last_name: '', email: '', phone: '', position: '', company_id: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (contact?.id) await api.updateContact(contact.id, form);
    else await api.createContact(form);
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{contact?.id ? 'Uredi kontakt' : 'Novi kontakt'}</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>Ime *</label>
              <input required value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Prezime *</label>
              <input required value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Telefon</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Pozicija</label>
              <input value={form.position || ''} onChange={e => set('position', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Tvrtka</label>
            <select value={form.company_id || ''} onChange={e => set('company_id', e.target.value)}>
              <option value="">— bez tvrtke —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [noteContact, setNoteContact] = useState(null);

  const load = () => Promise.all([api.getContacts(), api.getCompanies()]).then(([c, co]) => { setContacts(c); setCompanies(co); });
  useEffect(() => { load(); }, []);

  const filtered = contacts
    .filter(c =>
      `${c.first_name} ${c.last_name} ${c.email || ''} ${c.company_name || ''}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const an = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
      const bn = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
      return an.localeCompare(bn, 'hr');
    });

  const del = async (id) => {
    if (confirm('Obrisati kontakt?')) { await api.deleteContact(id); load(); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Kontakti</h1>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Novi kontakt</button>
      </div>
      <div className="search-bar">
        <input placeholder="Pretraži kontakte…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">👤</div>Nema kontakata.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kontakt</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Tvrtka</th>
                  <th>Pozicija</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="contact-cell">
                        <div className="avatar">{initials(c.first_name, c.last_name)}</div>
                        <strong>{c.first_name} {c.last_name}</strong>
                      </div>
                    </td>
                    <td>{c.email || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.company_name || '—'}</td>
                    <td>{c.position || '—'}</td>
                    <td>
                      <div className="action-row">
                        <button className="btn btn-ghost btn-sm" onClick={() => setNoteContact(c)}>📝</button>
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
        <ContactModal
          contact={modal}
          companies={companies}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
      {noteContact && <NotePanel contact={noteContact} onClose={() => setNoteContact(null)} />}
    </div>
  );
}
