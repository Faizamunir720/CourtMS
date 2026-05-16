import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function LawyerCases() {
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hearings, setHearings] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const data = await caseService.getAll(params);
      setCases(data.cases);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  async function openDetail(c) {
    setSelected(c);
    setDetailModal(true);
    try {
      const data = await caseService.getHearings(c.id);
      setHearings(data.hearings);
    } catch { setHearings([]); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>My Cases</h1><p>All cases assigned to you</p></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span className="search-icon-wrap" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={16} /></span>
              <input className="form-control" placeholder="Search cases…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ paddingLeft: 36 }} />
            </div>
            <select className="form-control" style={{ minWidth: 140 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option>Pending</option><option>Ongoing</option><option>Closed</option>
            </select>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Type</th><th>Status</th><th>Judge</th><th>Filed</th><th>Actions</th></tr></thead>
                  <tbody>
                    {cases.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="icon"><Icon name="folder" size={48} /></div><h3>No cases found</h3></div></td></tr>}
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.caseNumber}</strong></td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td><span style={{ textTransform: 'capitalize' }}>{c.caseType}</span></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>{c.judge?.name || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                        <td>{formatDate(c.filedDate)}</td>
                        <td><button className="btn btn-sm btn-secondary" onClick={() => openDetail(c)}>View</button></td>
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

      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title={`Case: ${selected?.caseNumber}`} large>
        {selected && (
          <div>
            <div className="info-grid" style={{ marginBottom: 20 }}>
              <div className="info-item"><label>Title</label><span>{selected.title}</span></div>
              <div className="info-item"><label>Status</label><span><StatusBadge status={selected.status} /></span></div>
              <div className="info-item"><label>Type</label><span style={{ textTransform: 'capitalize' }}>{selected.caseType}</span></div>
              <div className="info-item"><label>Filed</label><span>{formatDate(selected.filedDate)}</span></div>
              <div className="info-item"><label>Applicant</label><span>{selected.applicant}</span></div>
              <div className="info-item"><label>Respondent</label><span>{selected.respondent}</span></div>
              <div className="info-item"><label>Judge</label><span>{selected.judge?.name || 'Not assigned'}</span></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Description</label>
              <p style={{ color: 'var(--gray-600)', fontSize: 13.5 }}>{selected.description}</p>
            </div>
            <h4 style={{ marginBottom: 10 }}>Hearings Timeline</h4>
            {hearings.length === 0 ? <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No hearings scheduled</p> : (
              <div className="timeline">
                {hearings.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" style={{ background: h.status === 'Completed' ? 'var(--success)' : h.status === 'Scheduled' ? 'var(--accent)' : 'var(--warning)' }} />
                    <div className="timeline-date">{formatDate(h.hearingDate)} at {h.hearingTime}</div>
                    <div className="timeline-content">
                      <div className="timeline-title">{h.location} — <StatusBadge status={h.status} /></div>
                      {h.outcome && <div className="timeline-desc">Outcome: {h.outcome}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
