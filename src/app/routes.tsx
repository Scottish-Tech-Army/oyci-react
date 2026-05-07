import { Navigate } from "react-router-dom";
import AppShell from "./AppShell";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ManageEvents from "../pages/ManageEvents";
import ManageStaff from "../pages/ManageStaff";
import Calendar from "../pages/Calendar";
import { RequireAuth } from "./auth";
import CreateEvent from "../pages/CreateEvent";
import AddStaff from "../pages/AddStaff";
import EditStaff from "../pages/EditStaff";
import Profile from "../pages/Profile";
import EditEvent from "../pages/EditEvent";
import ManageAbsence from "../pages/ManageAbsence";
import ApplyLeave from "../pages/ApplyLeave";
import GenerateReport from "../pages/GenerateReport";

export const routes = [
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      // ✅ default landing
      { index: true, element: <Navigate to="dashboard" replace /> },

      // ✅ main routes
      { path: "dashboard", element: <Dashboard /> },
      { path: "events", element: <ManageEvents /> },
      { path: "events/new", element: <CreateEvent /> },
      { path: "/events/:eventId/edit", element: <EditEvent />},

      { path: "staff", element: <ManageStaff /> },
      { path: "staff/new", element: <AddStaff /> },
      { path: "staff/:staffId/edit", element: <EditStaff /> },

      { path: "calendar", element: <Calendar /> },
      { path: "leave", element: <ManageAbsence /> },
      { path: "/apply-leave", element: <ApplyLeave />},
      { path: "report", element: <GenerateReport /> },
      { path: "profile", element: <Profile /> },
    ],
  },

  // ✅ safe fallback
  { path: "*", element: <Navigate to="/" replace /> },
];