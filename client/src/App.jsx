import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

import AdminLayout from './layouts/AdminLayout';
import StaffDashboard from './components/StaffDashboard';
import AdminOnlyRoute from './components/AdminOnlyRoute';
import AdminUsers from './pages/admin/AdminUsers';
import ClerkCases from './pages/clerk/ClerkCases';
import ClerkOnlyRoute from './components/ClerkOnlyRoute';
import AdminHearings from './pages/admin/AdminHearings';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminComplaints from './pages/admin/AdminComplaints';

import LawyerLayout from './layouts/LawyerLayout';
import LawyerDashboard from './pages/lawyer/LawyerDashboard';
import LawyerCases from './pages/lawyer/LawyerCases';
import LawyerHearings from './pages/lawyer/LawyerHearings';
import LawyerDocuments from './pages/lawyer/LawyerDocuments';
import LawyerComplaints from './pages/lawyer/LawyerComplaints';
import LawyerNotifications from './pages/lawyer/LawyerNotifications';

import JudgeLayout from './layouts/JudgeLayout';
import JudgeDashboard from './pages/judge/JudgeDashboard';
import JudgeHearings from './pages/judge/JudgeHearings';
import JudgeCalendar from './pages/judge/JudgeCalendar';
import JudgeNotifications from './pages/judge/JudgeNotifications';

import CitizenLayout from './layouts/CitizenLayout';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CitizenCases from './pages/citizen/CitizenCases';
import CitizenDocuments from './pages/citizen/CitizenDocuments';
import CitizenComplaints from './pages/citizen/CitizenComplaints';
import CitizenNotifications from './pages/citizen/CitizenNotifications';

import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.role === 'clerk') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'lawyer') return <Navigate to="/lawyer/dashboard" replace />;
  if (user.role === 'judge') return <Navigate to="/judge/dashboard" replace />;
  if (user.role === 'citizen') return <Navigate to="/citizen/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<RoleRedirect />} />

      <Route path="/admin" element={<ProtectedRoute roles={['admin', 'clerk']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="cases" element={<ClerkOnlyRoute><ClerkCases /></ClerkOnlyRoute>} />
        <Route path="hearings" element={<ClerkOnlyRoute><AdminHearings /></ClerkOnlyRoute>} />
        <Route path="documents" element={<ClerkOnlyRoute><AdminDocuments /></ClerkOnlyRoute>} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="users" element={<AdminOnlyRoute><AdminUsers /></AdminOnlyRoute>} />
        <Route path="analytics" element={<AdminOnlyRoute><AdminAnalytics /></AdminOnlyRoute>} />
        <Route path="audit-logs" element={<AdminOnlyRoute><AdminAuditLogs /></AdminOnlyRoute>} />
      </Route>

      <Route path="/lawyer" element={<ProtectedRoute roles={['lawyer']}><LawyerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<LawyerDashboard />} />
        <Route path="cases" element={<LawyerCases />} />
        <Route path="hearings" element={<LawyerHearings />} />
        <Route path="documents" element={<LawyerDocuments />} />
        <Route path="complaints" element={<LawyerComplaints />} />
        <Route path="notifications" element={<LawyerNotifications />} />
      </Route>

      <Route path="/judge" element={<ProtectedRoute roles={['judge']}><JudgeLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<JudgeDashboard />} />
        <Route path="hearings" element={<JudgeHearings />} />
        <Route path="calendar" element={<JudgeCalendar />} />
        <Route path="notifications" element={<JudgeNotifications />} />
      </Route>

      <Route path="/citizen" element={<ProtectedRoute roles={['citizen']}><CitizenLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CitizenDashboard />} />
        <Route path="cases" element={<CitizenCases />} />
        <Route path="documents" element={<CitizenDocuments />} />
        <Route path="complaints" element={<CitizenComplaints />} />
        <Route path="notifications" element={<CitizenNotifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
