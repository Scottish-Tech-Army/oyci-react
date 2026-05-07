import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import oycLogo from '../../assets/OYCI Logo 2018.svg';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/events', label: 'Events', end: false },
  { to: '/admin/staff', label: 'Staff', end: false },
];

const staffLinks = [
  { to: '/staff', label: 'My Events', end: true },
  { to: '/staff/qualifications', label: 'Qualifications', end: false },
  { to: '/staff/availability', label: 'My Availability', end: false },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'admin' ? adminLinks : staffLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeClass = user?.role === 'admin'
    ? 'bg-oyci-purple text-white'
    : 'bg-oyci-blue text-white';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col" style={{ background: '#066633' }}>
        <div className="px-4 py-5 border-b border-white/20">
          <img src={oycLogo} alt="OYCI" className="w-full h-auto" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-oyci-green text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/20">
          <div className="text-white text-sm font-semibold mb-0.5">{user?.displayName ?? user?.username}</div>
          <div className="text-white/60 text-xs mb-2">{user?.username}</div>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize mb-3 ${roleBadgeClass}`}>
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="w-full text-left text-white/50 hover:text-white text-xs transition-colors"
          >
            Logout →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

