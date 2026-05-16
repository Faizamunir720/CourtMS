import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { hearingService, caseService, notificationService } from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function JudgeDashboard() {
  const { user } = useAuth();
  const [hearings, setHearings] = useState([]);
  const [cases, setCases] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      hearingService.getAll({ limit: 5, status: 'Scheduled' }),
      caseService.getAll({ limit: 5 }),
      notificationService.getAll({ limit: 1 }),
    ]).then(([h, c, n]) => {
      setHearings(h.hearings);
      setCases(c.cases);
      setUnread(n.unreadCount || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  const scheduledCount = hearings.length;
  const completedCases = cases.filter((c) => c.status === 'Closed').length;
  const activeCases = cases.filter((c) => c.status !== 'Closed').length;

  return (
    <div>
      <div className="page-header">
        <div><h1>Welcome, Judge {user?.name}</h1><p>Your hearing schedule and case overview</p></div>
      </div>

      <div className="stat-grid">
        <StatCard icon="courthouse" label="Upcoming Hearings" value={scheduledCount} color="blue" />
        <StatCard icon="scales" label="Active Cases" value={activeCases} color="cyan" />
        <StatCard icon="check" label="Closed Cases" value={completedCases} color="green" />
        <StatCard icon="bell" label="Unread Notifications" value={unread} color="amber" />
      </div>

      <div className="card">
        <div className="card-header"><h3>Upcoming Hearings</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {hearings.length === 0 ? (
            <div className="empty-state"><div className="icon"><Icon name="courthouse" size={48} /></div><h3>No upcoming hearings</h3><p>Your schedule is clear</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Case</th><th>Date</th><th>Time</th><th>Location</th><th>Status</th></tr></thead>
                <tbody>
                  {hearings.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.case?.caseNumber}</strong><br /><small style={{ color: 'var(--gray-500)' }}>{h.case?.title}</small></td>
                      <td>{formatDate(h.hearingDate)}</td>
                      <td>{h.hearingTime}</td>
                      <td>{h.location}</td>
                      <td><StatusBadge status={h.status} /></td>
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
