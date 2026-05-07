import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Page from "../components/Page";
import { listStaff } from "../api/staff";
import type { Staff, StaffAvailability } from "../types/model";
import "../styles/panels.css";

/* =========================
   Types
========================= */

type AbsenceStatus = "PENDING" | "APPROVED" | "REJECTED";

type AbsenceWithStatus = StaffAvailability & {
  status: AbsenceStatus;
};

/* =========================
   Helpers
========================= */

function calculateDays(start?: string, end?: string) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

/* =========================
   Component
========================= */

export default function ManageAbsence() {
  const nav = useNavigate();
  const location = useLocation();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [absences, setAbsences] = useState<AbsenceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* -------------------------
     Load data
  ------------------------- */
  useEffect(() => {
    async function fetchData() {
      try {
        const staffData = await listStaff();
        setStaff(staffData.staff);

        // TODO: Replace with real API call
        setAbsences([]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  /* -------------------------
     Receive new absence
  ------------------------- */
  useEffect(() => {
    const incoming = (location.state as any)?.newAbsence;
    if (incoming) {
      setAbsences((prev) => [incoming, ...prev]);
      // clear navigation state
      nav(location.pathname, { replace: true });
    }
  }, [location.state, nav, location.pathname]);

  /* -------------------------
     Actions
  ------------------------- */
  function updateStatus(id: string, status: AbsenceStatus) {
    setAbsences((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  }

  /* -------------------------
     Search filtering
  ------------------------- */
  const filteredAbsences = absences.filter((a) => {
    const s = staff.find((st) => st.id === a.staffId);
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      (s?.name ?? "").toLowerCase().includes(q) ||
      (a.type ?? "").toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q)
    );
  });

  /* =========================
     Render
  ========================= */

  return (
    <Page>
      <div className="panel" role="region" aria-label="Manage Absence">
        <div className="panelHeader pink">Manage Absence</div>

        <div className="panelBody">
          {/* Search + Action */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="🔍 Search by staff, type or status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220 }}
            />

            <button
              className="btn btnPrimary"
              onClick={() => nav("/apply-leave")}
            >
              + Apply Leave
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: 16,
                color: "var(--muted)",
              }}
            >
              Loading absences…
            </div>
          )}

          {/* Empty states */}
          {!loading && filteredAbsences.length === 0 && (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                color: "var(--muted)",
                border: "1px dashed var(--border)",
                borderRadius: 12,
              }}
            >
              {absences.length === 0
                ? "No absences available."
                : "No results match your search."}
            </div>
          )}

          {/* Table */}
          {!loading && filteredAbsences.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr className="muted" style={{ fontSize: 13 }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Staff</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Type</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Period</th>
                  <th style={{ padding: 8, textAlign: "center" }}>Days</th>
                  <th style={{ padding: 8, textAlign: "center" }}>Status</th>
                  <th style={{ padding: 8, textAlign: "center" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAbsences.map((a) => {
                  const s = staff.find((st) => st.id === a.staffId);
                  const days = calculateDays(a.startDate, a.endDate);

                  const statusClass =
                    a.status === "APPROVED"
                      ? "chipSuccess"
                      : a.status === "REJECTED"
                      ? "chipWarn"
                      : "chipNeutral";

                  return (
                    <tr
                      key={a.id}
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: 8, fontWeight: 600 }}>
                        {s?.name ?? "Unknown"}
                      </td>

                      <td style={{ padding: 8 }}>{a.type ?? "—"}</td>

                      <td style={{ padding: 8 }}>
                        {a.startDate && a.endDate ? (
                          <>
                            {a.startDate} → {a.endDate}
                          </>
                        ) : (
                          <>
                            {a.dayOfWeek} · {a.startTime}–{a.endTime}
                          </>
                        )}
                      </td>

                      <td style={{ padding: 8, textAlign: "center" }}>
                        {days ?? "—"}
                      </td>

                      <td style={{ padding: 8, textAlign: "center" }}>
                        <span className={`chip ${statusClass}`}>
                          {a.status}
                        </span>
                      </td>

                      <td style={{ padding: 8, textAlign: "center" }}>
                        {a.status === "PENDING" ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <button
                              className="btn btnSecondary"
                              style={{ padding: "4px 8px" }}
                              onClick={() =>
                                updateStatus(a.id, "APPROVED")
                              }
                            >
                              ✅
                            </button>

                            <button
                              className="btn"
                              style={{
                                padding: "4px 8px",
                                background: "#e53e3e",
                                color: "#fff",
                              }}
                              onClick={() =>
                                updateStatus(a.id, "REJECTED")
                              }
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Page>
  );
}