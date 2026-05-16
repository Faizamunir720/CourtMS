import React, { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon';
import { notificationService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getNotifPath(user) {
  if (!user) return '/';
  const r = user.role;
  if (r === 'admin' || r === 'clerk') return '/admin/notifications';
  if (r === 'lawyer') return '/lawyer/notifications';
  if (r === 'judge') return '/judge/notifications';
  return '/citizen/notifications';
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  async function fetchNotifs() {
    try {
      const data = await notificationService.getAll({ limit: 8 });
      setNotifications(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  }

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleMarkRead(id, e) {
    e.stopPropagation();
    try {
      await notificationService.markRead(id);
      fetchNotifs();
    } catch {}
  }

  async function handleMarkAll() {
    try {
      await notificationService.markAllRead();
      fetchNotifs();
    } catch {}
  }

  return (
    <div className="notif-bell" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(!open)}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h4>Notifications {unread > 0 && `(${unread})`}</h4>
            {unread > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                onClick={(e) => handleMarkRead(n.id, e)}
              >
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-msg">{n.message}</div>
                <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
              </div>
            ))
          )}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--gray-200)', textAlign: 'center' }}>
            <button
              className="btn btn-sm btn-secondary"
              style={{ width: '100%' }}
              onClick={() => { setOpen(false); navigate(getNotifPath(user)); }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
