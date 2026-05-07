import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const FamilyDashboardLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const familyStr = localStorage.getItem('family');
  const family = familyStr ? JSON.parse(familyStr) : null;

  if (!family || family.role !== 'family') {
    navigate('/family/login', { replace: true });
    return null;
  }

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) setIsMobileOpen(!isMobileOpen);
    else setIsDesktopCollapsed(!isDesktopCollapsed);
  };

  const handleLogout = () => {
    localStorage.removeItem('familyToken');
    localStorage.removeItem('family');
    window.location.href = '/family/login';
  };

  const menuItems = [
    { label: '🏠 Dashboard', path: '/family/dashboard' },
    { label: '✏️ Edit Profile', path: '/family/dashboard/edit-profile' },
    { label: '📅 Calendar', path: '/family/dashboard/calendar' },
  ];

  const currentLabel = menuItems.find(i => i.path === location.pathname)?.label || 'Family Portal';

  return (
    <div className={`dashboard-layout ${isDesktopCollapsed ? 'desktop-collapsed' : ''}`}>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`} onClick={() => setIsMobileOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ gap: '10px' }}>
          <img
            src="/oyci-logo.png"
            alt="OYCI"
            style={{ height: '36px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          <span className="auth-logo-text" style={{ color: '#ec4899', fontSize: '13px', fontWeight: 800, letterSpacing: '0.03em' }}>Family Portal</span>
        </div>

        {/* Family info chip */}
        <div style={{ margin: '0 12px 8px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logged in as</p>
          <p style={{ margin: '0 0 1px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{family.guardianName}</p>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.04em' }}>{family.familyId}</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
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
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle-btn" onClick={toggleSidebar}>☰</button>
            <h2 className="page-title">{currentLabel.replace(/^[^\s]+\s/, '')}</h2>
          </div>
          <div className="header-actions">
            <span className="user-greeting">Hi, {family.guardianName.split(' ')[0]}!</span>
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

export default FamilyDashboardLayout;
