import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/Icon';
import { documentService } from '../../services/api';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function roleLabel(role) {
  if (role === 'lawyer') return 'Your lawyer';
  if (role === 'clerk') return 'Court registry';
  if (role === 'citizen') return 'You';
  return role || '';
}

export default function CitizenDocuments() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 50 });
  const [loading, setLoading] = useState(true);

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

  const grouped = useMemo(() => {
    const map = new Map();
    docs.forEach((d) => {
      const key = d.case?.caseNumber || 'Unknown';
      if (!map.has(key)) {
        map.set(key, { caseInfo: d.case, items: [] });
      }
      map.get(key).items.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs]);

  async function handleDownload(doc) {
    try {
      await documentService.downloadFile(doc.id, doc.originalName);
    } catch (err) {
      toast.show(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Documents</h1>
          <p>Only documents for cases where you are the registered citizen party</p>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Your case file:</strong> Filings from your assigned lawyer appear first; hearing notices and orders are uploaded by the court clerk after registration.
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <LoadingSpinner /> : docs.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><Icon name="file" size={48} /></div>
              <h3>No documents on your cases</h3>
              <p>When your lawyer or the registry uploads papers, they will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {grouped.map(([caseNumber, group]) => (
                <div key={caseNumber}>
                  <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid var(--gray-200)' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{caseNumber}</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>{group.caseInfo?.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      <span>Status: <strong>{group.caseInfo?.status}</strong></span>
                      {group.caseInfo?.lawyer && (
                        <span>Counsel: <strong>{group.caseInfo.lawyer.name}</strong> ({group.caseInfo.lawyer.email})</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {group.items.map((d) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                        <div style={{ color: 'var(--forest-mid)' }}><Icon name="file" size={24} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{d.originalName}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                            <span className={`badge badge-${d.uploadedBy?.role === 'clerk' ? 'clerk' : 'lawyer'}`} style={{ marginRight: 8 }}>
                              {roleLabel(d.uploadedBy?.role)}
                            </span>
                            {d.documentCategory} &bull; {d.uploadedBy?.name} &bull; {fmtSize(d.fileSize)}
                          </div>
                          {d.description && (
                            <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>{d.description}</div>
                          )}
                        </div>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => handleDownload(d)}>Download</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
