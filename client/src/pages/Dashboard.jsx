import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const fmt = (n) => typeof n === 'number' ? n.toLocaleString('hr-HR') : '—';
  const fmtEur = (n) => typeof n === 'number' ? n.toLocaleString('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—';

  return (
    <div>
      <div className="page-header">
        <h1>Nadzorna ploča</h1>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Kontakti</div>
          <div className="stat-value">{stats ? fmt(stats.contacts) : '…'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tvrtke</div>
          <div className="stat-value">{stats ? fmt(stats.companies) : '…'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Otvoreni dealovi</div>
          <div className="stat-value">{stats ? fmt(stats.openDeals) : '…'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Vrijednost pipeline-a</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{stats ? fmtEur(stats.pipelineValue) : '…'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Otvoreni zadaci</div>
          <div className="stat-value">{stats ? fmt(stats.pendingTasks) : '…'}</div>
        </div>
      </div>
      <div className="card" style={{ padding: '22px 26px' }}>
        <p style={{ color: '#64748B', lineHeight: 1.8, fontSize: 14 }}>
          Dobrodošli u vaš lokalni CRM.<br />
          Koristite bočni izbornik za navigaciju između kontakata, tvrtki, pipeline-a i zadataka.
        </p>
      </div>
    </div>
  );
}
