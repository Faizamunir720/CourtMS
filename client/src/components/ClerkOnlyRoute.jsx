import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Court operations (cases, hearings, etc.) — clerks only; admins are redirected. */
export default function ClerkOnlyRoute({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'clerk') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}
