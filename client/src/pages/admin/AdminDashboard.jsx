import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService, userService } from '../../services/api';
import StatCard from '../../components/StatCard';
import SimpleBarChart from '../../components/SimpleBarChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import Icon from '../../components/Icon';

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch on mount — useEffect with [] (class lab pattern)
  useEffect(() => {
    setLoading(true);
    analyticsService.getOverview()
      .then(function (data) {
        setOverview(data);
        return analyticsService.getRecentActivity();
      })
      .then(function (activityData) {
        setActivity(activityData);
        return userService.getAll({ limit: 1 });
      })
      .then(function (usersData) {
        if (usersData && usersData.pagination) {
          setUserCount(usersData.pagination.total || 0);
        }
        setLoading(false);
      })
      .catch(function () {
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  let casesByType = [];
  let casesPerMonth = [];
  if (overview && overview.casesByType) {
    casesByType = overview.casesByType.map(function (item) {
      return { label: item.type, count: item.count };
    });
  }
  if (overview && overview.casesPerMonth) {
    casesPerMonth = overview.casesPerMonth.map(function (item) {
      return { label: item.label, count: item.count };
    });
  }

  const c = overview && overview.cases ? overview.cases : {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>System overview — users, analytics, and audit logs. Clerks handle day-to-day case work.</p>
        </div>
        <Link to="/admin/analytics" className="btn btn-primary">View Full Analytics</Link>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Admin role:</strong> Manage users, monitor court statistics, and review audit logs.
        You do not register cases or schedule hearings.
      </div>

      <h3 style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Users</h3>
      <div className="stat-grid">
        <StatCard icon="users" label="Total Users" value={userCount || (overview && overview.users ? overview.users.total : 0)} color="blue" />
        <StatCard icon="scales" label="Lawyers" value={overview && overview.users ? overview.users.lawyers : 0} color="cyan" />
        <StatCard icon="scales" label="Judges" value={overview && overview.users ? overview.users.judges : 0} color="amber" />
        <StatCard icon="users" label="Citizens" value={overview && overview.users ? overview.users.citizens : 0} color="green" />
      </div>

      {overview && (
        <>
          <h3 style={{ fontSize: 14, color: 'var(--gray-600)', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cases overview</h3>
          <div className="stat-grid">
            <StatCard icon="folder" label="Total Cases" value={c.total || 0} color="blue" />
            <StatCard icon="pin" label="Submitted" value={c.submitted || 0} color="amber" />
            <StatCard icon="folder" label="Registered" value={c.registered || 0} color="purple" />
            <StatCard icon="courthouse" label="Hearing Scheduled" value={c.hearingScheduled || 0} color="cyan" />
            <StatCard icon="refresh" label="Ongoing" value={c.ongoing || 0} color="cyan" />
            <StatCard icon="check" label="Closed" value={c.closed || 0} color="green" />
            <StatCard icon="courthouse" label="Hearings This Month" value={overview.hearingsThisMonth || 0} color="purple" />
            <StatCard icon="file" label="Documents" value={overview.totalDocuments || 0} color="blue" />
          </div>

          <div className="charts-grid" style={{ marginTop: 24 }}>
            <div className="card">
              <div className="card-header"><h3>Cases by Type</h3></div>
              <div className="card-body">
                <SimpleBarChart data={casesByType} labelKey="label" valueKey="count" barColor="var(--accent)" />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Cases per Month</h3></div>
              <div className="card-body">
                <SimpleBarChart data={casesPerMonth} labelKey="label" valueKey="count" barColor="var(--forest-mid)" />
              </div>
            </div>
          </div>
        </>
      )}

      {activity && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
          <div className="card">
            <div className="card-header"><h3>Recent Cases</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Status</th><th>Filed</th></tr></thead>
                  <tbody>
                    {activity.recentCases.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>No cases yet</td></tr>
                    )}
                    {activity.recentCases.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.caseNumber}</strong></td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</td>
                        <td><StatusBadge status={item.status} /></td>
                        <td>{formatDate(item.createdAt)}</td>
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
                    {activity.recentHearings.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>No hearings yet</td></tr>
                    )}
                    {activity.recentHearings.map((item) => (
                      <tr key={item.id}>
                        <td>{item.case?.caseNumber || '—'}</td>
                        <td>{formatDate(item.hearingDate)} {item.hearingTime}</td>
                        <td><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 14, color: 'var(--gray-600)', margin: '28px 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick links</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <Link to="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Icon name="users" size={28} />
            <div>
              <h3 style={{ marginBottom: 4, fontSize: 15 }}>Manage Users</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>Create and edit accounts</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/analytics" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Icon name="chart" size={28} />
            <div>
              <h3 style={{ marginBottom: 4, fontSize: 15 }}>Analytics</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>Charts and judge workload</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/audit-logs" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Icon name="search" size={28} />
            <div>
              <h3 style={{ marginBottom: 4, fontSize: 15 }}>Audit Logs</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>System activity history</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
