import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MailIcon from "@mui/icons-material/Mail";
import "./App.css";
import { AppProvider } from "./context/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import StaffPage from "./pages/StaffPage";
import EventsPage from "./pages/EventsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import EmailsPage from "./pages/EmailsPage";
import AdminPage from "./pages/AdminPage";
import ReportsPage from "./pages/ReportsPage";
import PublicCalendarPage from "./pages/PublicCalendarPage";

type PageKey =
  | "dashboard"
  | "staff"
  | "reports"
  | "events"
  | "assignments"
  | "calendar"
  | "emails"
  | "admin";

const DRAWER_WIDTH = 240;

function AdminAppContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageKey>("dashboard");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const handleNavigatePage = (event: Event) => {
      const customEvent = event as CustomEvent<{ page?: PageKey }>;
      const page = customEvent.detail?.page;
      if (!page) return;
      setCurrentPage(page);
      if (isMobile) {
        setMobileOpen(false);
      }
    };

    globalThis.addEventListener(
      "navigate-page",
      handleNavigatePage as EventListener
    );
    return () => {
      globalThis.removeEventListener(
        "navigate-page",
        handleNavigatePage as EventListener
      );
    };
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuItemClick = (page: PageKey) => {
    setCurrentPage(page);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const menuItems = [
    { key: "dashboard" as PageKey, label: "Dashboard", icon: DashboardIcon },
    { key: "staff" as PageKey, label: "Staff", icon: PeopleIcon },
    { key: "events" as PageKey, label: "Events", icon: AssignmentIcon },
    {
      key: "assignments" as PageKey,
      label: "Assignments",
      icon: AssignmentIcon,
    },
    { key: "calendar" as PageKey, label: "Calendar", icon: CalendarMonthIcon },
    { key: "reports" as PageKey, label: "Reporting", icon: AssignmentIcon },
    { key: "emails" as PageKey, label: "Emails", icon: MailIcon },
    { key: "admin" as PageKey, label: "Admin", icon: AdminPanelSettingsIcon },
  ];

  const drawerContent = (
    <Box sx={{ overflow: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 2,
          px: 1,
          borderBottom: "1px solid rgba(16, 182, 234, 0.15)",
        }}
      >
        <img
          src="/OYCI-Logo.png"
          alt="OYCI Logo"
          style={{ width: "160px", height: "auto" }}
        />
      </Box>
      <List>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <ListItem key={item.key} disablePadding>
              <ListItemButton
                selected={currentPage === item.key}
                onClick={() => handleMenuItemClick(item.key)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  my: 0.25,
                  "&.Mui-selected": {
                    backgroundColor: "rgba(16, 182, 234, 0.2)",
                    color: "#0b5e79",
                    "&:hover": {
                      backgroundColor: "rgba(16, 182, 234, 0.3)",
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <IconComponent />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "staff":
        return <StaffPage />;
      case "events":
        return <EventsPage />;
      case "assignments":
        return <AssignmentsPage />;
      case "calendar":
        return <CalendarPage />;
      case "emails":
        return <EmailsPage />;
      case "reports":
        return <ReportsPage />;
      case "admin":
        return <AdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          background:
            "linear-gradient(92deg, #d60087 0%, #f00095 60%, #ff35aa 100%)",
          boxShadow: "0 10px 20px rgba(214, 0, 135, 0.34)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            OYCI Staff Assignment Manager
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              backgroundColor: "#ffffff",
              borderRight: "1px solid rgba(16, 182, 234, 0.25)",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
        }}
      >
        {renderPage()}
      </Box>
    </Box>
  );
}

function PublicCalendarLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          background:
            "linear-gradient(92deg, #d60087 0%, #f00095 60%, #ff35aa 100%)",
          boxShadow: "0 10px 20px rgba(214, 0, 135, 0.34)",
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            OYCI Public Calendar
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: "100%",
          mt: 8,
        }}
      >
        <PublicCalendarPage />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Routes>
          <Route path="/" element={<AdminAppContent />} />
          <Route path="/cal" element={<PublicCalendarLayout />} />
        </Routes>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
