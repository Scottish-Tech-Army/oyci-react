import type { Staff } from "../types/model";
import "../styles/cards.css";

export default function StaffCard({
  staff,
  onEdit,
  onDelete,
}: {
  staff: Staff;
  onEdit: (staffId: string) => void;
  onDelete: (staffId: string) => void;
}) {
  // Use name, or fallback to firstName + lastName, or email
  const displayName = staff.name ||
    [staff.firstName, staff.lastName].filter(Boolean).join(" ") ||
    staff.email.split("@")[0];

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  // Get qualification to display
  const qualification = staff.qualificationName || staff.qualifications?.[0] || null;

  return (
    <div className="card" style={{ position: "relative", padding: 12 }}>
      {/* ✅ Content block (same pattern as EventCard) */}
      <div style={{ paddingRight: 80 }}>
        {/* Header row: avatar + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#edf2f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              fontWeight: 600,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {staff.photoUrl ? (
              <img
                src={staff.photoUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>

          {/* Name */}
          <div
            className="cardTitle"
            style={{
              fontSize: 14,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </div>

          {/* Active badge */}
          <span
            className={`chip ${staff.isActive ? "chipSuccess" : "chipNeutral"}`}
            style={{ fontSize: 10, padding: "1px 6px", flexShrink: 0 }}
          >
            {staff.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* ✅ Compact details (same density as EventCard) */}
        {staff.roleLabel && (
          <div className="cardSub" style={{ marginBottom: 2, fontWeight: 600, color: "var(--teal)" }}>
            {staff.roleLabel}
          </div>
        )}

        {qualification && (
          <div className="cardSub" style={{ marginBottom: 2, fontSize: 12, fontWeight: 600, color: "var(--pink)" }}>
            <span aria-label="Qualification">🎓</span> {qualification}
          </div>
        )}

        <div className="cardSub" style={{ marginBottom: 2, fontSize: 12 }}>
          <span aria-label="Email">✉️</span> {staff.email}
        </div>

        {staff.phone && (
          <div className="cardSub" style={{ marginBottom: 2, fontSize: 12 }}>
            <span aria-label="Phone">📞</span> {staff.phone}
          </div>
        )}

        {staff.weeklyHoursCap !== undefined && staff.weeklyHoursCap > 0 && (
          <div className="cardSub" style={{ fontSize: 12 }}>
            <span aria-label="Weekly hours">⏱️</span> {staff.weeklyHoursCap}h/week
          </div>
        )}
      </div>

      {/* ✅ Actions – BOTTOM RIGHT (same as EventCard) */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          gap: 6,
        }}
      >
        <button
          type="button"
          className="btn btnSecondary"
          aria-label={`Edit ${displayName}`}
          title="Edit"
          style={{ padding: "6px 10px" }}
          onClick={() => onEdit(staff.id)}
        >
          ✏️
        </button>

        <button
          type="button"
          className="btn btnSecondary"
          aria-label={`Delete ${displayName}`}
          title="Delete"
          style={{ padding: "6px 10px" }}
          onClick={() => onDelete(staff.id)}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}