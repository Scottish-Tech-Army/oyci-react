import type { EventInstance, EventType, Location } from "../types/model";
import { formatDate, formatTime } from "../utils/date";
import "../styles/cards.css";

export default function EventCard({
  event,
  type,
  location,
  onEdit,
  onDelete,
}: {
  event: EventInstance;
  type: EventType;
  location: Location;
  onAssign: (eventId: string) => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}) {
  const statusClass =
    event.status === "SCHEDULED"
      ? "chipSuccess"
      : event.status === "DRAFT"
      ? "chipWarn"
      : "chipNeutral";

  return (
    <div className="card" style={{ position: "relative" }}>
      {/* ✅ Status chip – TOP RIGHT */}
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <span className={`chip ${statusClass}`}>{event.status}</span>
      </div>

      <div className="cardRow" style={{ gap: 12 }}>
        {/* ✅ Main content (LEFT) */}
        <div style={{ flex: 1 }}>
          {event.name && <div className="cardTitle">{event.name}</div>}
          
          <div className="cardSub" style={{ fontWeight: 600, marginTop: 4 }}>
            {type.name}
          </div>

          <div className="cardSub">
            <span aria-hidden="true">📅</span> {formatDate(event.date)}
          </div>

          {event.time && (
            <div className="cardSub">
              <span aria-hidden="true">🕐</span> {formatTime(event.time)}
            </div>
          )}

          <div className="cardSub">
            <span aria-hidden="true">📍</span> {location.name}
          </div>

          {event.maxAttendees != null && (
            <div className="cardSub">
              <span aria-hidden="true">👥</span>{" "}
              {event.maxAttendees} attendees
            </div>
          )}
        </div>
      </div>

      {/* ✅ Actions – BOTTOM RIGHT */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          gap: 6,
        }}
      >

        {/* Edit */}
        <button
          type="button"
          className="btn btnSecondary"
          aria-label={`Edit ${type.name}`}
          title="Edit event"
          style={{ padding: "6px 10px" }}
          onClick={() => onEdit(event.id)}
        >
          ✏️
        </button>

        {/* Delete */}
        <button
          type="button"
          className="btn btnSecondary"
          aria-label={`Delete ${type.name}`}
          title="Delete event"
          style={{ padding: "6px 10px" }}
          onClick={() => onDelete(event.id)}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}