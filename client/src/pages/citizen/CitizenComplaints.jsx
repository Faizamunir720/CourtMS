import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { complaintService, caseService } from '../../services/api';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

export default function CitizenComplaints() {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', caseId: '' });
  const [saving, setSaving] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await complaintService.getAll({ page: pagination.page, limit: pagination.limit });
      setComplaints(data.complaints);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page]);
  useEffect(() => { caseService.getAll({ limit: 50 }).then((d) => setCases(d.cases)).catch(() => {}); }, []);

  async function handleSubmit() {
    if (!form.subject || !form.description) { toast?.show('Subject and description are required', 'error'); return; }
    setSaving(true);
    try {
      await complaintService.create(form);
      toast?.show('Complaint submitted successfully', 'success');
      setCreateModal(false);
      setForm({ subject: '', description: '', caseId: '' });
      load();
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  const statusColors = { pending: 'badge-pending', under_review: 'badge-under_review', resolved: 'badge-resolved', dismissed: 'badge-dismissed' };

  return (
    <div>
      <div className="page-header">
        <div><h1>Complaints & Requests</h1><p>Submit and track your complaints</p></div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}>+ New Complaint</button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <LoadingSpinner /> : complaints.length === 0 ? (
            <div className="empty-state"><div className="icon"><Icon name="clipboard" size={48} /></div><h3>No complaints yet</h3><p>Submit a complaint using the button above.</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {complaints.map((c) => (
                  <div key={c.id} style={{ padding: '16px 20px', border: '1px solid var(--gray-200)', borderRadius: 8, cursor: 'pointer' }} onClick={() => { setSelected(c); setViewModal(true); }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{c.subject}</span>
                        {c.case && <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 10 }}>Case: {c.case.caseNumber}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge ${statusColors[c.status] || 'badge-pending'}`}>{c.status.replace('_', ' ')}</span>
                        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>{c.description.substring(0, 100)}{c.description.length > 100 ? '…' : ''}</p>
                    {c.response && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 6, fontSize: 13 }}>
                        <strong>Response:</strong> {c.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={pagination.page} total={pagination.total} limit={pagination.limit} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Submit Complaint"
        footer={<><button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Complaint'}</button></>}>
        <div className="form-group"><label className="form-label">Related Case (optional)</label><select className="form-control" value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })}><option value="">Not case-specific</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Subject *</label><input className="form-control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief subject of your complaint" /></div>
        <div className="form-group"><label className="form-label">Description *</label><textarea className="form-control" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your complaint in detail…" /></div>
      </Modal>

      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={selected?.subject}>
        {selected && (
          <div>
            <div className="info-grid" style={{ marginBottom: 16 }}>
              <div className="info-item"><label>Status</label><span><span className={`badge ${statusColors[selected.status] || 'badge-pending'}`}>{selected.status.replace('_', ' ')}</span></span></div>
              <div className="info-item"><label>Submitted</label><span>{new Date(selected.createdAt).toLocaleDateString()}</span></div>
              {selected.case && <div className="info-item"><label>Case</label><span>{selected.case.caseNumber}</span></div>}
            </div>
            <div className="form-group"><label className="form-label">Your Complaint</label><p style={{ color: 'var(--gray-700)', fontSize: 13.5 }}>{selected.description}</p></div>
            {selected.response && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--success-bg)', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Official Response</div>
                <p style={{ fontSize: 13.5, color: 'var(--gray-700)' }}>{selected.response}</p>
                {selected.respondedAt && <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>{new Date(selected.respondedAt).toLocaleDateString()}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
