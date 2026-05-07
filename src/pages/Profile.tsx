import { useState, useEffect } from "react";
import { getSession } from "../app/auth";
import { listStaff } from "../api/staff";
import type { Staff } from "../types/model";
import Page from "../components/Page";
import "../styles/panels.css";

export default function Profile() {
  const session = getSession();
  const [staffRecord, setStaffRecord] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await listStaff();
        // Match by email (session email) or username
        const sessionEmail = session?.email?.toLowerCase() ?? "";
        const sessionUsername = session?.username?.toLowerCase() ?? "";
        const match = data.staff.find(
          (s) =>
            (sessionEmail && s.email.toLowerCase() === sessionEmail) ||
            s.name.toLowerCase() === sessionUsername ||
            s.email.toLowerCase().includes(sessionUsername)
        );
        setStaffRecord(match ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [session?.email, session?.username]);

  if (!session) return null;

  const displayName = staffRecord?.name || session.username;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Page>
      <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
        <div className="panel" style={{ width: "100%", maxWidth: 560 }}>
          <div className="panelHeader teal">👤 My Profile</div>

          <div className="panelBody">
            {/* Avatar + name header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "var(--teal, #2cb5a0)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{session.role}</div>
                {staffRecord && (
                  <span className={`chip ${staffRecord.isActive ? "chipSuccess" : "chipNeutral"}`} style={{ fontSize: 11, marginTop: 4, display: "inline-block" }}>
                    {staffRecord.isActive ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>⏳ Loading profile...</div>
            )}
            {error && (
              <div style={{ padding: 12, background: "#fee", color: "#c00", borderRadius: 4 }} role="alert">⚠️ {error}</div>
            )}

            {!loading && !error && (
              <>
                {/* ── Contact ── */}
                <div style={{ fontWeight: 800, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contact</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                  <tbody>
                    {[
                      { label: "✉️ Email",   value: staffRecord?.email ?? session.email ?? "—" },
                      { label: "📞 Phone",   value: staffRecord?.phone || "—" },
                      { label: "📍 Address", value: [staffRecord?.addressLine1, staffRecord?.city, staffRecord?.postcode, staffRecord?.country].filter(Boolean).join(", ") || "—" },
                    ].map(({ label, value }) => (
                      <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 4px", color: "var(--muted)", width: 130 }}>{label}</td>
                        <td style={{ padding: "8px 4px", fontWeight: 600 }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ── Role & Type ── */}
                <div style={{ fontWeight: 800, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Role & Type</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                  <tbody>
                    {[
                      { label: "🔑 System Role",  value: session.role },
                      { label: "👷 Staff Type",   value: staffRecord?.staffTypeName || "—" },
                      { label: "🎓 Qualification", value: staffRecord?.qualificationName || "—" },
                    ].map(({ label, value }) => (
                      <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 4px", color: "var(--muted)", width: 130 }}>{label}</td>
                        <td style={{ padding: "8px 4px", fontWeight: 600 }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ── Availability ── */}
                <div style={{ fontWeight: 800, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Availability</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 4px", color: "var(--muted)", width: 130 }}>⏱️ Weekly Cap</td>
                      <td style={{ padding: "8px 4px", fontWeight: 600 }}>
                        {staffRecord?.weeklyHoursCap != null ? `${staffRecord.weeklyHoursCap} hrs` : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 4px", color: "var(--muted)", verticalAlign: "top" }}>🕐 Shift Times</td>
                      <td style={{ padding: "8px 4px" }}>
                        {staffRecord?.shiftTimes && staffRecord.shiftTimes.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {staffRecord.shiftTimes.map((slot, i) => (
                              <span key={i} className="chip chipNeutral" style={{ fontSize: 12 }}>
                                🕐 {slot}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>No shifts set</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {!staffRecord && (
                  <div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>
                    ℹ️ No staff record found matching your login. Contact an admin.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
