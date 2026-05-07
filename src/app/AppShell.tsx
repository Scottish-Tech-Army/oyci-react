import { Outlet, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { clearSession, getSession } from "./auth";

export default function AppShell() {
  const nav = useNavigate();
  const session = getSession();

  if (!session) return null;

  return (
    <div className="appShell">
      <NavBar
        userName={session.username}
        role={session.role}
        onLogout={() => {
          clearSession();
          nav("/login");
        }}
      />

      {/* ✅ THIS IS THE CRITICAL LINE */}
      <main className="appMain">
        <Outlet />
      </main>
    </div>
  );
}