import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, Divider, Avatar, Menu, MenuItem, Chip,
} from '@mui/material';
import {
  Menu as MenuIcon, Event, People, LocationOn, Label, Category,
  CalendarMonth, Email, Dashboard, PersonOutline,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <Dashboard />, roles: ['ADMIN', 'STAFF', 'PARTICIPANT'] },
  { label: 'Event Instances', path: '/events', icon: <Event />, roles: ['ADMIN', 'STAFF'] },
  { label: 'Event Types', path: '/event-types', icon: <Category />, roles: ['ADMIN'] },
  { label: 'Locations', path: '/locations', icon: <LocationOn />, roles: ['ADMIN'] },
  { label: 'Tags', path: '/tags', icon: <Label />, roles: ['ADMIN'] },
  { label: 'Staff', path: '/staff', icon: <People />, roles: ['ADMIN'] },
  { label: 'My Schedule', path: '/my-schedule', icon: <CalendarMonth />, roles: ['STAFF'] },
  { label: 'My Profile', path: '/my-profile', icon: <PersonOutline />, roles: ['STAFF'] },
  { label: 'Browse Events', path: '/browse-events', icon: <Event />, roles: ['PARTICIPANT'] },
  { label: 'Communications', path: '/communications', icon: <Email />, roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout, isAdmin, isStaff, isParticipant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const role = user?.role ?? '';
  const filteredNav = NAV_ITEMS.filter((n) => n.roles.includes(role));

  const roleColor = isAdmin ? 'error' : isStaff ? 'primary' : isParticipant ? 'success' : 'default';

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          EventHub
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredNav.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => { navigate(item.path); setMobileOpen(false); }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
            Event Booking & Staff Management
          </Typography>
          <Chip label={role} color={roleColor} size="small" sx={{ mr: 2, color: '#fff' }} />
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32 }}>{user?.name?.[0] ?? '?'}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.name} ({user?.email})</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: { md: `${DRAWER_WIDTH}px` }, mt: '64px', minHeight: 'calc(100vh - 64px)' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

