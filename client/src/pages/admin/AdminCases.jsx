import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { caseService, userService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function AdminCases() {
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ status: '', caseType: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [judges, setJudges] = useState([]);
  const [lawyers, setLawyers] = useState([]);

  const [createModal, setCreateModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [judgeId, setJudgeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({ caseNumber: '', title: '', description: '', applicant: '', respondent: '', caseType: 'civil', filedDate: '', lawyerId: '' });

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
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);
  useEffect(() => {
    userService.getAll({ role: 'judge', limit: 100 }).then((d) => setJudges(d.users)).catch(() => {});
    userService.getAll({ role: 'lawyer', limit: 100 }).then((d) => setLawyers(d.users)).catch(() => {});
  }, []);

  async function handleCreate() {
    setSaving(true);
    try {
      await caseService.create(createForm);
      toast?.show('Case created successfully', 'success');
      setCreateModal(false);
      setCreateForm({ caseNumber: '', title: '', description: '', applicant: '', respondent: '', caseType: 'civil', filedDate: '', lawyerId: '' });
      load();
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleAssign() {
    if (!judgeId) { toast?.show('Select a judge', 'error'); return; }
    setSaving(true);
    try {
      await caseService.assignJudge(selectedCase.id, judgeId);
      toast?.show('Judge assigned successfully', 'success');
      setAssignModal(false);
      load();
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Case Management</h1><p>Manage all court cases</p></div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}>+ New Case</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span className="search-icon-wrap" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={16} /></span>
              <input className="form-control" placeholder="Search cases…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ paddingLeft: 36 }} />
            </div>
            <select className="form-control" style={{ minWidth: 130 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option>Pending</option><option>Ongoing</option><option>Closed</option>
            </select>
            <select className="form-control" style={{ minWidth: 130 }} value={filters.caseType} onChange={(e) => setFilters({ ...filters, caseType: e.target.value })}>
              <option value="">All Types</option>
              <option>civil</option><option>criminal</option><option>commercial</option>
            </select>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Case #</th><th>Title</th><th>Type</th><th>Status</th><th>Lawyer</th><th>Judge</th><th>Filed</th><th>Actions</th></tr></thead>
                  <tbody>
                    {cases.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="icon"><Icon name="folder" size={48} /></div><h3>No cases found</h3></div></td></tr>}
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.caseNumber}</strong></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td><span className="badge badge-ongoing" style={{ textTransform: 'capitalize' }}>{c.caseType}</span></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>{c.lawyer?.name || '—'}</td>
                        <td>{c.judge?.name || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                        <td>{formatDate(c.filedDate)}</td>
                        <td>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedCase(c); setJudgeId(c.judge?.id || ''); setAssignModal(true); }}>
                            {c.judge ? 'Reassign' : 'Assign Judge'}
                          </button>
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

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Case" large
        footer={<><button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Case'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Case Number *</label><input className="form-control" value={createForm.caseNumber} onChange={(e) => setCreateForm({ ...createForm, caseNumber: e.target.value })} placeholder="CASE-2024-001" /></div>
          <div className="form-group"><label className="form-label">Case Type *</label><select className="form-control" value={createForm.caseType} onChange={(e) => setCreateForm({ ...createForm, caseType: e.target.value })}><option value="civil">Civil</option><option value="criminal">Criminal</option><option value="commercial">Commercial</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">Title *</label><input className="form-control" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Description *</label><textarea className="form-control" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Applicant *</label><input className="form-control" value={createForm.applicant} onChange={(e) => setCreateForm({ ...createForm, applicant: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Respondent *</label><input className="form-control" value={createForm.respondent} onChange={(e) => setCreateForm({ ...createForm, respondent: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Filed Date *</label><input className="form-control" type="date" value={createForm.filedDate} onChange={(e) => setCreateForm({ ...createForm, filedDate: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Assign Lawyer *</label><select className="form-control" value={createForm.lawyerId} onChange={(e) => setCreateForm({ ...createForm, lawyerId: e.target.value })}><option value="">Select Lawyer</option>{lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        </div>
      </Modal>

      <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title={`Assign Judge — ${selectedCase?.caseNumber}`}
        footer={<><button className="btn btn-secondary" onClick={() => setAssignModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAssign} disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</button></>}>
        <div className="form-group"><label className="form-label">Select Judge</label><select className="form-control" value={judgeId} onChange={(e) => setJudgeId(e.target.value)}><option value="">— Select a judge —</option>{judges.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
      </Modal>
    </div>
  );
}
