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
    setLoading(true);
    analyticsService.getOverview()
      .then(function (data) {
        setOverview(data);
        return analyticsService.getJudgeWorkload();
      })
      .then(function (wlData) {
        if (wlData && wlData.workload) {
          setWorkload(wlData.workload);
        }
        setLoading(false);
      })
      .catch(function () {
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics…" />;

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

  const caseStatusChart = overview ? [
    { label: 'Submitted', count: overview.cases.submitted },
    { label: 'Registered', count: overview.cases.registered },
    { label: 'Hearing Scheduled', count: overview.cases.hearingScheduled },
    { label: 'Ongoing', count: overview.cases.ongoing },
    { label: 'Adjourned', count: overview.cases.adjourned },
    { label: 'Closed', count: overview.cases.closed },
  ] : [];

  const userDistribution = overview ? [
    { label: 'Lawyers', count: overview.users.lawyers },
    { label: 'Judges', count: overview.users.judges },
    { label: 'Citizens', count: overview.users.citizens },
  ] : [];

  const c = overview && overview.cases ? overview.cases : {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics & Reports</h1>
          <p>Read-only statistics for monitoring the court system</p>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        These reports are for monitoring only. Case registration and hearings are managed by clerks.
      </div>

      {overview && (
        <>
          <h3 style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Case statistics</h3>
          <div className="stat-grid">
            <StatCard icon="folder" label="Total Cases" value={c.total} color="blue" />
            <StatCard icon="pin" label="Submitted" value={c.submitted} color="amber" />
            <StatCard icon="folder" label="Registered" value={c.registered} color="purple" />
            <StatCard icon="courthouse" label="Hearing Scheduled" value={c.hearingScheduled} color="cyan" />
            <StatCard icon="refresh" label="Ongoing" value={c.ongoing} color="cyan" />
            <StatCard icon="pin" label="Adjourned" value={c.adjourned} color="amber" />
            <StatCard icon="check" label="Closed" value={c.closed} color="green" />
            <StatCard icon="courthouse" label="Hearings This Month" value={overview.hearingsThisMonth} color="purple" />
            <StatCard icon="file" label="Documents" value={overview.totalDocuments} color="blue" />
          </div>

          <h3 style={{ fontSize: 14, color: 'var(--gray-600)', margin: '24px 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User statistics</h3>
          <div className="stat-grid">
            <StatCard icon="users" label="Total Users" value={overview.users.total} color="blue" />
            <StatCard icon="scales" label="Lawyers" value={overview.users.lawyers} color="cyan" />
            <StatCard icon="scales" label="Judges" value={overview.users.judges} color="amber" />
            <StatCard icon="users" label="Citizens" value={overview.users.citizens} color="green" />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            <div className="card">
              <div className="card-header"><h3>Cases by Status</h3></div>
              <div className="card-body">
                <SimpleBarChart data={caseStatusChart} labelKey="label" valueKey="count" barColor="var(--forest-mid)" />
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>User Distribution</h3></div>
              <div className="card-body">
                <SimpleBarChart data={userDistribution} labelKey="label" valueKey="count" barColor="var(--info)" />
              </div>
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
                <thead>
                  <tr>
                    <th>Judge</th>
                    <th>Email</th>
                    <th>Active Cases</th>
                    <th>Scheduled Hearings</th>
                    <th>Completed Hearings</th>
                  </tr>
                </thead>
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
