import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

const emptyForm = {
  title: '',
  description: '',
  applicant: '',
  respondent: '',
  caseType: 'civil',
  filedDate: new Date().toISOString().slice(0, 10),
};

export default function CitizenCases() {
  const toast = useToast();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
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
      const data = await caseService.getAll({ limit: 50 });
      setCases(data.cases);
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, []);

  function openFileModal() {
    setForm({
      ...emptyForm,
      applicant: user && user.name ? user.name : '',
      filedDate: new Date().toISOString().slice(0, 10),
    });
    setFileModal(true);
  }

  async function handleSubmit() {
    if (!form.title || !form.description || !form.applicant || !form.respondent) {
      toast.show('Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await caseService.submit(form);
      toast.show('Case submitted. A clerk will review and register it.', 'success');
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
          <p>File a new case or track status after clerk registration</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openFileModal}>+ File New Case</button>
      </div>

      {loading ? <LoadingSpinner /> : cases.length === 0 ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="icon"><Icon name="folder" size={48} /></div>
            <h3>No cases yet</h3>
            <p>Use <strong>File New Case</strong> to submit a dispute. Status will be <strong>Submitted</strong> until a clerk registers it.</p>
          </div>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cases.map((c) => (
            <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openDetail(c)}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>{c.caseNumber}</span>
                      <StatusBadge status={c.status} />
                      <span className="badge badge-ongoing" style={{ textTransform: 'capitalize' }}>{c.caseType}</span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{c.title}</h3>
                    <div className="info-grid">
                      <div className="info-item"><label>Applicant</label><span>{c.applicant}</span></div>
                      <div className="info-item"><label>Respondent (Defendant)</label><span>{c.respondent}</span></div>
                      <div className="info-item"><label>Filed Date</label><span>{formatDate(c.filedDate)}</span></div>
                      <div className="info-item"><label>Your Lawyer</label><span>{c.lawyer?.name || <em style={{ color: 'var(--gray-500)' }}>Not assigned yet — clerk assigns at registration</em>}</span></div>
                      <div className="info-item"><label>Filed by</label><span style={{ textTransform: 'capitalize' }}>{c.submittedByRole === 'lawyer' ? 'Your lawyer' : 'You (self)'}</span></div>
                      <div className="info-item"><label>Assigned Judge</label><span>{c.judge?.name || 'Not yet assigned'}</span></div>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(c); }}>View Timeline →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={fileModal} onClose={() => setFileModal(false)} title="File New Case" large
        footer={<><button className="btn btn-secondary" onClick={() => setFileModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Case'}</button></>}>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
          You are filing <strong>without a lawyer</strong> (self-represented). The clerk will register your case and can <strong>assign a lawyer</strong> at that step if you hire one later.
          If a lawyer files for you, they must select your citizen account — the case will then appear here automatically.
        </p>
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
          <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Property ownership dispute" />
        </div>
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the dispute…" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Applicant (You) *</label>
            <input className="form-control" value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Respondent (Defendant) *</label>
            <input className="form-control" value={form.respondent} onChange={(e) => setForm({ ...form, respondent: e.target.value })} placeholder="Ahmed" />
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title={`Case Timeline — ${selected?.caseNumber}`} large>
        {selected && (
          <div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>{selected.title}</h3>
              <div className="info-grid">
                <div className="info-item"><label>Status</label><span><StatusBadge status={selected.status} /></span></div>
                <div className="info-item"><label>Type</label><span style={{ textTransform: 'capitalize' }}>{selected.caseType}</span></div>
                <div className="info-item"><label>Lawyer</label><span>{selected.lawyer?.name || '—'}</span></div>
                <div className="info-item"><label>Judge</label><span>{selected.judge?.name || 'Not assigned'}</span></div>
              </div>
            </div>

            <h4 style={{ marginBottom: 14 }}>Hearing History</h4>
            {hearings.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No hearings have been scheduled yet.</p>
            ) : (
              <div className="timeline">
                {hearings.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" style={{ background: h.status === 'Completed' ? 'var(--success)' : h.status === 'Scheduled' ? 'var(--accent)' : 'var(--warning)' }} />
                    <div className="timeline-date">{formatDate(h.hearingDate)} at {h.hearingTime}</div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        {h.location} — <StatusBadge status={h.status} />
                        {h.judge && <span style={{ color: 'var(--gray-500)', fontSize: 12, marginLeft: 8 }}>Judge: {h.judge.name}</span>}
                      </div>
                      {h.description && <div className="timeline-desc">{h.description}</div>}
                      {h.outcome && <div className="timeline-desc" style={{ marginTop: 6, background: 'var(--success-bg)', padding: '6px 10px', borderRadius: 4 }}><strong>Outcome:</strong> {h.outcome}</div>}
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
