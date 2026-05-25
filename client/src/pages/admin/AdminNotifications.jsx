import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { notificationService } from '../../services/api';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notifIcon(type) {
  if (type === 'hearing_scheduled') return 'courthouse';
  if (type === 'case_assigned') return 'folder';
  if (type === 'document_uploaded') return 'file';
  if (type === 'case_closed') return 'check';
  return 'bell';
}

export default function AdminNotifications() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await notificationService.getAll({ page: pagination.page, limit: pagination.limit });
      setNotifications(data.notifications);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) { toast.show(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [pagination.page]);

  async function handleMarkAll() {
    try { await notificationService.markAllRead(); toast.show('All marked as read', 'success'); load(); }
    catch (err) { toast.show(err.message, 'error'); }
  }

  async function handleDelete(id) {
    try { await notificationService.delete(id); load(); }
    catch (err) { toast.show(err.message, 'error'); }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Notifications</h1><p>All your system notifications</p></div>
        <button className="btn btn-secondary" onClick={handleMarkAll}>Mark all read</button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <LoadingSpinner /> : notifications.length === 0 ? (
            <div className="empty-state"><div className="icon"><Icon name="bell" size={48} /></div><h3>No notifications</h3><p>You're all caught up!</p></div>
          ) : (
            <>
              {notifications.map((n) => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--gray-100)', background: n.isRead ? 'transparent' : '#eff6ff', borderRadius: 6, paddingLeft: n.isRead ? 0 : 12, marginBottom: 2 }}>
                  <div style={{ fontSize: 22, marginTop: 2 }}>
                    <Icon name={notifIcon(n.type)} size={18} className="notif-type-icon" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                    <div style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 2 }}>{n.message}</div>
                    <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(n.id)} type="button"><Icon name="x" size={14} /></button>
                </div>
              ))}
              <Pagination page={pagination.page} total={pagination.total} limit={pagination.limit} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
