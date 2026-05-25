import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ClerkDashboard from '../pages/clerk/ClerkDashboard';

/** Shows admin or clerk dashboard based on logged-in role. */
export default function StaffDashboard() {
  const { user } = useAuth();
  if (user && user.role === 'clerk') return <ClerkDashboard />;
  if (user && user.role === 'admin') return <AdminDashboard />;
  return <Navigate to="/login" replace />;
}
