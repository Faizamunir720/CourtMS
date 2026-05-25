import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { hearingService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function JudgeHearings() {
  const toast = useToast();
  const [hearings, setHearings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '' });
  const [loading, setLoading] = useState(true);
  const [outcomeModal, setOutcomeModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [outcomeForm, setOutcomeForm] = useState({ status: 'Completed', outcome: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      const data = await hearingService.getAll(params);
      setHearings(data.hearings);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  async function handleOutcome() {
    if (!outcomeForm.outcome) { toast.show('Outcome is required', 'error'); return; }
    setSaving(true);
    try {
      await hearingService.recordOutcome(selected.id, outcomeForm);
      toast.show('Outcome recorded successfully', 'success');
      setOutcomeModal(false);
      load();
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>My Hearings</h1><p>Manage and record hearing outcomes</p></div>
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
                  <thead><tr><th>Case</th><th>Date</th><th>Time</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {hearings.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Icon name="courthouse" size={48} /></div><h3>No hearings found</h3></div></td></tr>}
                    {hearings.map((h) => (
                      <tr key={h.id}>
                        <td><strong>{h.case?.caseNumber}</strong><br /><small style={{ color: 'var(--gray-500)' }}>{h.case?.title}</small></td>
                        <td>{formatDate(h.hearingDate)}</td>
                        <td>{h.hearingTime}</td>
                        <td>{h.location}</td>
                        <td><StatusBadge status={h.status} /></td>
                        <td>
                          {h.status === 'Scheduled' && (
                            <button className="btn btn-sm btn-primary" onClick={() => { setSelected(h); setOutcomeForm({ status: 'Completed', outcome: '', notes: '' }); setOutcomeModal(true); }}>
                              Record Outcome
                            </button>
                          )}
                          {h.status !== 'Scheduled' && h.outcome && (
                            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{h.outcome.substring(0, 40)}…</span>
                          )}
                        </td>
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

      <Modal isOpen={outcomeModal} onClose={() => setOutcomeModal(false)} title={`Record Outcome — ${selected?.case?.caseNumber}`}
        footer={<><button className="btn btn-secondary" onClick={() => setOutcomeModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleOutcome} disabled={saving}>{saving ? 'Saving…' : 'Record Outcome'}</button></>}>
        <div className="form-group">
          <label className="form-label">Hearing Status *</label>
          <select className="form-control" value={outcomeForm.status} onChange={(e) => setOutcomeForm({ ...outcomeForm, status: e.target.value })}>
            <option value="Completed">Completed</option>
            <option value="Adjourned">Adjourned</option>
            <option value="Postponed">Postponed</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Outcome *</label><textarea className="form-control" rows={3} value={outcomeForm.outcome} onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })} placeholder="Describe the hearing outcome…" /></div>
        <div className="form-group"><label className="form-label">Additional Notes</label><textarea className="form-control" rows={2} value={outcomeForm.notes} onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })} /></div>
        {outcomeForm.status === 'Completed' && <div className="alert alert-info">Note: Setting status to Completed will automatically close the associated case.</div>}
      </Modal>
    </div>
  );
}
