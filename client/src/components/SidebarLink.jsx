import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/** Sidebar link with active class — uses useLocation (routing), no advanced patterns. */
export default function SidebarLink({ to, children }) {
  const location = useLocation();
  let className = 'sidebar-link';
  if (location.pathname === to) {
    className = 'sidebar-link active';
  }

  return (
    <NavLink to={to} className={className}>
      {children}
    </NavLink>
  );
}
