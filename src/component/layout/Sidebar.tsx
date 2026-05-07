import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import 'primeicons/primeicons.css';
import './Sidebar.css';

const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'pi pi-th-large' },
    { label: 'Staff', path: '/staff', icon: 'pi pi-users' },
    { label: 'Events', path: '/events', icon: 'pi pi-calendar' },
    { label: 'Event Types', path: '/event-types', icon: 'pi pi-tags' },
    { label: 'Locations', path: '/locations', icon: 'pi pi-map-marker' },
    { label: 'Qualifications', path: '/qualifications', icon: 'pi pi-bookmark' },
    // { label: 'Reports', path: '/reports', icon: 'pi pi-chart-bar' },
];

interface SidebarProps {
    onToggle?: (collapsed: boolean) => void;
}

const Sidebar = ({ onToggle }: SidebarProps) => {
    const [collapsed, setCollapsed] = useState(true);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        onToggle?.(next);
    };

    return (
        <aside className={`oyci-sidebar${collapsed ? ' collapsed' : ''}`}>
            <div className="oyci-sidebar-brand">
                {!collapsed && <img src="/OYCI.png" alt="OYCI" className="oyci-logo" />}
                <button className="oyci-toggle-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Collapse'}>
                    <i className={`pi ${collapsed ? 'pi-angle-right' : 'pi-angle-left'}`} />
                </button>
            </div>
            <nav className="oyci-nav">
                {menuItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                            `oyci-nav-item${isActive ? ' active' : ''}`
                        }
                    >
                        <i className={item.icon} />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>
            <div className="oyci-sidebar-footer">
                <a href="/OYCI_User_Guide.docx" download className="oyci-nav-item" title={collapsed ? 'User Guide' : undefined}>
                    <i className="pi pi-download" />
                    {!collapsed && <span>User Guide</span>}
                </a>
                <button className="oyci-nav-item oyci-settings-btn" title={collapsed ? 'Settings' : undefined}>
                    <i className="pi pi-cog" />
                    {!collapsed && <span>Settings</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
