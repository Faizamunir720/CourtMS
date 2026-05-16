import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService, notificationService } from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      caseService.getAll({ limit: 10 }),
      notificationService.getAll({ limit: 1 }),
    ]).then(([c, n]) => {
      setCases(c.cases);
      setUnread(n.unreadCount || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading…" />;

  const pending = cases.filter((c) => c.status === 'Pending').length;
  const ongoing = cases.filter((c) => c.status === 'Ongoing').length;
  const closed = cases.filter((c) => c.status === 'Closed').length;

  return (
    <div>
      <div className="page-header">
        <div><h1>Welcome, {user?.name}</h1><p>Track your legal cases and stay informed</p></div>
      </div>

      <div className="stat-grid">
        <StatCard icon="folder" label="Total Cases" value={cases.length} color="blue" />
        <StatCard icon="pin" label="Pending" value={pending} color="amber" />
        <StatCard icon="refresh" label="Ongoing" value={ongoing} color="cyan" />
        <StatCard icon="check" label="Closed" value={closed} color="green" />
        <StatCard icon="bell" label="Unread Notifications" value={unread} color="purple" />
      </div>

      <div className="card">
        <div className="card-header"><h3>My Cases</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {cases.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><Icon name="folder" size={48} /></div>
              <h3>No cases linked to your account</h3>
              <p>Contact the court administration to have your cases linked.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Case #</th><th>Title</th><th>Type</th><th>Status</th><th>Filed</th><th>Lawyer</th></tr></thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.caseNumber}</strong></td>
                      <td>{c.title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{c.caseType}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{formatDate(c.filedDate)}</td>
                      <td>{c.lawyer?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
