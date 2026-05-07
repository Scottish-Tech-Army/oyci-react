import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Page from "../components/Page";
import StaffForm from "./StaffForm";
import { getStaff, updateStaff } from "../api/staff";
import type { Staff } from "../types/model";
import "../styles/panels.css";

export default function EditStaff() {
  const nav = useNavigate();
  const { staffId } = useParams<{ staffId: string }>();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStaff() {
      if (!staffId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getStaff(staffId);
        setStaff(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load staff");
        console.error("Error fetching staff:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, [staffId]);

  async function handleSave(updated: Staff) {
    if (!staffId) return;

    if (!updated.staffTypeId || updated.staffTypeId <= 0) {
      setUpdateError("Please select a valid Staff Type before saving.");
      return;
    }

    try {
      setSubmitting(true);
      setUpdateError(null);

      // Normalise roleId — the API may return values like 4 (Coordinator) which
      // the update endpoint doesn't accept. Map to 1 (Admin) or 3 (Staff) only.
      const normalizedRoleId = updated.isAdmin ? 1 : (updated.roleId === 1 ? 1 : 3);

      const payload = {
        staffId: Number(staffId),
        userId: staff?.id ? Number(staff.id) : undefined,
        firstName: updated.firstName!,
        middleName: updated.middleName || undefined,
        lastName: updated.lastName!,
        primaryEmail: updated.email,
        primaryPhone: updated.phone,
        addressLine1: updated.addressLine1 || undefined,
        city: updated.city || undefined,
        country: updated.country || undefined,
        postcode: updated.postcode || undefined,
        roleId: normalizedRoleId,
        staffTypeId: updated.staffTypeId!,
        staffTypeName: updated.staffTypeName || undefined,
        qualificationId: updated.qualificationId || undefined,
        qualificationName: updated.qualificationName || undefined,
        weeklyHoursCap: updated.weeklyHoursCap,
        preferredShiftTimes: updated.shiftTimes,
        isActive: updated.isActive ?? true,
      };

      console.log("📤 Update Staff Payload:", JSON.stringify(payload, null, 2));

      const saved = await updateStaff(staffId, payload);

      // Update local staff state from the confirmed API response
      setStaff((prev) => prev ? {
        ...prev,
        firstName: saved.firstName,
        middleName: saved.middleName ?? "",
        lastName: saved.lastName,
        email: saved.primaryEmail,
        phone: saved.primaryPhone,
        addressLine1: saved.addressLine1 ?? "",
        city: saved.city ?? "",
        country: saved.country ?? "",
        postcode: saved.postcode ?? "",
        roleId: saved.roleId,
        isAdmin: saved.roleId === 1,
        staffTypeId: saved.staffTypeId,
        staffTypeName: saved.staffTypeName,
        qualificationId: saved.qualificationId,
        qualificationName: saved.qualificationName ?? "",
        weeklyHoursCap: saved.weeklyHoursCap ?? 40,
        shiftTimes: saved.preferredShiftTimes ?? [],
        isActive: saved.isActive,
      } : prev);

      console.log("✅ Staff updated:", saved);
      nav("/staff");
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update staff");
      console.error("Error updating staff:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      {/* Loading state */}
      {loading && (
        <div className="panel">
          <div className="panelHeader yellow">Edit Staff</div>
          <div className="panelBody">
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
              }}
            >
              Loading staff...
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="panel">
          <div className="panelHeader yellow">Edit Staff</div>
          <div className="panelBody">
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--error, red)",
              }}
              role="alert"
            >
              {error}
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="btn btnOutline" onClick={() => nav("/staff")}>
                Back to Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && staff && (
        <div className="panel" role="region" aria-label="Edit Staff" style={{ maxWidth: 800, margin: "0 auto" }}>
          <div className="panelHeader yellow">Edit Staff</div>

          <div className="panelBody">
            {updateError && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 16,
                  backgroundColor: "var(--error-bg, #fee)",
                  color: "var(--error, red)",
                  borderRadius: 8,
                  fontSize: 14,
                }}
                role="alert"
              >
                {updateError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <StaffForm
                initial={staff}
                onSave={handleSave}
                onCancel={() => nav("/staff")}
                isEditing={true}
              />
            </div>

            {submitting && (
              <div
                style={{
                  textAlign: "center",
                  padding: 12,
                  color: "var(--muted)",
                }}
              >
                Updating staff...
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}