import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Page from "../components/Page";
import { availability } from "../data/mock";
import { getEvent } from "../api/events";
import { updateEvent } from "../api/events/update-event";
import { getEventPicklist } from "../api/events/get-event-picklist";
import { listStaff } from "../api/staff/list-staff";
import { listEvents } from "../api/events/list-events";
import type { EventPicklistItem } from "../api/events/get-event-picklist";
import type { Assignment, EventInstance, Staff } from "../types/model";
import "../styles/panels.css";

export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const nav = useNavigate();

  const [event, setEvent] = useState<EventInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Picklist data from API
  const [locations, setLocations] = useState<EventPicklistItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventPicklistItem[]>([]);

  /* -----------------------------
     Event form state
  ----------------------------- */
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationId, setLocationId] = useState("");
  const [maxAttendees, setMaxAttendees] = useState(0);
  const [qualifications, setQualifications] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "COMPLETED">("DRAFT");

  // Local assignment state (seeded from mock, supports per-staff overrides)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* All existing events — used to detect cross-event staff conflicts */
  const [allEvents, setAllEvents] = useState<EventInstance[]>([]);

  useEffect(() => {
    async function fetchAll() {
      if (!eventId) return;

      try {
        setLoading(true);
        setError(null);

        const [data, picklist, staffData, eventsData] = await Promise.all([
          getEvent(eventId),
          getEventPicklist(),
          listStaff(),
          listEvents(),
        ]);

        setEvent(data);
        setLocations(picklist.locations);
        setEventTypes(picklist.eventTypes);
        setStaffList(staffData.staff);
        setAllEvents(eventsData.events);

        // Initialize form fields
        setEventName(data.name || "");
        setDescription(data.description || "");
        setDate(data.date);
        setStartTime(data.time || "");
        setEndTime(data.endTime || "");
        setShiftStart(data.shiftStart || "");
        setShiftEnd(data.shiftEnd || "");
        setLocationId(data.locationId);
        setMaxAttendees(data.maxAttendees ?? 0);
        setQualifications("");
        setStatus(data.status ?? "DRAFT");
        // Seed assignments from API response staffAssignments
        if (data.staffAssignments && data.staffAssignments.length > 0) {
          setAssignments(
            data.staffAssignments.map((a) => ({
              id: a.id ?? crypto.randomUUID(),
              eventInstanceId: String(data.id),
              staffId: String(a.staffId),
              role: a.role ?? "",
              shiftStart: a.shiftStart ?? data.shiftStart ?? "",
              shiftEnd: a.shiftEnd ?? data.shiftEnd ?? "",
            }))
          );
        } else {
          setAssignments([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
        console.error("Error fetching event:", err);
      } finally {
        setLoading(false);
        setStaffLoading(false);
      }
    }

    fetchAll();
  }, [eventId]);

  /* -----------------------------
     Staff assignment helpers
  ----------------------------- */
  const assignedStaffIds = assignments.map((a) => a.staffId);

  /** Parse "HH:MM" into total minutes for comparison */
  function toMinutes(t?: string): number {
    if (!t) return -1;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  /** Parse "8:30am" / "9:30pm" style strings → total minutes. Handles label prefix e.g. "Afternoon 12:30pm - 6:30pm" */
  function parseAmPm(s: string): string {
    // Strip any leading label words (e.g. "Afternoon ", "Morning ")
    const clean = s.trim().replace(/^[A-Za-z\s]+(?=\d)/, "");
    // Allow optional whitespace before am/pm and don't require strict end anchor
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
      const parts = s.shiftTimes[0].split(" - ");
      if (parts.length === 2) {
        return { shiftStart: parseAmPm(parts[0]), shiftEnd: parseAmPm(parts[1]) };
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
    // Use shiftStart/shiftEnd if set, otherwise fall back to event startTime/endTime
    const windowStart = shiftStart || startTime;
    const windowEnd   = shiftEnd   || endTime;
    if (!windowStart || !windowEnd) return true;
    if (!s.shiftTimes || s.shiftTimes.length === 0) return true;
    const evStart = toMinutes(windowStart);
    const evEnd   = toMinutes(windowEnd);
    return s.shiftTimes.some((slot) => {
      // Split on " - " but the slot may have a label prefix like "Afternoon 12:30pm - 6:30pm"
      const dashIdx = slot.indexOf(" - ");
      if (dashIdx < 0) return false;
      const rawStart = slot.slice(0, dashIdx).trim();
      const rawEnd   = slot.slice(dashIdx + 3).trim();
      const sStart = toMinutes(parseAmPm(rawStart));
      const sEnd   = toMinutes(parseAmPm(rawEnd));
      if (sStart < 0 || sEnd < 0) return false;
      return sStart < evEnd && sEnd > evStart;
    });
  }

  /**
   * Returns true if this staff member has a conflict on the same day:
   * - A holiday covering this date
   * - Assigned to another *different* event on the same date with an overlapping shift
   */
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

    // Check if staff is already assigned to a *different* existing event on the
    // same date whose shift overlaps the proposed shift.
    return allEvents.some((ev) => {
      if (ev.date !== date || ev.id === event?.id) return false; // skip the current event
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
          eventInstanceId: event!.id,
          staffId,
          shiftStart: preferred.shiftStart,
          shiftEnd: preferred.shiftEnd,
          role: "",
        },
      ]);
    }
  }

  /**
   * Suggest a staff shift window based on the session start time.
   * Rules derived from the schedule:
   *   Session start  →  shift start / shift end
   *   ~07:30–09:30   →  09:00 – 15:30  (morning training / Hi5)
   *   ~10:00–11:00   →  10:00 – 14:00  (staff meeting / half-day)
   *   ~12:30–13:30   →  12:30 – 15:30  (Crafts afternoon)
   *   ~15:00–16:00   →  14:00 – 18:00  (ASC 3:30-5:30pm)
   *   ~16:20–16:30   →  15:00 – 16:45  (FFF 3:20-4:30pm)
   *   ~16:00–16:59   →  15:30 – 18:30  (Junior Youth Club / Youth Theatre 4:30)
   *   ~17:00–17:59   →  16:00 – 18:30  (Codesign 4:30-6pm)
   *   ~18:00–18:30   →  16:30 – 21:00  (Festival of Light / Connect)
   *   ~18:00–18:30   →  17:30 – 20:30  (Volunteering 6-8pm) — use 17:30-20:30
   *   ~19:00–19:30   →  18:30 – 21:00  (Youth Theatre 7-8:30)
   *   ~19:00–19:30   →  18:30 – 21:30  (Gaming / Connect 7-9pm)
   * We pick the closest match by session start minute-of-day.
   */
  function suggestShift(sessionStart: string): { shiftStart: string; shiftEnd: string } | null {
    if (!sessionStart) return null;
    const mins = toMinutes(sessionStart);
    // [sessionStartMin, sessionStartMax, shiftStart, shiftEnd]
    const rules: [number, number, string, string][] = [
      [450,  570,  "08:30", "15:00"],  // 07:30–09:30 → Hi5 / morning
      [540,  600,  "09:00", "15:30"],  // 09:00–10:00 → Staff training
      [600,  690,  "10:00", "14:00"],  // 10:00–11:30 → Staff meeting
      [750,  810,  "12:30", "15:30"],  // 12:30–13:30 → Crafts
      [870,  930,  "14:00", "18:00"],  // 14:30–15:30 → ASC 3:30pm
      [980,  990,  "15:00", "16:45"],  // 16:20      → FFF
      [960, 1020,  "15:30", "18:30"],  // 16:00–17:00 → Junior Youth Club
      [1020, 1080, "16:00", "18:30"],  // 17:00–18:00 → Codesign / Youth Theatre
      [1080, 1110, "16:30", "21:00"],  // 18:00–18:30 → Festival / Connect evening
      [1080, 1110, "17:30", "20:30"],  // 18:00–18:30 → Volunteering
      [1140, 1200, "18:30", "21:00"],  // 19:00–20:00 → Youth Theatre 7pm
      [1140, 1200, "18:30", "21:30"],  // 19:00–20:00 → Gaming / Connect 7-9pm
    ];
    // Find rule whose range contains mins (pick first match)
    const match = rules.find(([lo, hi]) => mins >= lo && mins <= hi);
    if (!match) return null;
    return { shiftStart: match[2], shiftEnd: match[3] };
  }

  async function saveEvent() {
    if (!event) return;
    try {
      setSaving(true);
      setSaveError(null);

      // Format date back to DD/MM/YYYY for the API
      const [year, month, day] = date.split("-");
      const formattedDate = `${day}/${month}/${year}`;

      // Resolve location name from picklist (API expects name, not ID)
      const locationName =
        locations.find((l) => String(l.id) === String(locationId))?.name ??
        locationId;

      // Resolve event type name from picklist
      const eventTypeName =
        eventTypes.find((t) => t.name === event.eventTypeName)?.name ??
        event.eventTypeName ??
        undefined;

      await updateEvent(event.id, {
        eventName,
        eventType: eventTypeName,
        description: description || undefined,
        eventDate: formattedDate,
        startTime,
        endTime,
        shiftStart: shiftStart || undefined,
        shiftEnd: shiftEnd || undefined,
        location: locationName,
        status,
        maxAttendees: maxAttendees || undefined,
        staffAssignments: assignments.length > 0
          ? assignments.map((a) => {
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
      });

      console.log("✅ Event updated successfully");
      nav("/events");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save event");
      console.error("Error saving event:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      {/* Loading state */}
      {loading && (
        <div className="panel">
          <div className="panelHeader teal">Edit Event</div>
          <div className="panelBody">
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
              }}
            >
              Loading event...
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="panel">
          <div className="panelHeader teal">Edit Event</div>
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
              <button className="btn btnOutline" onClick={() => nav("/events")}>
                Back to Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && event && (
      <div className="panel" role="region" aria-label="Edit Event" style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* ✅ Event name as header */}
        <div className="panelHeader teal">
            Edit Event
        </div>

        <div className="panelBody"  style={{ maxWidth: "100%" }}>
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
              />
            </div>

            <div className="field">
              <span>Event Type</span>
              <select
                value={eventTypes.find((t) => t.name === event?.eventTypeName)?.id ?? ""}
                disabled
                style={{ background: "#f5f5f5", cursor: "not-allowed", width: "100%" }}
              >
                <option value="">
                  {event?.eventTypeName || "Unknown"}
                </option>
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
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field">
              <span>Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="field">
              <span>Location</span>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

           <div className="field">
              <span>End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div className="field">
              <span>Max Attendees</span>
              <input
                type="number"
                min={0}
                value={maxAttendees}
                onChange={(e) =>
                  setMaxAttendees(Number(e.target.value))
                }
              />
            </div>

            <div className="field">
              <span>Required Qualifications</span>
              <input
                type="text"
                placeholder="e.g. First Aid, Music"
                value={qualifications}
                onChange={(e) =>
                  setQualifications(e.target.value)
                }
              />
            </div>

            {/* Staff Shift Times */}
            <div style={{ gridColumn: "1 / -1", marginTop: 4, marginBottom: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>
                🧑‍💼 Staff Shift Times
              </span>
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
          <div
            style={{
              marginTop: 32,
              marginBottom: 8,
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Staff Assignment
          </div>

          {/* ==========================
              STAFF ASSIGNMENT (SINGLE TABLE)
          ========================== */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
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
                          title="Shift conflict detected: holiday or overlapping assignment"
                          style={{ marginLeft: 6, color: "#e65c00", fontSize: 14 }}
                        >
                          ⚠️
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "6px 8px" }}>
                      <span style={{ fontSize: 13, color: "var(--muted, #888)" }}>
                        {s.roleLabel ?? s.staffTypeName ?? "—"}
                      </span>
                    </td>

                    <td style={{ padding: "6px 8px" }} colSpan={2}>
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
                        <span className="chip" style={{ background: "#ffe0c0", color: "#b94a00" }}>
                          ⚠️ Conflict
                        </span>
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
          {saveError && (
            <div
              style={{ marginTop: 16, padding: 12, background: "#fee", color: "#c00", borderRadius: 4 }}
              role="alert"
            >
              ⚠️ {saveError}
            </div>
          )}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              className="btn btnOutline"
              onClick={() => nav(-1)}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btnPrimary" onClick={saveEvent} disabled={saving}>
              {saving ? "⏳ Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
      )}
    </Page>
  );
}