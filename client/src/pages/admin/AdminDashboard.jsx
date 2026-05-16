import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import StatCard from '../../components/StatCard';
import SimpleBarChart from '../../components/SimpleBarChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsService.getOverview(), analyticsService.getRecentActivity()])
      .then(([ov, ac]) => { setOverview(ov); setActivity(ac); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  const casesByType = overview?.casesByType?.map((item) => ({
    label: item.type,
    count: item.count,
  })) || [];

  const casesPerMonth = overview?.casesPerMonth?.map((item) => ({
    label: item.label,
    count: item.count,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Overview of the court case management system</p>
        </div>
      </div>

      {overview && (
        <>
          <div className="stat-grid">
            <StatCard icon="folder" label="Total Cases" value={overview.cases.total} color="blue" />
            <StatCard icon="pin" label="Pending Cases" value={overview.cases.pending} color="amber" />
            <StatCard icon="refresh" label="Ongoing Cases" value={overview.cases.ongoing} color="cyan" />
            <StatCard icon="check" label="Closed Cases" value={overview.cases.closed} color="green" />
            <StatCard icon="courthouse" label="Hearings This Month" value={overview.hearingsThisMonth} color="purple" />
            <StatCard icon="users" label="Total Users" value={overview.users.total} color="blue" />
            <StatCard icon="scales" label="Lawyers" value={overview.users.lawyers} color="cyan" />
            <StatCard icon="scales" label="Judges" value={overview.users.judges} color="amber" />
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="card-header"><h3>Cases by Type</h3></div>
              <div className="card-body">
                <SimpleBarChart data={casesByType} labelKey="label" valueKey="count" barColor="var(--accent)" />
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Cases Per Month</h3></div>
              <div className="card-body">
                <SimpleBarChart data={casesPerMonth} labelKey="label" valueKey="count" barColor="var(--forest-mid)" />
              </div>
            </div>
          </div>
        </>
      )}

      {activity && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
          <div className="card">
            <div className="card-header"><h3>Recent Cases</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Status</th><th>Filed</th></tr></thead>
                  <tbody>
                    {activity.recentCases.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.caseNumber}</strong></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Recent Hearings</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {activity.recentHearings.map((h) => (
                      <tr key={h.id}>
                        <td>{h.case?.caseNumber || '—'}</td>
                        <td>{formatDate(h.hearingDate)} {h.hearingTime}</td>
                        <td><StatusBadge status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
