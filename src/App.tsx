import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TagsPage from './pages/TagsPage';
import LocationsPage from './pages/LocationsPage';
import EventTypesPage from './pages/EventTypesPage';
import StaffPage from './pages/StaffPage';
import EventInstancesPage from './pages/EventInstancesPage';
import StaffSchedulePage from './pages/StaffSchedulePage';
import StaffProfilePage from './pages/StaffProfilePage';
import BrowseEventsPage from './pages/BrowseEventsPage';
import CommunicationsPage from './pages/CommunicationsPage';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
});

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/events" element={
          <RequireAuth roles={['ADMIN', 'STAFF']}><EventInstancesPage /></RequireAuth>
        } />
        <Route path="/event-types" element={
          <RequireAuth roles={['ADMIN']}><EventTypesPage /></RequireAuth>
        } />
        <Route path="/locations" element={
          <RequireAuth roles={['ADMIN']}><LocationsPage /></RequireAuth>
        } />
        <Route path="/tags" element={
          <RequireAuth roles={['ADMIN']}><TagsPage /></RequireAuth>
        } />
        <Route path="/staff" element={
          <RequireAuth roles={['ADMIN']}><StaffPage /></RequireAuth>
        } />
        <Route path="/my-schedule" element={
          <RequireAuth roles={['STAFF']}><StaffSchedulePage /></RequireAuth>
        } />
        <Route path="/my-profile" element={
          <RequireAuth roles={['STAFF']}><StaffProfilePage /></RequireAuth>
        } />
        <Route path="/browse-events" element={
          <RequireAuth roles={['PARTICIPANT']}><BrowseEventsPage /></RequireAuth>
        } />
        <Route path="/communications" element={
          <RequireAuth roles={['ADMIN']}><CommunicationsPage /></RequireAuth>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
