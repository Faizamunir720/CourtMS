import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { hearingService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function LawyerHearings() {
  const toast = useToast();
  const [hearings, setHearings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      const data = await hearingService.getAll(params);
      setHearings(data.hearings);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  return (
    <div>
      <div className="page-header">
        <div><h1>Hearings</h1><p>Hearings for your cases</p></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <select className="form-control" style={{ minWidth: 160 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option>Scheduled</option><option>Completed</option><option>Adjourned</option><option>Postponed</option>
            </select>
          </div>
          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case</th><th>Date</th><th>Time</th><th>Location</th><th>Judge</th><th>Status</th><th>Outcome</th></tr></thead>
                  <tbody>
                    {hearings.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="icon"><Icon name="courthouse" size={48} /></div><h3>No hearings found</h3></div></td></tr>}
                    {hearings.map((h) => (
                      <tr key={h.id}>
                        <td><strong>{h.case?.caseNumber}</strong><br /><small style={{ color: 'var(--gray-400)' }}>{h.case?.title}</small></td>
                        <td>{formatDate(h.hearingDate)}</td>
                        <td>{h.hearingTime}</td>
                        <td>{h.location}</td>
                        <td>{h.judge?.name || '—'}</td>
                        <td><StatusBadge status={h.status} /></td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gray-500)', fontSize: 12 }}>{h.outcome || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pagination.page} total={pagination.total} limit={pagination.limit} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
