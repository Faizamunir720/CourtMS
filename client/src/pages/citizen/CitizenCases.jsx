import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function CitizenCases() {
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hearings, setHearings] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const data = await caseService.getAll({ limit: 50 });
      setCases(data.cases);
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, []);

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
        <div><h1>My Cases</h1><p>Track the status of your legal cases</p></div>
      </div>

      {loading ? <LoadingSpinner /> : cases.length === 0 ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="icon"><Icon name="folder" size={48} /></div>
            <h3>No cases found</h3>
            <p>Your cases will appear here once linked by the court administration.</p>
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
                      <div className="info-item"><label>Respondent</label><span>{c.respondent}</span></div>
                      <div className="info-item"><label>Filed Date</label><span>{formatDate(c.filedDate)}</span></div>
                      <div className="info-item"><label>Your Lawyer</label><span>{c.lawyer?.name || '—'}</span></div>
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
