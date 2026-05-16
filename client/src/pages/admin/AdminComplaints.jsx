import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { complaintService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

export default function AdminComplaints() {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '' });
  const [loading, setLoading] = useState(true);
  const [respondModal, setRespondModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [responseForm, setResponseForm] = useState({ response: '', status: 'under_review' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      const data = await complaintService.getAll(params);
      setComplaints(data.complaints);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  function openRespond(c) { setSelected(c); setResponseForm({ response: c.response || '', status: 'resolved' }); setRespondModal(true); }

  async function handleRespond() {
    setSaving(true);
    try {
      await complaintService.respond(selected.id, responseForm);
      toast?.show('Response submitted', 'success');
      setRespondModal(false);
      load();
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Complaints</h1><p>Manage citizen complaints and requests</p></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <select className="form-control" style={{ minWidth: 160 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Subject</th><th>From</th><th>Case</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
                  <tbody>
                    {complaints.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Icon name="clipboard" size={48} /></div><h3>No complaints</h3></div></td></tr>}
                    {complaints.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.subject}</strong><br /><small style={{ color: 'var(--gray-400)' }}>{c.description.substring(0, 60)}…</small></td>
                        <td>{c.submittedBy?.name || '—'}<br /><small style={{ color: 'var(--gray-400)' }}>{c.submittedBy?.email}</small></td>
                        <td>{c.case?.caseNumber || '—'}</td>
                        <td><span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                        <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td><button className="btn btn-sm btn-primary" onClick={() => openRespond(c)}>{c.status === 'pending' ? 'Respond' : 'View'}</button></td>
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

      <Modal isOpen={respondModal} onClose={() => setRespondModal(false)} title={`Respond — ${selected?.subject}`}
        footer={<><button className="btn btn-secondary" onClick={() => setRespondModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleRespond} disabled={saving}>{saving ? 'Submitting…' : 'Submit Response'}</button></>}>
        {selected && (
          <div>
            <div style={{ background: 'var(--gray-50)', padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}><strong>Complaint:</strong> {selected.description}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>From: {selected.submittedBy?.name} ({selected.submittedBy?.email})</p>
            </div>
            <div className="form-group"><label className="form-label">Your Response *</label><textarea className="form-control" rows={4} value={responseForm.response} onChange={(e) => setResponseForm({ ...responseForm, response: e.target.value })} /></div>
            <div className="form-group">
              <label className="form-label">Resolution Status</label>
              <select className="form-control" value={responseForm.status} onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
