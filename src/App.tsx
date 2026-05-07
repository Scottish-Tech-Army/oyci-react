import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import EditProfilePage from './pages/EditProfilePage';
import LandingPage from './pages/LandingPage';
import StudentRegistration from './pages/StudentRegistration';
import FamilyLoginPage from './pages/FamilyLoginPage';
import FamilyDashboardLayout from './layouts/FamilyDashboardLayout';
import FamilyDashboardHome from './pages/FamilyDashboardHome';
import FamilyEditProfile from './pages/FamilyEditProfile';
import FamilyEventCalendar from './pages/FamilyEventCalendar';
import EventCalendar from './pages/EventCalendar';

import AdminStaffOnboardingPage from './pages/admin/AdminStaffOnboardingPage';

// Admin Imports
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboardLayout from './layouts/AdminDashboardLayout';
import AdminDashboardHome from './pages/admin/AdminDashboardHome';
import StaffManagement from './pages/admin/StaffManagement';
import EventCreation from './pages/admin/EventCreation';
import AdminStudentManagement from './pages/admin/AdminStudentManagement';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminPayroll from './pages/admin/AdminPayroll';

import './App.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Student Registration (public, no auth required) */}
          <Route path="/student-registration" element={<StudentRegistration />} />

          {/* Family Portal */}
          <Route path="/family/login" element={<FamilyLoginPage />} />
          <Route path="/family/dashboard" element={<FamilyDashboardLayout />}>
            <Route index element={<FamilyDashboardHome />} />
            <Route path="edit-profile" element={<FamilyEditProfile />} />
            <Route path="calendar" element={<FamilyEventCalendar />} />
          </Route>

          {/* User / Staff Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="edit-profile" element={<EditProfilePage />} />
            <Route path="calendar" element={<EventCalendar isAdmin={false} />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboardLayout />}>
            <Route index element={<AdminDashboardHome />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="students" element={<AdminStudentManagement />} />
            <Route path="onboarding" element={<AdminStaffOnboardingPage />} />
            <Route path="events" element={<EventCreation />} />
            <Route path="calendar" element={<EventCalendar isAdmin={true} />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="payroll" element={<AdminPayroll />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
