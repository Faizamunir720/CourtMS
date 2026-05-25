import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Blocks clerks from admin-only pages (users, analytics, audit logs). */
export default function AdminOnlyRoute({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}
