import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { documentService, caseService } from '../../services/api';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const categories = ['petition', 'evidence', 'other'];

export default function LawyerDocuments() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [uploadModal, setUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ caseId: '', documentCategory: 'other', description: '' });
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await documentService.getAll({ page: pagination.page, limit: pagination.limit });
      setDocs(data.documents);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page]);
  useEffect(() => { caseService.getAll({ limit: 100 }).then((d) => setCases(d.cases)).catch(() => {}); }, []);

  async function handleDownload(doc) {
    try {
      await documentService.downloadFile(doc.id, doc.originalName);
    } catch (err) {
      toast.show(err.message, 'error');
    }
  }

  async function handleUpload() {
    if (!file || !form.caseId) { toast.show('File and case are required', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('caseId', form.caseId);
      fd.append('documentCategory', form.documentCategory);
      fd.append('description', form.description);
      await documentService.upload(fd);
      toast.show('Document uploaded', 'success');
      setUploadModal(false);
      setFile(null);
      load();
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setUploading(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <p>Upload petitions, affidavits, and evidence for cases you represent</p>
        </div>
        <button className="btn btn-primary" onClick={() => setUploadModal(true)}>+ Upload Document</button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Real court flow:</strong> The lawyer files the plaint, vakalatnama, and evidence here after the citizen/lawyer submits the case. The clerk later adds official court notices and orders.
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>File</th><th>Case</th><th>Category</th><th>Uploaded by</th><th>Size</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {docs.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="icon"><Icon name="file" size={48} /></div><h3>No documents on your cases</h3></div></td></tr>}
                    {docs.map((d) => (
                      <tr key={d.id}>
                        <td><Icon name="file" size={16} /> {d.originalName}</td>
                        <td>{d.case?.caseNumber || '—'}</td>
                        <td><span className="badge badge-scheduled" style={{ textTransform: 'capitalize' }}>{d.documentCategory}</span></td>
                        <td><span className={`badge badge-${d.uploadedBy?.role || 'lawyer'}`}>{d.uploadedBy?.name || '—'} ({d.uploadedBy?.role})</span></td>
                        <td>{fmtSize(d.fileSize)}</td>
                        <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                        <td><button type="button" className="btn btn-sm btn-secondary" onClick={() => handleDownload(d)}>Download</button></td>
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

      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document"
        footer={<><button className="btn btn-secondary" onClick={() => setUploadModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button></>}>
        <div className="form-group"><label className="form-label">Case *</label><select className="form-control" value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })}><option value="">Select Case</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber} — {c.title}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Category</label><select className="form-control" value={form.documentCategory} onChange={(e) => setForm({ ...form, documentCategory: e.target.value })}>{categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Description</label><input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="form-group">
          <label className="form-label">File *</label>
          <div className="upload-area" onClick={() => document.getElementById('lawyer-file-input').click()}>
            <div style={{ color: "var(--forest-mid)" }}><Icon name="folder" size={32} /></div>
            <p>{file ? file.name : 'Click to choose a file'}</p>
          </div>
          <input id="lawyer-file-input" type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={(e) => setFile(e.target.files[0])} />
        </div>
      </Modal>
    </div>
  );
}
