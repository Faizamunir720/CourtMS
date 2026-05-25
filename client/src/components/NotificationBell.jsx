import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { notificationService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function getNotifPath(user) {
  if (!user) return '/';
  if (user.role === 'admin' || user.role === 'clerk') return '/admin/notifications';
  if (user.role === 'lawyer') return '/lawyer/notifications';
  if (user.role === 'judge') return '/judge/notifications';
  return '/citizen/notifications';
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  async function fetchNotifs() {
    try {
      const data = await notificationService.getAll({ limit: 8 });
      setNotifications(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return function cleanup() {
      clearInterval(interval);
    };
  }, []);

  async function handleMarkRead(id, e) {
    e.stopPropagation();
    try {
      await notificationService.markRead(id);
      fetchNotifs();
    } catch (err) {
      console.log(err);
    }
  }

  async function handleMarkAll() {
    try {
      await notificationService.markAllRead();
      fetchNotifs();
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="notif-bell">
      <button className="notif-btn" type="button" onClick={() => setOpen(!open)}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h4>Notifications {unread > 0 ? '(' + unread + ')' : ''}</h4>
            {unread > 0 && (
              <button className="btn btn-sm btn-secondary" type="button" onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={'notif-item' + (!n.isRead ? ' unread' : '')}
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
              type="button"
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
