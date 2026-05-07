import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import { availability } from "../data/mock";
import { createEvent } from "../api/events/create-event";
import { getEventPicklist } from "../api/events/get-event-picklist";
import { listStaff } from "../api/staff/list-staff";
import { listEvents } from "../api/events/list-events";
import type { CreateEventRequest, StaffAssignmentRequest } from "../api/events/create-event";
import type { EventPicklistItem } from "../api/events/get-event-picklist";
import type { Assignment, EventInstance, Staff } from "../types/model";
import "../styles/panels.css";

export default function CreateEvent() {
  const nav = useNavigate();

  /* -----------------------------
     Form state
  ----------------------------- */
  const [eventName, setEventName] = useState("");
  const [eventTypeId, setEventTypeId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [shiftStart, setShiftStart] = useState("08:30");
  const [shiftEnd, setShiftEnd] = useState("17:30");
  const [maxAttendees, setMaxAttendees] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "COMPLETED">("DRAFT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -----------------------------
     Picklist + staff
  ----------------------------- */
  const [eventTypes, setEventTypes] = useState<EventPicklistItem[]>([]);
  const [locations, setLocations] = useState<EventPicklistItem[]>([]);
  const [picklistLoading, setPicklistLoading] = useState(true);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  /* -----------------------------
     Assignments (pre-create)
  ----------------------------- */
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  /* All existing events — used to detect cross-event staff conflicts */
  const [allEvents, setAllEvents] = useState<EventInstance[]>([]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [picklist, staffData, eventsData] = await Promise.all([
          getEventPicklist(),
          listStaff(),
          listEvents(),
        ]);
        setEventTypes(picklist.eventTypes);
        setLocations(picklist.locations);
        setStaffList(staffData.staff);
        setAllEvents(eventsData.events);
      } catch (err) {
        setError("Failed to load form options");
        console.error(err);
      } finally {
        setPicklistLoading(false);
        setStaffLoading(false);
      }
    }
    fetchAll();
  }, []);

  /* -----------------------------
     Shift helpers
  ----------------------------- */
  function toMinutes(t?: string): number {
    if (!t) return -1;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  /** Parse "8:30am" / "9:30pm" style strings → "HH:MM". Handles label prefix e.g. "Afternoon 12:30pm - 6:30pm" */
  function parseAmPm(s: string): string {
    const clean = s.trim().replace(/^[A-Za-z\s]+(?=\d)/, "");
    // Allow optional trailing whitespace/chars after the am/pm marker
    const match = clean.match(/^(\d+):(\d+)\s*(am|pm)/i);
    if (!match) return "";
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3].toLowerCase();
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  /** Extract shift start/end from a staff member's first availability slot */
  function staffShiftFromAvailability(s: Staff): { shiftStart: string; shiftEnd: string } {
    if (s.shiftTimes && s.shiftTimes.length > 0) {
      const dashIdx = s.shiftTimes[0].indexOf(" - ");
      if (dashIdx >= 0) {
        return {
          shiftStart: parseAmPm(s.shiftTimes[0].slice(0, dashIdx)),
          shiftEnd:   parseAmPm(s.shiftTimes[0].slice(dashIdx + 3)),
        };
      }
    }
    return { shiftStart: shiftStart || startTime || "", shiftEnd: shiftEnd || endTime || "" };
  }

  /**
   * Returns true if a staff member has at least one availability slot
   * that overlaps with the event's shift/session window.
   * Falls back to startTime/endTime if no explicit shift is set.
   */
  function staffFitsEventShift(s: Staff): boolean {
    const windowStart = shiftStart || startTime;
    const windowEnd   = shiftEnd   || endTime;
    if (!windowStart || !windowEnd) return true;
    if (!s.shiftTimes || s.shiftTimes.length === 0) return true;
    const evStart = toMinutes(windowStart);
    const evEnd   = toMinutes(windowEnd);
    return s.shiftTimes.some((slot) => {
      const dashIdx = slot.indexOf(" - ");
      if (dashIdx < 0) return false;
      const sStart = toMinutes(parseAmPm(slot.slice(0, dashIdx).trim()));
      const sEnd   = toMinutes(parseAmPm(slot.slice(dashIdx + 3).trim()));
      if (sStart < 0 || sEnd < 0) return false;
      return sStart < evEnd && sEnd > evStart;
    });
  }

  function suggestShift(sessionStart: string): { shiftStart: string; shiftEnd: string } | null {
    if (!sessionStart) return null;
    const mins = toMinutes(sessionStart);
    const rules: [number, number, string, string][] = [
      [450,  570,  "08:30", "15:00"],
      [540,  600,  "09:00", "15:30"],
      [600,  690,  "10:00", "14:00"],
      [750,  810,  "12:30", "15:30"],
      [870,  930,  "14:00", "18:00"],
      [980,  990,  "15:00", "16:45"],
      [960, 1020,  "15:30", "18:30"],
      [1020, 1080, "16:00", "18:30"],
      [1080, 1110, "17:30", "20:30"],
      [1080, 1110, "16:30", "21:00"],
      [1140, 1200, "18:30", "21:00"],
      [1140, 1200, "18:30", "21:30"],
    ];
    const match = rules.find(([lo, hi]) => mins >= lo && mins <= hi);
    if (!match) return null;
    return { shiftStart: match[2], shiftEnd: match[3] };
  }

  function hasConflict(staffId: string, myShiftStart: string, myShiftEnd: string): boolean {
    if (!date || !myShiftStart || !myShiftEnd) return false;
    const myStart = toMinutes(myShiftStart);
    const myEnd = toMinutes(myShiftEnd);
    if (myStart < 0 || myEnd < 0) return false;

    // Check holiday
    const onHoliday = availability.some(
      (av) =>
        av.staffId === staffId &&
        av.type === "HOLIDAY" &&
        av.startDate &&
        av.endDate &&
        date >= av.startDate &&
        date <= av.endDate
    );
    if (onHoliday) return true;

    // Check if staff is already assigned to another existing event on the same
    // date whose shift overlaps with the shift being proposed here.
    return allEvents.some((ev) => {
      if (ev.date !== date) return false;
      return (ev.staffAssignments ?? []).some((a) => {
        if (a.staffId !== staffId) return false;
        const s = toMinutes(a.shiftStart);
        const e = toMinutes(a.shiftEnd);
        if (s < 0 || e < 0) return false;
        return myStart < e && myEnd > s;
      });
    });
  }

  /** Returns true if a single shift slot string overlaps the current event's window */
  function slotOverlapsEvent(slot: string): boolean {
    const windowStart = shiftStart || startTime;
    const windowEnd   = shiftEnd   || endTime;
    if (!windowStart || !windowEnd) return true;
    const dashIdx = slot.indexOf(" - ");
    if (dashIdx < 0) return false;
    const sStart = toMinutes(parseAmPm(slot.slice(0, dashIdx).trim()));
    const sEnd   = toMinutes(parseAmPm(slot.slice(dashIdx + 3).trim()));
    if (sStart < 0 || sEnd < 0) return false;
    return sStart < toMinutes(windowEnd) && sEnd > toMinutes(windowStart);
  }

  const assignedStaffIds = assignments.map((a) => a.staffId);

  function toggleAssign(staffId: string) {
    const isAssigned = assignedStaffIds.includes(staffId);
    if (isAssigned) {
      setAssignments((prev) => prev.filter((a) => a.staffId !== staffId));
    } else {
      const staff = staffList.find((s) => s.id === staffId);
      const preferred = staff ? staffShiftFromAvailability(staff) : { shiftStart: shiftStart || "", shiftEnd: shiftEnd || "" };
      setAssignments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          eventInstanceId: "", // filled after create
          staffId,
          shiftStart: preferred.shiftStart,
          shiftEnd: preferred.shiftEnd,
          role: "",
        },
      ]);
    }
  }

  /* -----------------------------
     Submit
  ----------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const eventType = eventTypes.find((t) => t.id === Number(eventTypeId));
      const location = locations.find((l) => l.id === Number(locationId));
      const [year, month, day] = date.split("-");
      const formattedDate = `${day}/${month}/${year}`;
      const body: CreateEventRequest = {
        eventName,
        eventType: eventType?.name ?? String(eventTypeId),
        description: description || undefined,
        eventDate: formattedDate,
        startTime,
        endTime,
        shiftStart: shiftStart || undefined,
        shiftEnd: shiftEnd || undefined,
        location: location?.name ?? String(locationId),
        status,
        maxAttendees: maxAttendees || undefined,
        staffAssignments: assignments.length > 0
          ? assignments.map((a): StaffAssignmentRequest => {
              const staffMember = staffList.find((s) => s.id === a.staffId);
              return {
                staffId: Number(a.staffId),
                staffTypeId: staffMember?.staffTypeId ?? undefined,
                roleId: staffMember?.roleId ?? undefined,
                role: a.role || "Staff",
                shiftStart: a.shiftStart || undefined,
                shiftEnd: a.shiftEnd || undefined,
              };
            })
          : undefined,
      };
      await createEvent(body);
      console.log("✅ Event created, assignments:", assignments);
      nav("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
      console.error("Error creating event:", err);
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------
     Render
  ----------------------------- */
  return (
    <Page>
      <div className="panel" role="region" aria-label="Create Event" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="panelHeader teal">Create Event</div>

        <div className="panelBody" style={{ maxWidth: "100%" }}>
          {error && (
            <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }} role="alert">
              ⚠️ {error}
            </div>
          )}
          {picklistLoading && (
            <div style={{ textAlign: "center", padding: 12, color: "var(--muted)" }}>
              ⏳ Loading form options...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ==========================
                EVENT DETAILS
            ========================== */}
            <div className="grid2">
              <div className="field">
                <span>Event Name</span>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Spring Community Fair"
                  required
                />
              </div>

              <div className="field">
                <span>Event Type</span>
                <select
                  value={eventTypeId}
                  onChange={(e) => setEventTypeId(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  disabled={picklistLoading}
                >
                  <option value="">Select event type</option>
                  {eventTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical" }}
                  placeholder="Event description (optional)"
                />
              </div>

              <div className="field">
                <span>Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "DRAFT" | "SCHEDULED" | "COMPLETED")}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="field">
                <span>📅 Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>Location</span>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  disabled={picklistLoading}
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>🕐 Session Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>🕐 Session End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <span>👥 Max Attendees</span>
                <input
                  type="number"
                  min={0}
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div className="field">
                <span>Required Qualifications</span>
                <input
                  type="text"
                  placeholder="e.g. First Aid, Music"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                />
              </div>

              {/* Staff Shift Times */}
              <div style={{ gridColumn: "1 / -1", marginTop: 4, marginBottom: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>🧑‍💼 Staff Shift Times</span>
                <span style={{ fontSize: 12, color: "var(--muted, #666)", marginLeft: 6 }}>
                  (arrive before / leave after the session — default for all staff)
                </span>
              </div>

              <div className="field">
                <span>Shift Start</span>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                />
              </div>

              <div className="field">
                <span>Shift End</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btnOutline"
                    style={{ fontSize: 11, whiteSpace: "nowrap", padding: "4px 8px" }}
                    title="Auto-suggest shift times based on session start time"
                    onClick={() => {
                      const s = suggestShift(startTime);
                      if (s) { setShiftStart(s.shiftStart); setShiftEnd(s.shiftEnd); }
                      else alert("No suggestion available for this session time.");
                    }}
                  >
                    ✨ Suggest
                  </button>
                </div>
              </div>
            </div>

            {/* ==========================
                STAFF ASSIGNMENT HEADER
            ========================== */}
            <div style={{ marginTop: 32, marginBottom: 8, fontWeight: 900, fontSize: 16 }}>
              Staff Assignment
            </div>

            {/* ==========================
                STAFF ASSIGNMENT TABLE
            ========================== */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="muted" style={{ fontSize: 13 }}>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Role</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }} colSpan={2}>Shift Times</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Status</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--muted)" }}>
                      ⏳ Loading staff...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--muted)" }}>
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  staffList.filter((s) => assignedStaffIds.includes(s.id) || staffFitsEventShift(s)).map((s) => {
                    const isAssigned = assignedStaffIds.includes(s.id);
                    const assignment = assignments.find((a) => a.staffId === s.id);
                    const staffShiftStart = assignment?.shiftStart ?? shiftStart;
                    const staffShiftEnd = assignment?.shiftEnd ?? shiftEnd;
                    const conflict = isAssigned && hasConflict(s.id, staffShiftStart, staffShiftEnd);
                    const isUnavailable = !isAssigned && s.shiftTimes && s.shiftTimes.length > 0 && !staffFitsEventShift(s);

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderTop: "1px solid var(--border)",
                          background: conflict ? "#fff8f0" : isUnavailable ? "#fafafa" : undefined,
                        }}
                      >
                        <td style={{ padding: "6px 8px", fontWeight: 600 }}>
                          {s.name}
                          {conflict && (
                            <span
                              title="Shift conflict: holiday or overlapping assignment"
                              style={{ marginLeft: 6, color: "#e65c00", fontSize: 14 }}
                            >⚠️</span>
                          )}
                        </td>

                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ fontSize: 13, color: "var(--muted, #888)" }}>
                            {s.roleLabel ?? s.staffTypeName ?? "—"}
                          </span>
                        </td>

                        <td style={{ padding: "6px 8px", colSpan: 2 } as React.CSSProperties}>
                          {s.shiftTimes && s.shiftTimes.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {s.shiftTimes.map((slot, i) => {
                                const overlaps = slotOverlapsEvent(slot);
                                return (
                                  <span
                                    key={i}
                                    title={!overlaps ? "Unavailable — this slot does not cover the event shift window" : undefined}
                                    style={{
                                      fontSize: 11,
                                      background: !overlaps
                                        ? "#f5f5f5"
                                        : isAssigned
                                        ? "var(--teal, #e0f5f0)"
                                        : "var(--surface, #f5f5f5)",
                                      border: `1px solid ${!overlaps ? "#ddd" : "var(--border)"}`,
                                      borderRadius: 4,
                                      padding: "2px 6px",
                                      whiteSpace: "nowrap",
                                      fontWeight: isAssigned && overlaps ? 600 : 400,
                                      color: !overlaps ? "#aaa" : undefined,
                                      textDecoration: !overlaps ? "line-through" : undefined,
                                    }}
                                  >
                                    {!overlaps ? "�" : "�🕐"} {slot}
                                    {!overlaps && (
                                      <span style={{ marginLeft: 4, fontSize: 10, fontStyle: "italic" }}>
                                        Unavailable
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted, #aaa)" }}>No shifts set</span>
                          )}
                        </td>

                        <td style={{ padding: "6px 8px", fontSize: 13 }}>
                          {conflict ? (
                            <span className="chip" style={{ background: "#ffe0c0", color: "#b94a00" }}>⚠️ Conflict</span>
                          ) : isUnavailable ? (
                            <span className="chip" style={{ background: "#f0f0f0", color: "#888" }}>🚫 Unavailable</span>
                          ) : isAssigned ? (
                            <span className="chip chipSuccess">Assigned</span>
                          ) : (
                            <span className="chip chipNeutral">Available</span>
                          )}
                        </td>

                        <td style={{ padding: "6px 8px" }}>
                          <button
                            type="button"
                            className={isAssigned ? "btn btnOutline" : "btn btnPrimary"}
                            style={{ fontSize: 12 }}
                            onClick={() => toggleAssign(s.id)}
                          >
                            {isAssigned ? "Unassign" : "Assign"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* ==========================
                ACTIONS
            ========================== */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btnOutline" onClick={() => nav("/events")} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btnPrimary" disabled={loading}>
                {loading ? "⏳ Creating..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Page>
  );
}