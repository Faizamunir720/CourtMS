import React, { useState, useEffect } from 'react';
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

export default function CitizenDocuments() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await documentService.getAll({ page: pagination.page, limit: pagination.limit });
      setDocs(data.documents);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast?.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page]);

  return (
    <div>
      <div className="page-header">
        <div><h1>My Documents</h1><p>View and download case documents</p></div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <LoadingSpinner /> : (
            <>
              {docs.length === 0 ? (
                <div className="empty-state"><div className="icon"><Icon name="file" size={48} /></div><h3>No documents available</h3><p>Documents related to your cases will appear here.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {docs.map((d) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--white)' }}>
                      <div style={{ color: "var(--forest-mid)" }}><Icon name="file" size={28} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.originalName}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                          Case: {d.case?.caseNumber || '—'} &bull; {d.documentCategory} &bull; {fmtSize(d.fileSize)} &bull; {new Date(d.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <a className="btn btn-sm btn-primary" href={documentService.download(d.id)} download>Download</a>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={pagination.page} total={pagination.total} limit={pagination.limit} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
