import React, { useState, useEffect } from 'react';
import { caseService, hearingService, documentService, notificationService } from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function ClerkDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [docTotal, setDocTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      caseService.getAll({ limit: 100 }),
      hearingService.getAll({ limit: 8, status: 'Scheduled' }),
      documentService.getAll({ limit: 1 }),
      notificationService.getAll({ limit: 1 }),
    ])
      .then(([c, h, d, n]) => {
        setCases(c.cases || []);
        setHearings(h.hearings || []);
        setDocTotal(d.pagination?.total || 0);
        setUnread(n.unreadCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading clerk dashboard…" />;

  const submitted = cases.filter((c) => c.status === 'Submitted').length;
  const registered = cases.filter((c) => c.status === 'Registered').length;
  const ongoing = cases.filter((c) => c.status === 'Ongoing' || c.status === 'Hearing Scheduled').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome, {user ? user.name : ''}</h1>
          <p>
            Clerk portal — register submitted cases, schedule hearings, manage documents, and handle registry inquiries (scheduling & documents).
            User management, analytics, and audit logs are admin-only.
          </p>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Your access:</strong> Cases · Hearings · Documents · Registry Inquiries · Notifications.
        You cannot manage users, view system analytics, or audit logs.
      </div>

      <div className="stat-grid">
        <StatCard icon="folder" label="Total Cases" value={cases.length} color="blue" />
        <StatCard icon="pin" label="Awaiting Registration" value={submitted} color="amber" />
        <StatCard icon="folder" label="Registered" value={registered} color="blue" />
        <StatCard icon="refresh" label="Active Cases" value={ongoing} color="cyan" />
        <StatCard icon="courthouse" label="Scheduled Hearings" value={hearings.length} color="green" />
        <StatCard icon="file" label="Documents on File" value={docTotal} color="purple" />
        <StatCard icon="bell" label="Unread Notifications" value={unread} color="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3>Recent Cases</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {cases.length === 0 ? (
              <div className="empty-state"><h3>No cases yet</h3><p>Create a case from the Cases menu.</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Status</th></tr></thead>
                  <tbody>
                    {cases.slice(0, 6).map((c) => (
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
            {hearings.length === 0 ? (
              <div className="empty-state"><h3>No scheduled hearings</h3><p>Schedule from the Hearings menu.</p></div>
            ) : (
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
