import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService, userService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

const STATUS_OPTIONS = ['', 'Submitted', 'Registered', 'Hearing Scheduled', 'Ongoing', 'Adjourned', 'Closed'];

const emptyForm = {
  citizenId: '',
  title: '',
  description: '',
  applicant: '',
  respondent: '',
  caseType: 'civil',
  filedDate: new Date().toISOString().slice(0, 10),
};

export default function LawyerCases() {
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [fileModal, setFileModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
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
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  useEffect(() => {
    userService.getAll({ role: 'citizen', limit: 100 }).then((d) => setCitizens(d.users)).catch(() => {});
  }, []);

  function openFileModal() {
    setForm({ ...emptyForm, filedDate: new Date().toISOString().slice(0, 10) });
    setFileModal(true);
  }

  function onCitizenChange(citizenId) {
    const citizen = citizens.find((c) => c.id === citizenId);
    setForm({
      ...form,
      citizenId,
      applicant: citizen ? citizen.name : form.applicant,
    });
  }

  async function handleSubmit() {
    if (!form.citizenId) {
      toast.show('Select the citizen client (portal account) this case is for', 'error');
      return;
    }
    if (!form.title || !form.description || !form.applicant || !form.respondent) {
      toast.show('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await caseService.submit(form);
      toast.show('Case filed for client. They will see it in their citizen portal.', 'success');
      setFileModal(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

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
        <div>
          <h1>My Cases</h1>
          <p>Cases you filed for clients — linked to their citizen portal account</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openFileModal}>+ File Case for Client</button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Lawyer filing:</strong> You must select the client&apos;s <strong>registered citizen account</strong> (not just type their name).
        The case then appears in that citizen&apos;s My Cases and Documents. The clerk registers it and may schedule hearings.
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span className="search-icon-wrap" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={16} /></span>
              <input className="form-control" placeholder="Search cases…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ paddingLeft: 36 }} />
            </div>
            <select className="form-control" style={{ minWidth: 140 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Client (Citizen)</th><th>Status</th><th>Judge</th><th>Filed</th><th>Actions</th></tr></thead>
                  <tbody>
                    {cases.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="icon"><Icon name="folder" size={48} /></div><h3>No cases found</h3></div></td></tr>}
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.caseNumber}</strong></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td>{c.citizen?.name || '—'}<br /><small style={{ color: 'var(--gray-500)' }}>{c.citizen?.email}</small></td>
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

      <Modal isOpen={fileModal} onClose={() => setFileModal(false)} title="File Case for Client" large
        footer={<><button className="btn btn-secondary" onClick={() => setFileModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Case'}</button></>}>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
          Link this case to a <strong>citizen portal user</strong> so they can track it. Typing a name alone does not connect the case.
        </p>
        <div className="form-group">
          <label className="form-label">Citizen Client (portal account) *</label>
          <select className="form-control" value={form.citizenId} onChange={(e) => onCitizenChange(e.target.value)}>
            <option value="">Select citizen…</option>
            {citizens.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Case Type *</label>
            <select className="form-control" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })}>
              <option value="civil">Civil</option>
              <option value="criminal">Criminal</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Filed Date *</label>
            <input className="form-control" type="date" value={form.filedDate} onChange={(e) => setForm({ ...form, filedDate: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Case Title *</label>
          <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Applicant (legal party name) *</label>
            <input className="form-control" value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} placeholder="Usually your client&apos;s name" />
          </div>
          <div className="form-group">
            <label className="form-label">Respondent (Defendant) *</label>
            <input className="form-control" value={form.respondent} onChange={(e) => setForm({ ...form, respondent: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title={`Case: ${selected?.caseNumber}`} large>
        {selected && (
          <div>
            <div className="info-grid" style={{ marginBottom: 20 }}>
              <div className="info-item"><label>Title</label><span>{selected.title}</span></div>
              <div className="info-item"><label>Status</label><span><StatusBadge status={selected.status} /></span></div>
              <div className="info-item"><label>Client</label><span>{selected.citizen?.name || '—'}</span></div>
              <div className="info-item"><label>Judge</label><span>{selected.judge?.name || 'Not assigned'}</span></div>
              <div className="info-item"><label>Applicant</label><span>{selected.applicant}</span></div>
              <div className="info-item"><label>Respondent</label><span>{selected.respondent}</span></div>
            </div>
            <h4 style={{ marginBottom: 10 }}>Hearings Timeline</h4>
            {hearings.length === 0 ? <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No hearings scheduled</p> : (
              <div className="timeline">
                {hearings.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" />
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
