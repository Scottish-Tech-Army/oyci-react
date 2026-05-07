import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import StaffForm from "./StaffForm";
import { createStaff, listStaff, updateStaff } from "../api/staff";
import type { Staff } from "../types/model";
import "../styles/cards.css";
import "../styles/panels.css";

const ROLE_OPTIONS = [
  { label: "Staff", value: 3 },
  { label: "Admin", value: 1 },
];

export default function AddStaff() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"add" | "roles">("add");

  // ── Add Staff state ──
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Manage Roles state ──
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [roleMap, setRoleMap] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "roles") {
      setLoadingStaff(true);
      listStaff()
        .then((data) => {
          setStaffList(data.staff);
          const map: Record<string, number> = {};
          data.staff.forEach((s) => {
            map[s.id] = s.roleId ?? (s.isAdmin ? 1 : 3);
          });
          setRoleMap(map);
        })
        .catch((err) => setSaveError(err instanceof Error ? err.message : "Failed to load staff"))
        .finally(() => setLoadingStaff(false));
    }
  }, [tab]);

  async function handleSave(staff: Staff) {
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        firstName: staff.firstName!,
        middleName: staff.middleName || undefined,
        lastName: staff.lastName!,
        primaryEmail: staff.email,
        primaryPhone: staff.phone,
        addressLine1: staff.addressLine1 || "Not provided",
        city: staff.city || "Unknown",
        country: staff.country || "UK",
        postcode: staff.postcode || "N/A",
        roleId: staff.roleId ?? (staff.isAdmin ? 1 : 3),
        password: staff.password ?? "",
        staffTypeId: staff.staffTypeId!,
        qualificationId: staff.qualificationId || undefined,
        weeklyHoursCap: staff.weeklyHoursCap,
        preferredShiftTimes: staff.shiftTimes,
        isActive: staff.isActive ?? true,
      };

      console.log("📤 Create Staff Payload:", JSON.stringify(payload, null, 2));

      await createStaff(payload);
      nav("/staff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleSave(s: Staff) {
    try {
      setSavingId(s.id);
      setSaveError(null);
      setSavedId(null);

      if (!s.staffTypeId || s.staffTypeId <= 0) {
        setSaveError(`Cannot update role for ${s.name}: Staff Type ID is missing. Please edit the staff member directly to set a valid Staff Type.`);
        return;
      }

      const rolePayload = {
        staffId: Number(s.id),
        firstName: s.firstName!,
        middleName: s.middleName || undefined,
        lastName: s.lastName!,
        primaryEmail: s.email,
        primaryPhone: s.phone,
        roleId: roleMap[s.id] ?? (s.roleId === 1 ? 1 : 3),
        staffTypeId: s.staffTypeId,
        staffTypeName: s.staffTypeName || undefined,
        qualificationId: s.qualificationId || undefined,
        qualificationName: s.qualificationName || undefined,
        weeklyHoursCap: s.weeklyHoursCap,
        preferredShiftTimes: s.shiftTimes,
        isActive: s.isActive ?? true,
      };

      console.log(`📤 Update Role Payload [staffId=${s.id}]:`, JSON.stringify(rolePayload, null, 2));

      await updateStaff(s.id, rolePayload);
      setSavedId(s.id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Page>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "16px" }}>
        <div className="panel" role="region" style={{ width: "100%", maxWidth: 640 }}>
          <div className="panelHeader yellow">Staff Management</div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--border)", background: "var(--surface, #fafafa)" }}>
            {(["add", "roles"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? "3px solid var(--yellow, #f5c518)" : "3px solid transparent",
                  fontWeight: tab === t ? 800 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  color: tab === t ? "var(--text)" : "var(--muted)",
                }}
              >
                {t === "add" ? "➕ Add New Staff" : "🔑 Manage Roles"}
              </button>
            ))}
          </div>

          <div className="panelBody">
            {/* ── ADD NEW STAFF TAB ── */}
            {tab === "add" && (
              <>
                {error && (
                  <div style={{ padding: 12, marginBottom: 16, backgroundColor: "var(--error-bg, #fee)", color: "var(--error, red)", borderRadius: 8, fontSize: 14 }} role="alert">
                    {error}
                  </div>
                )}
                <StaffForm onSave={handleSave} onCancel={() => nav("/staff")} isEditing={false} />
                {submitting && (
                  <div style={{ textAlign: "center", padding: 12, color: "var(--muted)" }}>
                    Creating staff...
                  </div>
                )}
              </>
            )}

            {/* ── MANAGE ROLES TAB ── */}
            {tab === "roles" && (
              <>
                {saveError && (
                  <div style={{ padding: 12, marginBottom: 12, backgroundColor: "var(--error-bg, #fee)", color: "var(--error, red)", borderRadius: 8, fontSize: 14 }} role="alert">
                    {saveError}
                  </div>
                )}
                {loadingStaff ? (
                  <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Loading staff...</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--muted)", fontWeight: 700 }}>Name</th>
                        <th style={{ textAlign: "left", padding: "8px 6px", color: "var(--muted)", fontWeight: 700 }}>Email</th>
                        <th style={{ textAlign: "center", padding: "8px 6px", color: "var(--muted)", fontWeight: 700 }}>Role</th>
                        <th style={{ padding: "8px 6px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 6px", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "8px 6px", color: "var(--muted)", fontSize: 13 }}>{s.email}</td>
                          <td style={{ padding: "8px 6px", textAlign: "center" }}>
                            <select
                              value={roleMap[s.id] ?? 3}
                              onChange={(e) => setRoleMap((prev) => ({ ...prev, [s.id]: Number(e.target.value) }))}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>
                            {savedId === s.id ? (
                              <span style={{ color: "green", fontSize: 13, fontWeight: 700 }}>✓ Saved</span>
                            ) : (
                              <button
                                type="button"
                                className="btn btnPrimary"
                                style={{ fontSize: 12, padding: "4px 12px" }}
                                disabled={savingId === s.id}
                                onClick={() => handleRoleSave(s)}
                              >
                                {savingId === s.id ? "Saving..." : "Save"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}