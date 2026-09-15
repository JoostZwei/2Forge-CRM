import { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Companies from './pages/Companies.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Tasks from './pages/Tasks.jsx';

const IcoDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IcoContacts = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoCompanies = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IcoPipeline = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IcoTasks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

const NAV = [
  { id: 'dashboard', label: 'Nadzorna ploča', short: 'Ploča',    Icon: IcoDashboard },
  { id: 'contacts',  label: 'Kontakti',       short: 'Kontakti', Icon: IcoContacts  },
  { id: 'companies', label: 'Tvrtke',         short: 'Tvrtke',   Icon: IcoCompanies },
  { id: 'pipeline',  label: 'Pipeline',       short: 'Pipeline', Icon: IcoPipeline  },
  { id: 'tasks',     label: 'Zadaci',         short: 'Zadaci',   Icon: IcoTasks     },
];

const PAGES = { dashboard: Dashboard, contacts: Contacts, companies: Companies, pipeline: Pipeline, tasks: Tasks };

export default function App() {
  const [page, setPage] = useState('dashboard');
  const Page = PAGES[page];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">2F</div>
          <div className="sidebar-logo-text">2Forge<span>CRM Workspace</span></div>
        </div>
        <nav>
          <div className="nav-section-label">Izbornik</div>
          {NAV.map(({ id, label, Icon }) => (
            <div
              key={id}
              className={`nav-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
            >
              <span className="nav-icon"><Icon /></span>
              {label}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Page />
      </main>
      {/* Mobile bottom navigation */}
      <nav className="mobile-nav">
        {NAV.map(({ id, short, Icon }) => (
          <div
            key={id}
            className={`mobile-nav-item${page === id ? ' active' : ''}`}
            onClick={() => setPage(id)}
          >
            <Icon />
            <span>{short}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
