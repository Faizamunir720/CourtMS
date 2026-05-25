import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { auditService } from '../../services/api';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

const actionLabels = {
  user_login: 'User Login', user_register: 'Registration', case_created: 'Case Created',
  case_updated: 'Case Updated', case_closed: 'Case Closed', judge_assigned: 'Judge Assigned',
  hearing_scheduled: 'Hearing Scheduled', hearing_outcome_recorded: 'Outcome Recorded',
  document_uploaded: 'Document Uploaded', document_deleted: 'Document Deleted',
  complaint_submitted: 'Complaint', notification_sent: 'Notification',
};

const actionIcons = {
  user_login: 'key', user_register: 'user', case_created: 'folder', case_updated: 'edit',
  judge_assigned: 'scales', hearing_scheduled: 'courthouse', hearing_outcome_recorded: 'clipboard',
  document_uploaded: 'file', complaint_submitted: 'clipboard', default: 'pin',
};

export default function AdminAuditLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ action: '', search: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.action) params.action = filters.action;
      if (filters.search) params.search = filters.search;
      const data = await auditService.getAll(params);
      setLogs(data.logs);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  return (
    <div>
      <div className="page-header">
        <div><h1>Audit Logs</h1><p>Track all system activity</p></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span className="search-icon-wrap" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={16} /></span>
              <input className="form-control" placeholder="Search by email or description…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ paddingLeft: 36 }} />
            </div>
            <select className="form-control" style={{ minWidth: 170 }} value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
              <option value="">All Actions</option>
              {Object.keys(actionLabels).map((a) => <option key={a} value={a}>{actionLabels[a]}</option>)}
            </select>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Action</th><th>Description</th><th>User</th><th>Role</th><th>IP</th><th>Time</th></tr></thead>
                  <tbody>
                    {logs.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Icon name="search" size={48} /></div><h3>No logs found</h3></div></td></tr>}
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name={actionIcons[l.action] || actionIcons.default} size={16} /> {actionLabels[l.action] || l.action}</span></td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gray-500)', fontSize: 12 }}>{l.description}</td>
                        <td>{l.userEmail}</td>
                        <td><span className={`badge badge-${l.userRole}`} style={{ textTransform: 'capitalize' }}>{l.userRole}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{l.ipAddress}</td>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString()}</td>
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
