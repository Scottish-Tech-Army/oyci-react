import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import { locations } from "../data/mock";
import { listEvents } from "../api/events";
import { listStaff } from "../api/staff";
import type { EventInstance, Staff } from "../types/model";
import { formatDate } from "../utils/date";
import { getSession } from "../app/auth";
import "../styles/panels.css";

export default function Dashboard() {
  const nav = useNavigate();
  const session = getSession();
  const isAdmin = session?.role === "Admin";

  const [events, setEvents] = useState<EventInstance[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsData, staffData] = await Promise.all([
          listEvents(),
          listStaff(),
        ]);
        setEvents(eventsData.events);
        setUpcomingCount(eventsData.upcomingEvent);
        setTotalAttendees(eventsData.totalattendes);
        setStaff(staffData.staff);
        setActiveStaffCount(staffData.activeStaff);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Published events sorted by date
  const upcoming = [...events]
    .filter((e) => e.status === "SCHEDULED")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Staff member's own assignments — match by username
  const myStaffRecord = staff.find(
    (s) => (s.name ?? "").toLowerCase() === (session?.username ?? "").toLowerCase()
      || (s.email ?? "").toLowerCase().includes((session?.username ?? "").toLowerCase())
  );

  const myAssignedEvents = upcoming; // TODO: replace with real assignment API filtered by myStaffRecord?.id

  /* ─── ADMIN STATS ─── */
  const adminStats = [
    { label: "UPCOMING EVENTS", value: upcomingCount, color: "var(--teal)" },
    { label: "ACTIVE STAFF",    value: activeStaffCount,  color: "var(--yellow)" },
    { label: "TOTAL ATTENDEES", value: totalAttendees, color: "var(--pink)" },
  ];

  /* ─── STAFF STATS ─── */
  const staffStats = [
    { label: "MY ASSIGNMENTS",  value: myAssignedEvents.length, color: "var(--teal)" },
    { label: "UPCOMING EVENTS", value: upcomingCount,           color: "var(--blue)" },
  ];

  const stats = isAdmin ? adminStats : staffStats;

  if (loading) {
    return (
      <Page>
        <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
          ⏳ Loading dashboard...
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Welcome banner */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          👋 Welcome, {session?.username}
        </h2>
      </div>

      {/* Stats Row */}
      <div
        role="region"
        aria-label="Summary statistics"
        style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{
              flex: "1 1 100px",
              textAlign: "center",
              borderTop: `4px solid ${stat.color}`,
              padding: "12px 8px",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, color: stat.color }}>
              {stat.value}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════ ADMIN VIEW ══════════════ */}
      {isAdmin && (
        <div role="region" aria-label="Admin dashboard">
          <div className="grid2">
            {/* Upcoming Events */}
            <div className="panel">
              <div className="panelHeader teal" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>📅 Upcoming Events</span>
                <button className="btn btnLink" onClick={() => nav("/events")} style={{ fontSize: 13, color: "#000" }}>
                  View All →
                </button>
              </div>
              <div className="panelBody">
                {upcoming.length === 0 ? (
                  <div className="muted" style={{ textAlign: "center", padding: 16 }}>No upcoming events</div>
                ) : (
                  upcoming.map((e) => {
                    const loc = locations.find((l) => l.id === e.locationId) || { id: e.locationId, name: e.locationId };
                    return (
                      <div key={e.id} className="eventItem" style={{ justifyContent: "space-between" }}>
                        <div style={{ flex: 1 }}>
                          <div className="eventName" style={{ fontSize: 13 }}>{e.name || e.eventTypeName}</div>
                          <div className="eventMeta" style={{ fontSize: 12 }}>{formatDate(e.date)} · {loc.name}</div>
                        </div>
                        <span className="chip chipBlue" style={{ fontSize: 11, flexShrink: 0 }}>
                          {e.maxAttendees} seats
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Staff Overview */}
            <div className="panel">
              <div className="panelHeader yellow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>👥 Staff Overview</span>
                <button className="btn btnLink" onClick={() => nav("/staff")} style={{ fontSize: 13, color: "#000" }}>
                  View All →
                </button>
              </div>
              <div className="panelBody">
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {staff.slice(0, 4).map((s) => (
                    <li key={s.id} className="staffRow">
                      <div>
                        <div className="staffName" style={{ fontSize: 13 }}>{s.name}</div>
                        <div className="staffRole" style={{ fontSize: 12 }}>{s.roleLabel ?? "Staff"}</div>
                      </div>
                      <span className={`chip ${s.isActive ? "chipSuccess" : "chipNeutral"}`} style={{ fontSize: 11 }}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Admin Quick Actions */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--muted)" }}>Quick Actions</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btnOutline" onClick={() => nav("/staff/new")}>➕ Add Staff</button>
              <button className="btn btnOutline" onClick={() => nav("/events/new")}>📅 Create Event</button>
              <button className="btn btnOutline" onClick={() => nav("/report")}>📊 Reports</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAFF VIEW ══════════════ */}
      {!isAdmin && (
        <div role="region" aria-label="Staff dashboard">
          <div className="grid2">
            {/* My Upcoming Assignments */}
            <div className="panel">
              <div className="panelHeader teal" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>📅 My Upcoming Events</span>
                <button className="btn btnLink" onClick={() => nav("/calendar")} style={{ fontSize: 13, color: "#000" }}>
                  View Calendar →
                </button>
              </div>
              <div className="panelBody">
                {myAssignedEvents.length === 0 ? (
                  <div className="muted" style={{ textAlign: "center", padding: 16 }}>
                    No upcoming assignments
                  </div>
                ) : (
                  myAssignedEvents.map((e) => {
                    const loc = locations.find((l) => l.id === e.locationId) || { id: e.locationId, name: e.locationId };
                    return (
                      <div key={e.id} className="eventItem" style={{ justifyContent: "space-between" }}>
                        <div style={{ flex: 1 }}>
                          <div className="eventName" style={{ fontSize: 13 }}>{e.name || e.eventTypeName}</div>
                          <div className="eventMeta" style={{ fontSize: 12 }}>
                            📅 {formatDate(e.date)} · 🕐 {e.time}{e.endTime ? ` – ${e.endTime}` : ""}
                          </div>
                          <div className="eventMeta" style={{ fontSize: 12 }}>📍 {loc.name}</div>
                        </div>
                        <span className="chip chipSuccess" style={{ fontSize: 11, flexShrink: 0 }}>Assigned</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* My Profile Summary */}
            <div className="panel">
              <div className="panelHeader yellow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>👤 My Profile</span>
                <button className="btn btnLink" onClick={() => nav("/profile")} style={{ fontSize: 13, color: "#000" }}>
                  Edit →
                </button>
              </div>
              <div className="panelBody">
                {myStaffRecord ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                      {[
                        { label: "Name",          value: myStaffRecord.name },
                        { label: "✉️ Email",       value: myStaffRecord.email },
                        { label: "📞 Phone",       value: myStaffRecord.phone ?? "—" },
                        { label: "Role",           value: myStaffRecord.staffTypeName ?? myStaffRecord.roleLabel ?? "—" },
                        { label: "Qualification",  value: myStaffRecord.qualificationName ?? "—" },
                        { label: "Status",         value: myStaffRecord.isActive ? "✅ Active" : "⛔ Inactive" },
                      ].map(({ label, value }) => (
                        <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 4px", color: "var(--muted)" }}>{label}</td>
                          <td style={{ padding: "8px 4px", fontWeight: 600, textAlign: "right" }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="muted" style={{ textAlign: "center", padding: 16 }}>
                    Profile not found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Staff Quick Actions */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--muted)" }}>Quick Actions</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btnOutline" onClick={() => nav("/calendar")}>📅 View Calendar</button>
              <button className="btn btnOutline" onClick={() => nav("/leave")}>🏖️ Request Absence</button>
              <button className="btn btnOutline" onClick={() => nav("/profile")}>👤 My Profile</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}