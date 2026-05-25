import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService, userService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

const STATUS_OPTIONS = ['', 'Submitted', 'Registered', 'Hearing Scheduled', 'Ongoing', 'Adjourned', 'Closed'];

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

/** Uses submittedByRole, or API filedBy fallback when DB field was missing after migrate */
function howFiled(c) {
  if (!c) return null;
  if (c.submittedByRole === 'lawyer') return 'lawyer';
  if (c.submittedByRole === 'citizen') {
    if (c.lawyer && String(c.caseNumber || '').startsWith('SUB-')) return 'lawyer';
    return 'citizen';
  }
  if (c.filedBy === 'lawyer') return 'lawyer';
  if (c.filedBy === 'citizen') return 'citizen';
  if (c.lawyer) return 'lawyer';
  return 'citizen';
}

function filedByLabel(c) {
  const role = howFiled(c);
  if (role === 'lawyer') return 'Lawyer for client';
  if (role === 'citizen') return 'Citizen (self)';
  return '—';
}

function suggestCaseNumber(caseType) {
  const prefix = caseType === 'criminal' ? 'CR' : caseType === 'commercial' ? 'COM' : 'CIV';
  const year = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${year}-${n}`;
}

function getDefaultRepresentation(c) {
  if (howFiled(c) === 'lawyer' && c.lawyer) return 'confirm_counsel';
  return 'pro_se';
}

export default function ClerkCases() {
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: 'Submitted', caseType: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState([]);
  const [registerModal, setRegisterModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [registerForm, setRegisterForm] = useState({ caseNumber: '', lawyerId: '' });
  const [representation, setRepresentation] = useState('pro_se');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.caseType) params.caseType = filters.caseType;
      if (filters.search) params.search = filters.search;
      const data = await caseService.getAll(params);
      setCases(data.cases);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  useEffect(() => {
    userService.getAll({ role: 'lawyer', limit: 100 }).then((d) => setLawyers(d.users)).catch(() => {});
  }, []);

  function openRegister(c) {
    const defaultRep = getDefaultRepresentation(c);
    setSelectedCase(c);
    setRepresentation(defaultRep);
    setRegisterForm({
      caseNumber: '',
      lawyerId: c.lawyer ? c.lawyer.id : '',
    });
    setRegisterModal(true);
  }

  function onRepresentationChange(value) {
    setRepresentation(value);
    if (value === 'confirm_counsel' && selectedCase && selectedCase.lawyer) {
      setRegisterForm((f) => ({ ...f, lawyerId: selectedCase.lawyer.id }));
    }
    if (value === 'pro_se') {
      setRegisterForm((f) => ({ ...f, lawyerId: '' }));
    }
  }

  async function handleRegister() {
    if (!registerForm.caseNumber.trim()) {
      toast.show('Enter the official court case number', 'error');
      return;
    }

    const payload = {
      caseNumber: registerForm.caseNumber.trim(),
      representation,
    };

    if (howFiled(selectedCase) === 'lawyer' && selectedCase.lawyer) {
      if (representation === 'confirm_counsel') {
        payload.lawyerId = selectedCase.lawyer.id;
        payload.representation = 'confirm_counsel';
      } else if (representation === 'change_counsel') {
        if (!registerForm.lawyerId || registerForm.lawyerId === selectedCase.lawyer.id) {
          toast.show('Select a different lawyer for a counsel substitution', 'error');
          return;
        }
        payload.lawyerId = registerForm.lawyerId;
        payload.changeCounsel = true;
      }
    } else if (howFiled(selectedCase) === 'citizen') {
      if (representation === 'assign_counsel') {
        if (!registerForm.lawyerId) {
          toast.show('Select the lawyer the citizen has hired', 'error');
          return;
        }
        payload.lawyerId = registerForm.lawyerId;
      } else {
        payload.representation = 'pro_se';
      }
    }

    setSaving(true);
    try {
      await caseService.register(selectedCase.id, payload);
      toast.show('Case registered successfully', 'success');
      setRegisterModal(false);
      load();
    } catch (err) {
      toast.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const filedAs = selectedCase ? howFiled(selectedCase) : null;
  const isLawyerFiled = selectedCase && filedAs === 'lawyer' && selectedCase.lawyer;
  const isCitizenSelfFiled = selectedCase && filedAs === 'citizen';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Case Registration</h1>
          <p>Review submitted filings, issue official case numbers, and record who represents the citizen</p>
        </div>
      </div>

      <div className="register-help-grid">
        <div className="register-help-card">
          <strong>Citizen filed alone</strong>
          <p>Usually <span className="text-pro-se">self-represented (pro se)</span>. Only assign a lawyer if they have hired counsel before registration.</p>
        </div>
        <div className="register-help-card">
          <strong>Lawyer filed for client</strong>
          <p>Counsel is already on record from filing. You <em>confirm</em> that lawyer — you do not pick a random one from the roster.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span className="search-icon-wrap" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <Icon name="search" size={16} />
              </span>
              <input
                className="form-control"
                placeholder="Search cases…"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select
              className="form-control"
              style={{ minWidth: 160 }}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s || 'all'} value={s}>{s || 'All Statuses'}</option>
              ))}
            </select>
            <select
              className="form-control"
              style={{ minWidth: 130 }}
              value={filters.caseType}
              onChange={(e) => setFilters({ ...filters, caseType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="civil">civil</option>
              <option value="criminal">criminal</option>
              <option value="commercial">commercial</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Temp #</th>
                      <th>Title</th>
                      <th>How filed</th>
                      <th>Citizen party</th>
                      <th>Representation</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state">
                            <div className="icon"><Icon name="folder" size={48} /></div>
                            <h3>No cases in this queue</h3>
                            <p>Change the status filter or wait for new submissions.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.caseNumber}</strong></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td>
                          <span className={`badge ${c.submittedByRole === 'lawyer' ? 'badge-lawyer' : 'badge-citizen'}`}>
                            {filedByLabel(c)}
                          </span>
                        </td>
                        <td>
                          {c.citizen ? c.citizen.name : '—'}
                          <br />
                          <small style={{ color: 'var(--gray-500)' }}>{c.citizen ? c.citizen.email : ''}</small>
                        </td>
                        <td>
                          {c.lawyer ? (
                            <span>{c.lawyer.name}</span>
                          ) : c.submittedByRole === 'citizen' ? (
                            <span className="text-pro-se">Pro se</span>
                          ) : (
                            <span style={{ color: 'var(--gray-500)' }}>—</span>
                          )}
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>
                          {c.status === 'Submitted' ? (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => openRegister(c)}>
                              Register
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Done</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pagination.page}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              />
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={registerModal}
        onClose={() => setRegisterModal(false)}
        title={selectedCase ? `Register — ${selectedCase.title}` : 'Register case'}
        large
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRegisterModal(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleRegister} disabled={saving}>
              {saving ? 'Registering…' : 'Complete registration'}
            </button>
          </>
        }
      >
        {selectedCase && (
          <div className="register-modal-body">
            {isLawyerFiled && (
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <strong>Lawyer-filed case:</strong> Scroll to <strong>Step 2</strong> — confirm counsel of record or record a rare counsel change. You should not pick a random lawyer from a single dropdown.
              </div>
            )}
            {isCitizenSelfFiled && (
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <strong>Self-filed case:</strong> Scroll to <strong>Step 2</strong> — choose <strong>pro se</strong> or assign a lawyer if the citizen hired one.
              </div>
            )}
            <div className="register-summary">
              <h3>{selectedCase.title}</h3>
              <div className="register-summary-grid">
                <div>
                  <label>Citizen party (portal account)</label>
                  <span>{selectedCase.citizen ? selectedCase.citizen.name : '—'}</span>
                  <small>{selectedCase.citizen ? selectedCase.citizen.email : ''}</small>
                </div>
                <div>
                  <label>How this was filed</label>
                  <span className={`badge ${selectedCase.submittedByRole === 'lawyer' ? 'badge-lawyer' : 'badge-citizen'}`}>
                    {filedByLabel(selectedCase)}
                  </span>
                </div>
                <div>
                  <label>Applicant on pleadings</label>
                  <span>{selectedCase.applicant}</span>
                </div>
                <div>
                  <label>Respondent</label>
                  <span>{selectedCase.respondent}</span>
                </div>
                <div>
                  <label>Case type</label>
                  <span style={{ textTransform: 'capitalize' }}>{selectedCase.caseType}</span>
                </div>
                <div>
                  <label>Filed date</label>
                  <span>{formatDate(selectedCase.filedDate)}</span>
                </div>
              </div>
            </div>

            <div className="register-step">
              <div className="register-step-head">
                <span className="register-step-num">1</span>
                <div>
                  <strong>Official case number</strong>
                  <p>Assign the number used on the court docket (replaces the temporary SUB- number).</p>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    className="form-control"
                    style={{ flex: 1, minWidth: 200 }}
                    value={registerForm.caseNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, caseNumber: e.target.value })}
                    placeholder="e.g. CIV-2026-042"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setRegisterForm({ ...registerForm, caseNumber: suggestCaseNumber(selectedCase.caseType) })}
                  >
                    Suggest number
                  </button>
                </div>
              </div>
            </div>

            <div className="register-step">
              <div className="register-step-head">
                <span className="register-step-num">2</span>
                <div>
                  <strong>Representation on the record</strong>
                  <p>What the registry records about legal counsel for this citizen.</p>
                </div>
              </div>

              {isLawyerFiled && (
                <div className="representation-panel">
                  <div className="counsel-lock-box">
                    <Icon name="user" size={20} />
                    <div>
                      <strong>Counsel of record (from filing)</strong>
                      <p>{selectedCase.lawyer.name} — filed this case for {selectedCase.citizen ? selectedCase.citizen.name : 'the client'}</p>
                    </div>
                  </div>

                  <label className="choice-row">
                    <input
                      type="radio"
                      name="rep"
                      checked={representation === 'confirm_counsel'}
                      onChange={() => onRepresentationChange('confirm_counsel')}
                    />
                    <span>
                      <strong>Confirm this lawyer</strong> (normal — same counsel continues after registration)
                    </span>
                  </label>

                  <label className="choice-row">
                    <input
                      type="radio"
                      name="rep"
                      checked={representation === 'change_counsel'}
                      onChange={() => onRepresentationChange('change_counsel')}
                    />
                    <span>
                      <strong>Record a counsel change</strong> (unusual — substitution or court order only)
                    </span>
                  </label>

                  {representation === 'change_counsel' && (
                    <div className="form-group" style={{ marginLeft: 28, marginTop: 8 }}>
                      <label className="form-label">New lawyer on record</label>
                      <select
                        className="form-control"
                        value={registerForm.lawyerId}
                        onChange={(e) => setRegisterForm({ ...registerForm, lawyerId: e.target.value })}
                      >
                        <option value="">Select new counsel…</option>
                        {lawyers
                          .filter((l) => l.id !== selectedCase.lawyer.id)
                          .map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {isCitizenSelfFiled && (
                <div className="representation-panel">
                  <label className="choice-row">
                    <input
                      type="radio"
                      name="rep"
                      checked={representation === 'pro_se'}
                      onChange={() => onRepresentationChange('pro_se')}
                    />
                    <span>
                      <strong>Self-represented (pro se)</strong> — citizen has no lawyer; they represent themselves
                    </span>
                  </label>

                  <label className="choice-row">
                    <input
                      type="radio"
                      name="rep"
                      checked={representation === 'assign_counsel'}
                      onChange={() => onRepresentationChange('assign_counsel')}
                    />
                    <span>
                      <strong>Citizen has engaged a lawyer</strong> — record who will represent them (from court roster)
                    </span>
                  </label>

                  {representation === 'assign_counsel' && (
                    <div className="form-group" style={{ marginLeft: 28, marginTop: 8 }}>
                      <label className="form-label">Lawyer to assign</label>
                      <select
                        className="form-control"
                        value={registerForm.lawyerId}
                        onChange={(e) => setRegisterForm({ ...registerForm, lawyerId: e.target.value })}
                      >
                        <option value="">Select lawyer from roster…</option>
                        {lawyers.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      <p className="form-hint">Clerks pick from registered lawyers — not every lawyer in the country, only those on this system&apos;s roster.</p>
                    </div>
                  )}
                </div>
              )}

              {!isLawyerFiled && !isCitizenSelfFiled && (
                <p className="form-hint">No representation rules apply — check case data.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
