import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppShell from './components/AppShell';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminStaff from './pages/admin/AdminStaff';
import AdminStudents from './pages/admin/AdminStudents';
import StaffDashboard from './pages/staff/StaffDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentEvents from './pages/student/StudentEvents';
import StudentMyEvents from './pages/student/StudentMyEvents';
import StudentProfile from './pages/student/StudentProfile';
import StudentCertificates from './pages/student/StudentCertificates';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RoleHome />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminDashboard /></AppShell></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminEvents /></AppShell></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminStaff /></AppShell></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['ADMIN']}><AppShell><AdminStudents /></AppShell></ProtectedRoute>} />

          {/* Staff */}
          <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF']}><AppShell><StaffDashboard /></AppShell></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><AppShell><StudentDashboard /></AppShell></ProtectedRoute>} />
          <Route path="/student/events" element={<ProtectedRoute allowedRoles={['STUDENT']}><AppShell><StudentEvents /></AppShell></ProtectedRoute>} />
          <Route path="/student/my-events" element={<ProtectedRoute allowedRoles={['STUDENT']}><AppShell><StudentMyEvents /></AppShell></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><AppShell><StudentProfile /></AppShell></ProtectedRoute>} />
          <Route path="/student/certificates" element={<ProtectedRoute allowedRoles={['STUDENT']}><AppShell><StudentCertificates /></AppShell></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
