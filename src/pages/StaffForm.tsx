import { useState, useEffect, useRef } from "react";
import type { Staff } from "../types/model";
import { getQualifications, getStaffTypes } from "../api/staff";
import type { Qualification, StaffType } from "../api/staff";
import "../styles/panels.css";

const SHIFT_OPTIONS = [
  { label: "Full Day   8:30am – 9:30pm",  value: "Full Day 8:30am - 9:30pm" },
  { label: "Morning   8:30am – 3:30pm",  value: "Morning 8:30am - 3:30pm" },
  { label: "Afternoon 12:30pm – 6:30pm", value: "Afternoon 12:30pm - 6:30pm" },
  { label: "Evening   4:30pm – 9:00pm",  value: "Evening 4:30pm - 9:00pm" },
  { label: "Late      6:30pm – 9:30pm",  value: "Late 6:30pm - 9:30pm" },
];

export default function StaffForm({
  initial,
  onSave,
  onCancel,
  isEditing = false,
}: {
  initial?: Partial<Staff>;
  onSave: (staff: Staff) => void;
  onCancel: () => void;
  isEditing?: boolean;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [middleName, setMiddleName] = useState(initial?.middleName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  void password; void setPassword; // removed from UI, kept for API compat if needed
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "UK");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [staffTypeId, setStaffTypeId] = useState<string>(initial?.staffTypeId?.toString() ?? "");
  const [qualificationId, setQualificationId] = useState<string>(initial?.qualificationId?.toString() ?? "");
  const [weeklyHoursCap, setWeeklyHoursCap] = useState(
    initial?.weeklyHoursCap ?? 40
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [roleId, setRoleId] = useState<number>(initial?.isAdmin ? 1 : 3);
  const [shiftTimes, setShiftTimes] = useState<string[]>(
    initial?.shiftTimes ?? []
  );

  // Guard: only seed form fields once when initial data first arrives.
  // Without this, every parent re-render (e.g. setSubmitting) passes a new
  // object reference for `initial`, causing the effect to re-run and wipe
  // any edits the user has made.
  const seeded = useRef(false);

  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [staffTypes, setStaffTypes] = useState<StaffType[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dropdown options once on mount
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [qualsData, typesData] = await Promise.all([
          getQualifications(),
          getStaffTypes(),
        ]);
        setQualifications(qualsData);
        setStaffTypes(typesData);
      } catch (err) {
        console.error("Failed to load dropdowns:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDropdowns();
  }, []);

  // Single effect: populate ALL fields when initial data first arrives.
  // The seeded ref ensures we only do this once — subsequent re-renders of the
  // parent (e.g. setSubmitting) create a new `initial` reference but must NOT
  // reset fields the user has already edited.
  useEffect(() => {
    if (!initial) return;
    if (seeded.current) return; // already seeded — don't overwrite user edits
    seeded.current = true;

    setFirstName(initial.firstName ?? "");
    setMiddleName(initial.middleName ?? "");
    setLastName(initial.lastName ?? "");
    setEmail(initial.email ?? "");
    setPhone(initial.phone ?? "");
    setAddressLine1(initial.addressLine1 ?? "");
    setCity(initial.city ?? "");
    setCountry(initial.country ?? "UK");
    setPostcode(initial.postcode ?? "");
    setWeeklyHoursCap(initial.weeklyHoursCap ?? 40);
    setIsActive(initial.isActive ?? true);
    // Normalise: API may return roleId values like 4 (Coordinator). The form
    // only supports 1 (Admin) or 3 (Staff) — anything else maps to Staff.
    const resolvedRoleId = initial.roleId === 1 ? 1 : 3;
    setRoleId(resolvedRoleId);
    setShiftTimes(initial.shiftTimes ?? []);

    // Resolve staffTypeId — use numeric ID if valid, else name-match
    if (initial.staffTypeId != null && initial.staffTypeId > 0) {
      setStaffTypeId(initial.staffTypeId.toString());
    } else if (staffTypes.length > 0) {
      const match = staffTypes.find(
        t => t.name.trim().toLowerCase() === (initial.staffTypeName ?? "").trim().toLowerCase()
      );
      setStaffTypeId(match?.staffTypeId.toString() ?? "");
    }

    // Resolve qualificationId — use numeric ID if valid, else name-match
    if (initial.qualificationId != null && initial.qualificationId > 0) {
      setQualificationId(initial.qualificationId.toString());
    } else if (qualifications.length > 0) {
      const match = qualifications.find(
        q => q.name.trim().toLowerCase() === (initial.qualificationName ?? "").trim().toLowerCase()
      );
      setQualificationId(match?.qualificationId.toString() ?? "");
    }
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  // When dropdowns finish loading, re-resolve IDs in case initial arrived first
  useEffect(() => {
    if (!initial || staffTypes.length === 0) return;
    if (!staffTypeId || staffTypeId === "") {
      if (initial.staffTypeId != null && initial.staffTypeId > 0) {
        setStaffTypeId(initial.staffTypeId.toString());
      } else {
        const match = staffTypes.find(
          t => t.name.trim().toLowerCase() === (initial.staffTypeName ?? "").trim().toLowerCase()
        );
        setStaffTypeId(match?.staffTypeId.toString() ?? "");
      }
    }
  }, [staffTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initial || qualifications.length === 0) return;
    if (!qualificationId || qualificationId === "") {
      if (initial.qualificationId != null && initial.qualificationId > 0) {
        setQualificationId(initial.qualificationId.toString());
      } else {
        const match = qualifications.find(
          q => q.name.trim().toLowerCase() === (initial.qualificationName ?? "").trim().toLowerCase()
        );
        setQualificationId(match?.qualificationId.toString() ?? "");
      }
    }
  }, [qualifications]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleShift(shift: string) {
    setShiftTimes((prev) =>
      prev.includes(shift) ? prev.filter((s) => s !== shift) : [...prev, shift]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ");

    const selectedStaffType = staffTypes.find((t) => t.staffTypeId.toString() === staffTypeId);
    const selectedQualification = qualifications.find((q) => q.qualificationId.toString() === qualificationId);

    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: fullName,
      firstName,
      middleName,
      lastName,
      email,
      phone,
      password: !isEditing ? password : undefined,
      addressLine1: addressLine1 || undefined,
      city: city || undefined,
      country: country || undefined,
      postcode: postcode || undefined,
      staffTypeId: staffTypeId === "" ? undefined : Number(staffTypeId),
      staffTypeName: selectedStaffType?.name,
      qualificationId: qualificationId === "" ? undefined : Number(qualificationId),
      qualificationName: selectedQualification?.name,
      weeklyHoursCap: Number(weeklyHoursCap),
      isActive,
      isAdmin: roleId === 1,
      roleId,
      shiftTimes,
    } as Staff);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
        Loading form...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      {/* First + Middle Name */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label>First Name</label>
          <input
            style={{ width: "100%" }}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Middle Name</label>
          <input
            style={{ width: "100%" }}
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
        </div>
      </div>

      {/* Last Name + Role */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label>Last Name</label>
          <input
            style={{ width: "100%" }}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Role</label>
          <select
            style={{ width: "100%" }}
            value={roleId}
            onChange={(e) => setRoleId(Number(e.target.value))}
          >
            <option value={3}>Staff</option>
            <option value={1}>Admin</option>
          </select>
        </div>
      </div>

      {/* Email + Phone */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label>✉️ Email</label>
          <input
            style={{ width: "100%" }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>📞 Phone</label>
          <input
            style={{ width: "100%" }}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Password (only for new staff) */}

      {/* Address */}
      <div className="field">
        <label>📍 Address Line 1</label>
        <input
          style={{ width: "100%" }}
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="e.g. 123 High Street"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label>City</label>
          <input
            style={{ width: "100%" }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. London"
          />
        </div>
        <div className="field">
          <label>Country</label>
          <input
            style={{ width: "100%" }}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. UK"
          />
        </div>
        <div className="field">
          <label>Postcode</label>
          <input
            style={{ width: "100%" }}
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="e.g. SW1A 1AA"
          />
        </div>
      </div>

      {/* Staff Type + Qualification */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label>Type</label>
          <select
            style={{ width: "100%" }}
            value={staffTypeId}
            onChange={(e) => setStaffTypeId(e.target.value)}
            required
          >
            <option value="">Select ype</option>
            {staffTypes.map((type) => (
              <option key={type.staffTypeId} value={type.staffTypeId.toString()}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Qualification</label>
          <select
            style={{ width: "100%" }}
            value={qualificationId}
            onChange={(e) => setQualificationId(e.target.value)}
          >
            <option value="">Select Qualification (Optional)</option>
            {qualifications.map((qual) => (
              <option key={qual.qualificationId} value={qual.qualificationId.toString()}>
                {qual.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Hours + Active */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "flex-end" }}>
        <div className="field">
          <label>Weekly Hours Cap</label>
          <input
            style={{ width: "100%" }}
            type="number"
            min={0}
            value={weeklyHoursCap}
            onChange={(e) => setWeeklyHoursCap(Number(e.target.value))}
          />
        </div>

        <div className="field fieldCheckbox" style={{ paddingBottom: 8 }}>
          <label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>

      {/* Preferred Shift Times */}
      <div className="field" style={{ marginTop: 8 }}>
        <label style={{ fontWeight: 700, marginBottom: 6, display: "block" }}>
          🧑‍💼 Preferred Shift Times
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: "6px 10px" }}>
          {SHIFT_OPTIONS.map((opt) => (
            <>
              <input
                key={`cb-${opt.value}`}
                type="checkbox"
                id={`shift-${opt.value}`}
                checked={shiftTimes.includes(opt.value)}
                onChange={() => toggleShift(opt.value)}
                style={{ margin: 0, cursor: "pointer" }}
              />
              <label
                key={`lbl-${opt.value}`}
                htmlFor={`shift-${opt.value}`}
                style={{ fontSize: 13, cursor: "pointer", fontFamily: "monospace", whiteSpace: "nowrap" }}
              >
                {opt.label}
              </label>
            </>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btnOutline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btnPrimary">
          Save
        </button>
      </div>
    </form>
  );
}