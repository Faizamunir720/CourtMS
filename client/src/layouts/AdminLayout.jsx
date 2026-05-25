import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import SidebarLink from '../components/SidebarLink';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { ToastProvider } from '../components/Toast';
import Icon from '../components/Icon';

const clerkNavItems = [
  { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/admin/cases', icon: 'folder', label: 'Cases' },
  { to: '/admin/hearings', icon: 'courthouse', label: 'Hearings' },
  { to: '/admin/documents', icon: 'file', label: 'Documents' },
  { to: '/admin/complaints', icon: 'clipboard', label: 'Registry Inquiries' },
  { to: '/admin/notifications', icon: 'bell', label: 'Notifications' },
];

const adminNavItems = [
  { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/admin/complaints', icon: 'clipboard', label: 'Service Requests' },
  { to: '/admin/users', icon: 'users', label: 'Users' },
  { to: '/admin/analytics', icon: 'chart', label: 'Analytics' },
  { to: '/admin/audit-logs', icon: 'search', label: 'Audit Logs' },
  { to: '/admin/notifications', icon: 'bell', label: 'Notifications' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isClerk = user && user.role === 'clerk';
  const navItems = isClerk ? clerkNavItems : adminNavItems;

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <ToastProvider>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h2><Icon name="scales" size={20} className="logo-icon" /> CourtMS</h2>
            <span>{isClerk ? 'Clerk Portal' : 'Admin Portal'}</span>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <SidebarLink key={item.to} to={item.to}>
                <span className="icon"><Icon name={item.icon} size={18} /></span>
                {item.label}
              </SidebarLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{user && user.name ? user.name[0].toUpperCase() : ''}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user ? user.name : ''}</div>
                <div className="sidebar-user-role">{user ? user.role : ''}</div>
              </div>
              <button className="logout-btn" title="Logout" onClick={handleLogout} type="button">
                <Icon name="logout" size={18} />
              </button>
            </div>
          </div>
        </aside>
        <div className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <span className="topbar-title">
                {isClerk
                  ? 'Clerk Portal — register cases, schedule hearings, manage documents'
                  : 'Admin Portal — service requests (portal/escalation), users, analytics, audit logs'}
              </span>
            </div>
            <div className="topbar-right">
              <NotificationBell />
            </div>
          </header>
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
