import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const AdminDashboardLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsDesktopCollapsed(!isDesktopCollapsed);
    }
  };

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user || user.role !== 'admin') {
    navigate('/admin/login', { replace: true });
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/admin/login';
  };

  const menuItems = [
    { label: '🏠 Dashboard',              path: '/admin/dashboard' },
    { label: '📅 Session Management',     path: '/admin/dashboard/events' },
    { label: '📝 Staff Onboarding',       path: '/admin/dashboard/onboarding' },
    { label: '👥 Staff Info & Approvals', path: '/admin/dashboard/staff' },
    { label: '🧒 Student Management',     path: '/admin/dashboard/students' },
    { label: '🗓️ Calendar',              path: '/admin/dashboard/calendar' },
    { label: '📊 Attendance',             path: '/admin/dashboard/attendance' },
    { label: '💸 Payroll',               path: '/admin/dashboard/payroll' },
  ];

  return (
    <div className={`dashboard-layout ${isDesktopCollapsed ? 'desktop-collapsed' : ''}`}>
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileOpen(false)} 
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`} style={{ backgroundColor: 'var(--bg-input)' }}>
        <div className="sidebar-header" style={{ gap: '10px' }}>
          <img
            src="/oyci-logo.png"
            alt="OYCI"
            style={{ height: '36px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          <span className="auth-logo-text" style={{ color: '#ec4899', fontSize: '13px', fontWeight: 800, letterSpacing: '0.03em' }}>Admin Portal</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link logout-btn" onClick={handleLogout}>
            🚪 Secure Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle-btn" onClick={toggleSidebar}>☰</button>
            <h2 className="page-title">
              {menuItems.find((i) => i.path === location.pathname)?.label || 'System Console'}
            </h2>
          </div>
          <div className="header-actions">
            <span className="user-greeting">Welcome, Administrator</span>
            <button
              className="theme-slider"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span className="theme-slider__icon">☀️</span>
              <span className={`theme-slider__track${theme === 'dark' ? ' theme-slider__track--dark' : ''}`}>
                <span className="theme-slider__thumb" />
              </span>
              <span className="theme-slider__icon">🌙</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardLayout;
