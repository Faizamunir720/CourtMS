import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { hearingService, caseService, userService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function AdminHearings() {
  const toast = useToast();
  const [hearings, setHearings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '' });
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [judges, setJudges] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ caseId: '', hearingDate: '', hearingTime: '', location: '', description: '', judgeId: '' });

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
  useEffect(() => {
    caseService.getAll({ limit: 100 }).then((d) => setCases(d.cases)).catch(() => {});
    userService.getAll({ role: 'judge', limit: 100 }).then((d) => setJudges(d.users)).catch(() => {});
  }, []);

  async function handleCreate() {
    setSaving(true);
    try {
      await hearingService.create(form);
      toast?.show('Hearing scheduled successfully', 'success');
      setCreateModal(false);
      setForm({ caseId: '', hearingDate: '', hearingTime: '', location: '', description: '', judgeId: '' });
      load();
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Hearing Management</h1><p>Schedule and manage court hearings</p></div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}>+ Schedule Hearing</button>
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
                  <thead><tr><th>Case</th><th>Date</th><th>Time</th><th>Location</th><th>Judge</th><th>Status</th></tr></thead>
                  <tbody>
                    {hearings.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Icon name="courthouse" size={48} /></div><h3>No hearings found</h3></div></td></tr>}
                    {hearings.map((h) => (
                      <tr key={h.id}>
                        <td><strong>{h.case?.caseNumber}</strong><br /><small style={{ color: 'var(--gray-500)' }}>{h.case?.title}</small></td>
                        <td>{formatDate(h.hearingDate)}</td>
                        <td>{h.hearingTime}</td>
                        <td>{h.location}</td>
                        <td>{h.judge?.name || '—'}</td>
                        <td><StatusBadge status={h.status} /></td>
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

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Schedule Hearing" large
        footer={<><button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Scheduling…' : 'Schedule'}</button></>}>
        <div className="form-group"><label className="form-label">Case *</label><select className="form-control" value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })}><option value="">Select Case</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Judge *</label><select className="form-control" value={form.judgeId} onChange={(e) => setForm({ ...form, judgeId: e.target.value })}><option value="">Select Judge</option>{judges.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" value={form.hearingDate} onChange={(e) => setForm({ ...form, hearingDate: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Time * (HH:MM)</label><input className="form-control" type="time" value={form.hearingTime} onChange={(e) => setForm({ ...form, hearingTime: e.target.value })} /></div>
        </div>
        <div className="form-group"><label className="form-label">Location *</label><input className="form-control" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Courtroom 3, Building A" /></div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </Modal>
    </div>
  );
}
