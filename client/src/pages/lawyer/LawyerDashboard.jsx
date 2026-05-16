import React, { useState, useEffect } from 'react';
import { caseService, hearingService, notificationService } from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      caseService.getAll({ limit: 5 }),
      hearingService.getAll({ limit: 5, status: 'Scheduled' }),
      notificationService.getAll({ limit: 1 }),
    ]).then(([c, h, n]) => {
      setCases(c.cases);
      setHearings(h.hearings);
      setUnread(n.unreadCount || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  const total = cases.length;
  const pending = cases.filter((c) => c.status === 'Pending').length;
  const ongoing = cases.filter((c) => c.status === 'Ongoing').length;
  const closed = cases.filter((c) => c.status === 'Closed').length;

  return (
    <div>
      <div className="page-header">
        <div><h1>Welcome, {user?.name}</h1><p>Here's an overview of your cases and upcoming hearings</p></div>
      </div>

      <div className="stat-grid">
        <StatCard icon="folder" label="My Cases" value={total} color="blue" />
        <StatCard icon="pin" label="Pending" value={pending} color="amber" />
        <StatCard icon="refresh" label="Ongoing" value={ongoing} color="cyan" />
        <StatCard icon="check" label="Closed" value={closed} color="green" />
        <StatCard icon="bell" label="Unread Notifications" value={unread} color="purple" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3>Recent Cases</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {cases.length === 0 ? <div className="empty-state"><div className="icon"><Icon name="folder" size={48} /></div><h3>No cases yet</h3></div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Status</th></tr></thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.caseNumber}</strong></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Upcoming Hearings</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {hearings.length === 0 ? <div className="empty-state"><div className="icon"><Icon name="courthouse" size={48} /></div><h3>No upcoming hearings</h3></div> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case</th><th>Date</th><th>Time</th></tr></thead>
                  <tbody>
                    {hearings.map((h) => (
                      <tr key={h.id}>
                        <td>{h.case?.caseNumber || '—'}</td>
                        <td>{formatDate(h.hearingDate)}</td>
                        <td>{h.hearingTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
