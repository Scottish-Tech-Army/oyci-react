import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import EventsListPage from './pages/admin/EventsListPage';
import EventCreatePage from './pages/admin/EventCreatePage';
import EventSchedulePage from './pages/admin/EventSchedulePage';
import StaffListPage from './pages/admin/StaffListPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffQualificationsPage from './pages/staff/StaffQualificationsPage';
import StaffAvailabilityPage from './pages/staff/StaffAvailabilityPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Admin routes */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route element={<AppShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/events" element={<EventsListPage />} />
                <Route path="/admin/events/new" element={<EventCreatePage />} />
                <Route path="/admin/events/:eventId/schedule" element={<EventSchedulePage />} />
                <Route path="/admin/staff" element={<StaffListPage />} />
              </Route>
            </Route>

            {/* Staff routes */}
            <Route element={<ProtectedRoute requiredRole="staff" />}>
              <Route element={<AppShell />}>
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/staff/qualifications" element={<StaffQualificationsPage />} />
                <Route path="/staff/availability" element={<StaffAvailabilityPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
