import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  dash: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>),
  calendar: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="11" rx="1.5"/><path d="M5 1v4M11 1v4M1 7h14"/></svg>),
  people: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><circle cx="12" cy="5" r="2"/><path d="M1 14c0-3 2-4 5-4s5 1 5 4"/><path d="M15 14c0-2-1.5-3-3-3"/></svg>),
  student: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L1 6l7 4 7-4-7-4z"/><path d="M1 6v5M4 7.5v4c0 1.5 4 2.5 4 2.5s4-1 4-2.5v-4"/></svg>),
  star: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z"/></svg>),
  cert: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="10" rx="1.5"/><path d="M5 6h6M5 8.5h4"/><circle cx="12" cy="13" r="2"/></svg>),
  profile: (<svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/></svg>),
  logout: (<svg style={{width:12,height:12}} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"/></svg>)
};

function AdminNav() {
  return (
    <>
      <div className="nav-section">Overview</div>
      <NavLink to="/admin" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.dash} Dashboard</NavLink>
      <div className="nav-section">Manage</div>
      <NavLink to="/admin/events" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.calendar} Events</NavLink>
      <NavLink to="/admin/staff" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.people} Staff</NavLink>
      <NavLink to="/admin/students" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.student} Students</NavLink>
    </>
  );
}

function StaffNav() {
  return (
    <>
      <div className="nav-section">Overview</div>
      <NavLink to="/staff" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.dash} My Dashboard</NavLink>
    </>
  );
}

function StudentNav() {
  return (
    <>
      <div className="nav-section">My Learning</div>
      <NavLink to="/student" end className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.dash} Dashboard</NavLink>
      <NavLink to="/student/events" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.calendar} Browse Events</NavLink>
      <NavLink to="/student/my-events" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.star} My Registrations</NavLink>
      <NavLink to="/student/certificates" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.cert} Certificates</NavLink>
      <NavLink to="/student/profile" className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}>{ICONS.profile} My Profile</NavLink>
    </>
  );
}

const PAGE_TITLES = {
  '/admin': 'Dashboard', '/admin/events': 'Events', '/admin/staff': 'Staff', '/admin/students': 'Students',
  '/staff': 'My Dashboard',
  '/student': 'Dashboard', '/student/events': 'Browse Events', '/student/my-events': 'My Registrations',
  '/student/certificates': 'My Certificates', '/student/profile': 'My Profile',
};

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = () => { logout(); navigate('/login'); };
  const title = PAGE_TITLES[location.pathname] || 'OYCI';

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-eye">OYCI</div>
          <div className="brand-name">Ochil Youths<br />Community</div>
        </div>
        <div className="sidebar-nav">
          {user?.role === 'ADMIN' && <AdminNav />}
          {user?.role === 'STAFF' && <StaffNav />}
          {user?.role === 'STUDENT' && <StudentNav />}
        </div>
        <div className="sidebar-foot">
          <div>{user?.username}</div>
          <button className="logout-btn" onClick={handleLogout}>{ICONS.logout} Sign out</button>
        </div>
      </nav>
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <span className="topbar-user">{user?.username}</span>
            <span className={`role-badge ${user?.role}`}>{user?.role?.toLowerCase()}</span>
          </div>
        </header>
        <main className="page-content fade-up">{children}</main>
      </div>
    </div>
  );
}
