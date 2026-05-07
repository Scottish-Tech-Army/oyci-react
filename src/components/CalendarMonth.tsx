import type { EventInstance, EventType } from "../types/model";
import "../styles/calendar.css";

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function CalendarMonth({
  year,
  month, // 0-based
  events,
  getType,
  onSelectEvent,
}: {
  year: number;
  month: number;
  events: EventInstance[];
  getType: (id: string) => EventType | undefined;
  onSelectEvent: (eventId: string) => void;
}) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const total = daysInMonth(year, month);

  const cells: (number | null)[] = Array(startDay).fill(null).concat(
    Array.from({ length: total }, (_, i) => i + 1)
  );

  const monthStr = String(month + 1).padStart(2, "0");
  const monthEvents = events.filter((e) => e.date.startsWith(`${year}-${monthStr}-`));

  return (
    <div className="cal">

      <div className="calGrid">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <div key={d} className="calDow">{d}</div>
        ))}

        {cells.map((day, idx) => {
          const dayStr = day ? String(day).padStart(2, "0") : null;
          const dateKey = dayStr ? `${year}-${monthStr}-${dayStr}` : null;
          const dayEvents = dateKey ? monthEvents.filter((e) => e.date === dateKey) : [];

          return (
            <div key={idx} className="calCell">
              {day ? <div className="calDay">{day}</div> : null}
              {dayEvents.map((e) => {
                const t = getType(e.eventTypeName || "");
                const typeName = t?.name ?? e.eventTypeName ?? "";
                return (
                  <button
                    key={e.id}
                    className="calPill"
                    onClick={() => onSelectEvent(e.id)}
                    title={typeName ? `${typeName} — click to open` : "Open Staff Assignment"}
                  >
                    {e.name ?? typeName ?? "Event"}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}