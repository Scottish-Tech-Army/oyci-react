import { useState, useEffect } from "react";
import Page from "../components/Page";
import { listEvents } from "../api/events";
import { listStaff } from "../api/staff";
import type { EventInstance, Staff } from "../types/model";
import "../styles/panels.css";

type ReportType = "events" | "staff" | "summary";

export default function GenerateReport() {
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchStaff, setSearchStaff] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [eventsData, staffData] = await Promise.all([
          listEvents(),
          listStaff(),
        ]);
        setEvents(eventsData.events);
        setStaff(staffData.staff);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filtered data
  const filteredEvents = events.filter((e) =>
    statusFilter === "ALL" ? true : e.status === statusFilter
  );

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStaff.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(searchStaff.toLowerCase())
  );

  // Summary stats
  const draftCount     = events.filter((e) => e.status === "DRAFT").length;
  const publishedCount = events.filter((e) => e.status === "SCHEDULED").length;
  const completedCount = events.filter((e) => e.status === "COMPLETED").length;
  const activeStaff    = staff.filter((s) => s.isActive).length;
  const totalAttendees = events.reduce((sum, e) => sum + (e.maxAttendees ?? 0), 0);

  /** Parse "HH:MM" → total minutes */
  function toMinutes(t?: string): number {
    if (!t) return -1;
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  /**
   * Compute total hours worked by a staff member across all COMPLETED or
   * SCHEDULED events they are assigned to, using the assignment shiftStart /
   * shiftEnd times.
   */
  function hoursWorked(staffId: string): number {
    let totalMins = 0;
    for (const ev of events) {
      if (ev.status === "DRAFT") continue; // only count scheduled / completed
      for (const a of ev.staffAssignments ?? []) {
        if (a.staffId !== staffId) continue;
        const start = toMinutes(a.shiftStart ?? ev.shiftStart);
        const end   = toMinutes(a.shiftEnd   ?? ev.shiftEnd);
        if (start >= 0 && end > start) totalMins += end - start;
      }
    }
    return totalMins / 60;
  }

  function downloadCSV(filename: string, rows: string[][], headers: string[]) {
    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportEvents() {
    const headers = ["Event Name", "Type", "Date", "Start Time", "End Time", "Location", "Max Attendees", "Status"];
    const rows = filteredEvents.map((e) => [
      e.name ?? "",
      e.eventTypeName ?? "",
      e.date,
      e.time,
      e.endTime ?? "",
      e.locationId,
      String(e.maxAttendees ?? 0),
      e.status,
    ]);
    downloadCSV("events-report.csv", rows, headers);
  }

  function handleExportStaff() {
    const headers = ["Full Name", "First Name", "Last Name", "Email", "Phone", "Role", "Qualification", "Hours Worked", "Weekly Cap", "Active"];
    const rows = filteredStaff.map((s) => [
      s.name,
      s.firstName ?? "",
      s.lastName ?? "",
      s.email,
      s.phone ?? "",
      s.staffTypeName ?? s.roleLabel ?? "",
      s.qualificationName ?? "",
      hoursWorked(s.id).toFixed(1),
      s.weeklyHoursCap != null ? String(s.weeklyHoursCap) : "—",
      s.isActive ? "Yes" : "No",
    ]);
    downloadCSV("staff-report.csv", rows, headers);
  }

  return (
    <Page>
      <div style={{ padding: "16px" }}>
        {/* Header */}
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panelHeader teal">
            📊 Generate Report
          </div>
          <div className="panelBody">
            {/* Report type tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
              {(["summary", "events", "staff"] as ReportType[]).map((t) => (
                <button
                  key={t}
                  className={`btn ${reportType === t ? "btnPrimary" : "btnOutline"}`}
                  onClick={() => setReportType(t)}
                  style={{ textTransform: "capitalize" }}
                >
                  {t === "summary" ? "📋 Summary" : t === "events" ? "📅 Events" : "👥 Staff"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
            ⏳ Loading report data...
          </div>
        )}
        {error && (
          <div style={{ padding: 12, background: "#fee", color: "#c00", borderRadius: 4 }} role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* ===================== SUMMARY ===================== */}
        {!loading && !error && reportType === "summary" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div className="panel">
              <div className="panelHeader teal">Events Overview</div>
              <div className="panelBody">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: "Total Events", value: events.length },
                      { label: "Draft", value: draftCount },
                      { label: "Published", value: publishedCount },
                      { label: "Completed", value: completedCount },
                      { label: "Total Max Attendees", value: totalAttendees },
                    ].map(({ label, value }) => (
                      <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 4px", color: "var(--muted)", fontSize: 13 }}>{label}</td>
                        <td style={{ padding: "8px 4px", fontWeight: 700, textAlign: "right" }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panelHeader yellow">Staff Overview</div>
              <div className="panelBody">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      { label: "Total Staff", value: staff.length },
                      { label: "Active", value: activeStaff },
                      { label: "Inactive", value: staff.length - activeStaff },
                    ].map(({ label, value }) => (
                      <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 4px", color: "var(--muted)", fontSize: 13 }}>{label}</td>
                        <td style={{ padding: "8px 4px", fontWeight: 700, textAlign: "right" }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panelHeader" style={{ background: "var(--pink)", color: "#fff" }}>Status Breakdown</div>
              <div className="panelBody">
                {[
                  { label: "Draft", count: draftCount, color: "var(--yellow)" },
                  { label: "Published", count: publishedCount, color: "var(--teal)" },
                  { label: "Completed", count: completedCount, color: "var(--muted)" },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 4 }}>
                      <div
                        style={{
                          height: "100%",
                          width: events.length ? `${(count / events.length) * 100}%` : "0%",
                          background: color,
                          borderRadius: 4,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== EVENTS ===================== */}
        {!loading && !error && reportType === "events" && (
          <div className="panel">
            <div className="panelHeader teal">📅 Events Report</div>
            <div className="panelBody">
              {/* Filters + Export */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ minWidth: 140 }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <span style={{ flex: 1, fontSize: 13, color: "var(--muted)" }}>
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
                </span>
                <button className="btn btnPrimary" onClick={handleExportEvents} style={{ whiteSpace: "nowrap" }}>
                  ⬇️ Export CSV
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      {["Event Name", "Type", "Date", "Start", "End", "Location", "Attendees", "Status"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                          No events found
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((e) => (
                        <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{e.name ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{e.eventTypeName ?? "—"}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{e.date}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{e.time}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{e.endTime ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{e.locationId}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>{e.maxAttendees ?? 0}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className={`chip ${e.status === "SCHEDULED" ? "chipSuccess" : e.status === "DRAFT" ? "chipWarn" : "chipNeutral"}`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== STAFF ===================== */}
        {!loading && !error && reportType === "staff" && (
          <div className="panel">
            <div className="panelHeader yellow">👥 Staff Report</div>
            <div className="panelBody">
              {/* Search + Export */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input
                  type="search"
                  placeholder="🔍 Search by name or email..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {filteredStaff.length} member{filteredStaff.length !== 1 ? "s" : ""}
                </span>
                <button className="btn btnPrimary" onClick={handleExportStaff} style={{ whiteSpace: "nowrap" }}>
                  ⬇️ Export CSV
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      {["Name", "Email", "Phone", "Role", "Qualification", "Hours Worked", "Weekly Cap", "Active"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                          No staff found
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((s) => {
                        return (
                        <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "8px 10px" }}>{s.email}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{s.phone ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{s.staffTypeName ?? s.roleLabel ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{s.qualificationName ?? "—"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: (() => { const hw = hoursWorked(s.id); const cap = s.weeklyHoursCap; return cap != null && hw > cap ? "#c00" : "inherit"; })() }}>
                            {(() => {
                              const hw = hoursWorked(s.id);
                              const cap = s.weeklyHoursCap;
                              const overCap = cap != null && hw > cap;
                              const assignedEvents = events.filter(
                                (ev) => ev.status !== "DRAFT" && (ev.staffAssignments ?? []).some((a) => a.staffId === s.id)
                              );
                              return hw > 0 ? (
                                <span title={`Across ${assignedEvents.length} event(s)`}>
                                  {hw.toFixed(1)} h
                                  {overCap && <span style={{ marginLeft: 4, fontSize: 11, color: "#c00" }}>⚠️ over cap</span>}
                                </span>
                              ) : (
                                <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--muted)" }}>
                            {s.weeklyHoursCap != null ? `${s.weeklyHoursCap} h` : "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className={`chip ${s.isActive ? "chipSuccess" : "chipNeutral"}`}>
                              {s.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
