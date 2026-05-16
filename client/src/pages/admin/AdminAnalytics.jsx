import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import StatCard from '../../components/StatCard';
import SimpleBarChart from '../../components/SimpleBarChart';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminAnalytics() {
  const [overview, setOverview] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsService.getOverview(), analyticsService.getJudgeWorkload()])
      .then(([ov, wl]) => { setOverview(ov); setWorkload(wl.workload || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics…" />;

  const casesByType = overview?.casesByType?.map((item) => ({
    label: item.type,
    count: item.count,
  })) || [];

  const casesPerMonth = overview?.casesPerMonth?.map((item) => ({
    label: item.label,
    count: item.count,
  })) || [];

  const userDistribution = overview ? [
    { label: 'Lawyers', count: overview.users.lawyers },
    { label: 'Judges', count: overview.users.judges },
    { label: 'Citizens', count: overview.users.citizens },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div><h1>Analytics & Reports</h1><p>Insights and statistics for the court system</p></div>
      </div>

      {overview && (
        <>
          <div className="stat-grid">
            <StatCard icon="folder" label="Total Cases" value={overview.cases.total} color="blue" />
            <StatCard icon="pin" label="Pending" value={overview.cases.pending} color="amber" />
            <StatCard icon="refresh" label="Ongoing" value={overview.cases.ongoing} color="cyan" />
            <StatCard icon="check" label="Closed" value={overview.cases.closed} color="green" />
            <StatCard icon="courthouse" label="Hearings This Month" value={overview.hearingsThisMonth} color="purple" />
            <StatCard icon="file" label="Documents" value={overview.totalDocuments} color="blue" />
          </div>

          <div className="charts-grid">
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

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3>User Distribution</h3></div>
            <div className="card-body">
              <SimpleBarChart data={userDistribution} labelKey="label" valueKey="count" barColor="var(--info)" />
            </div>
          </div>
        </>
      )}

      {workload.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Judge Workload</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Judge</th><th>Email</th><th>Active Cases</th><th>Scheduled Hearings</th><th>Completed Hearings</th></tr></thead>
                <tbody>
                  {workload.map((w) => (
                    <tr key={w.judge.id}>
                      <td><strong>{w.judge.name}</strong></td>
                      <td>{w.judge.email}</td>
                      <td><span className="badge badge-ongoing">{w.activeCases}</span></td>
                      <td><span className="badge badge-scheduled">{w.scheduledHearings}</span></td>
                      <td><span className="badge badge-completed">{w.completedHearings}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
