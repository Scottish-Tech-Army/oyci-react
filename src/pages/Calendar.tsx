import React, { useEffect, useMemo, useState } from "react";

/**
 * CalendarPage (single page):
 * - Month / Week views
 * - Create/Edit events
 * - Event Type: Single select
 * - Qualifications: Multi select
 * - Staff: Multi select dropdown filtered by selected qualifications
 * - LocalStorage persistence
 */

type CalendarView = "month" | "week";

type Qualification = { id: string; name: string };
type EventType = { id: string; name: string };

type StaffMember = {
  id: string;
  name: string;
  qualificationIds: string[]; // <-- used to filter staff based on selected qualifications
  experienceYears: number;
};

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO
  end: string;   // ISO
  eventTypeId: string | null; // single select
  qualificationIds: string[]; // multi select
  staffIds: string[];  
  minExperienceYears: number | null;       // multi select (filtered by qualifications)
  color?: string;
};

const LS_KEY = "calendar_events_v2";

// --- Demo master data (replace with API later) ---
const DEFAULT_QUALIFICATIONS: Qualification[] = [
  { id: "q1", name: "First Aid" },
  { id: "q2", name: "Fire Warden" },
  { id: "q3", name: "Forklift Certified" },
  { id: "q4", name: "Security Cleared" },
];

const DEFAULT_EVENT_TYPES: EventType[] = [
  { id: "t1", name: "Shift" },
  { id: "t2", name: "Training" },
  { id: "t3", name: "Leave" },
  { id: "t4", name: "Overtime" },
];

// Staff has qualifications, used for filtering
const DEFAULT_STAFF: StaffMember[] = [
  { id: "s1", name: "Anil",      qualificationIds: ["q1", "q2"], experienceYears: 5 },
  { id: "s2", name: "Siva",      qualificationIds: ["q2"], experienceYears: 3 },
  { id: "s3", name: "Madhu",     qualificationIds: ["q1", "q3"], experienceYears: 4 },
  { id: "s4", name: "Narendra",  qualificationIds: ["q3", "q4"], experienceYears: 6 },
  { id: "s5", name: "Abi",       qualificationIds: ["q1", "q4"], experienceYears: 2 },
];

// ---------------- Date helpers ----------------
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatReadable(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfWeek(d: Date, weekStartsOn: 0 | 1 = 1) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day < weekStartsOn) ? day + 7 - weekStartsOn : day - weekStartsOn;
  return addDays(x, -diff);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function endOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setMonth(x.getMonth() + 1, 0);
  return x;
}

function clampToDayRange(d: Date, hour: number, minute = 0) {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x;
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function pickColor(title: string) {
  const colors = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#dc2626", "#0f766e"];
  let sum = 0;
  for (let i = 0; i < title.length; i++) sum += title.charCodeAt(i);
  return colors[sum % colors.length];
}

function safeParseEvents(raw: string | null): CalendarEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CalendarEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e?.id && e?.title && e?.start && e?.end);
  } catch {
    return [];
  }
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

// ---------------- Styles ----------------
const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(2,6,23,0.08)",
  border: "1px solid rgba(2,6,23,0.08)",
};

const btn: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 12px",
  border: "1px solid rgba(15,23,42,0.15)",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "#2563eb",
  color: "white",
  border: "1px solid #2563eb",
};

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  border: "1px solid rgba(15,23,42,0.14)",
  padding: "6px 10px",
  background: "#fff",
};

function inputStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(15,23,42,0.16)",
    outline: "none",
    fontSize: 14,
  };
}

// ---------------- Main page ----------------
export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(new Date()));
  const today = startOfDay(new Date());

  const [qualifications] = useState<Qualification[]>(DEFAULT_QUALIFICATIONS);
  const [eventTypes] = useState<EventType[]>(DEFAULT_EVENT_TYPES);
  const [staff] = useState<StaffMember[]>(DEFAULT_STAFF);

  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    safeParseEvents(localStorage.getItem(LS_KEY))
  );

  // Filter (optional)
  const [staffFilter, setStaffFilter] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startStr, setStartStr] = useState(""); // yyyy-MM-ddTHH:mm
  const [endStr, setEndStr] = useState("");

  // New fields
  const [selectedQualificationIds, setSelectedQualificationIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null);
  const [minExperienceYears, setMinExperienceYears] = useState<number | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(events));
  }, [events]);

  // Lookup maps
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  const qualById = useMemo(() => new Map(qualifications.map(q => [q.id, q])), [qualifications]);
  const typeById = useMemo(() => new Map(eventTypes.map(t => [t.id, t])), [eventTypes]);

  // Filter events by staff (optional UI)
  const filteredEvents = useMemo(() => {
    if (staffFilter === "all") return events;
    return events.filter(e => e.staffIds.includes(staffFilter));
  }, [events, staffFilter]);

  // ---------------- Staff filtering based on Qualifications ----------------
  /**
   * Requirement: "Based on qualification selected, staff list has to be populated".
   * Implementation: show only staff who match ALL selected qualifications.
   *
   * If you'd prefer "match ANY selected qualification" change `every(...)` to `some(...)`.
   */
  const availableStaff = useMemo(() => {
    if (selectedQualificationIds.length === 0) return staff;

    
    return staff.filter((s) => {
    // Qualifications: match ANY selected qualification (current behavior)
    const qualOk =
      selectedQualificationIds.length === 0 ||
      selectedQualificationIds.some((qid) => s.qualificationIds.includes(qid));

    // Experience: staff experience >= minExperienceYears (if provided)
    const expOk =
      minExperienceYears === null || s.experienceYears >= minExperienceYears;

    return qualOk || expOk;
  });

  }, [staff, selectedQualificationIds, minExperienceYears]);

  // When qualifications change, auto-remove selected staff not eligible anymore
  useEffect(() => {
    const eligibleIds = new Set(availableStaff.map(s => s.id));
    setSelectedStaffIds(prev => prev.filter(id => eligibleIds.has(id)));
  }, [availableStaff]);

  // ---------------- Date-derived grids ----------------
  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), 1);
    const end = endOfMonth(anchorDate);
    const lastGridDay = addDays(startOfWeek(addDays(end, 6), 1), 6);
    const days: Date[] = [];
    let cur = start;
    while (cur <= lastGridDay) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, 1);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  // ---------------- Navigation ----------------
  function goToday() {
    setAnchorDate(startOfDay(new Date()));
  }
  function goPrev() {
    if (view === "month") {
      const d = new Date(anchorDate);
      d.setMonth(d.getMonth() - 1);
      setAnchorDate(startOfDay(d));
    } else {
      setAnchorDate(addDays(anchorDate, -7));
    }
  }
  function goNext() {
    if (view === "month") {
      const d = new Date(anchorDate);
      d.setMonth(d.getMonth() + 1);
      setAnchorDate(startOfDay(d));
    } else {
      setAnchorDate(addDays(anchorDate, 7));
    }
  }

  const headerTitle = useMemo(() => {
    if (view === "month") {
      const d = anchorDate;
      const monthName = d.toLocaleString(undefined, { month: "long" });
      return `${monthName} ${d.getFullYear()}`;
    }
    const start = startOfWeek(anchorDate, 1);
    const end = addDays(start, 6);
    return `${formatYMD(start)} → ${formatYMD(end)}`;
  }, [anchorDate, view]);

  // ---------------- Modal open/edit ----------------
  function openCreateModal(prefillDate?: Date) {
    setEditingId(null);
    setTitle("");
    setDescription("");

    const base = prefillDate ? startOfDay(prefillDate) : startOfDay(anchorDate);
    const start = clampToDayRange(base, 10, 0);
    const end = clampToDayRange(base, 11, 0);

    setStartStr(`${formatYMD(start)}T${pad2(start.getHours())}:${pad2(start.getMinutes())}`);
    setEndStr(`${formatYMD(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}`);

    // reset new fields
    setSelectedEventTypeId(null);
    setSelectedQualificationIds([]);
    setSelectedStaffIds([]);
    setMinExperienceYears(null);
    setIsModalOpen(true);
  }

  function openEditModal(evt: CalendarEvent) {
    setEditingId(evt.id);
    setTitle(evt.title);
    setDescription(evt.description ?? "");

    const s = new Date(evt.start);
    const e = new Date(evt.end);
    setStartStr(`${formatYMD(s)}T${pad2(s.getHours())}:${pad2(s.getMinutes())}`);
    setEndStr(`${formatYMD(e)}T${pad2(e.getHours())}:${pad2(e.getMinutes())}`);

    setSelectedEventTypeId(evt.eventTypeId ?? null);
    setSelectedQualificationIds(evt.qualificationIds ?? []);
    setSelectedStaffIds(evt.staffIds ?? []);
    setMinExperienceYears(evt.minExperienceYears ?? null);

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function removeEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  function validateAndSave() {
    const s = new Date(startStr);
    const e = new Date(endStr);

    if (!title.trim()) {
      alert("Please enter an event title.");
      return;
    }
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      alert("Please provide valid start and end date/time.");
      return;
    }
    if (e <= s) {
      alert("End time must be after start time.");
      return;
    }

    // optional: require event type
    if (!selectedEventTypeId) {
      alert("Please select an event type.");
      return;
    }

    // Conflict check for same staff
    const conflicts = events
      .filter(ev => ev.id !== editingId)
      .filter(ev => {
        const evS = new Date(ev.start);
        const evE = new Date(ev.end);
        const sharesStaff = ev.staffIds.some(id => selectedStaffIds.includes(id));
        return sharesStaff && overlaps(s, e, evS, evE);
      });

    if (conflicts.length > 0) {
      const msg =
        "Warning: This event overlaps with other events for selected staff.\n\n" +
        conflicts
          .slice(0, 4)
          .map(c => `• ${c.title} (${formatReadable(new Date(c.start))} - ${formatReadable(new Date(c.end))})`)
          .join("\n") +
        (conflicts.length > 4 ? `\n...and ${conflicts.length - 4} more.` : "");

      if (!confirm(msg + "\n\nSave anyway?")) return;
    }

    const payload: CalendarEvent = {
      id: editingId ?? uid(),
      title: title.trim(),
      description: description.trim() || undefined,
      start: s.toISOString(),
      end: e.toISOString(),
      eventTypeId: selectedEventTypeId,
      qualificationIds: selectedQualificationIds,
      staffIds: selectedStaffIds,
      minExperienceYears: minExperienceYears,
      color: pickColor(title.trim()),
    };

    setEvents(prev => {
      if (editingId) return prev.map(p => (p.id === editingId ? payload : p));
      return [...prev, payload];
    });

    setIsModalOpen(false);
  }

  // ---------------- Layout ----------------
  const containerStyle: React.CSSProperties = {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    color: "#0f172a",
    background: "#f8fafc",
    minHeight: "100vh",
    padding: 16,
  };

  return (
    <div style={containerStyle}>
      {/* Top bar */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>Calendar</h1>
            <span style={{ opacity: 0.7, fontWeight: 600 }}>{headerTitle}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <button style={btn} onClick={goPrev} aria-label="Previous">◀</button>
            <button style={btn} onClick={goToday}>Today</button>
            <button style={btn} onClick={goNext} aria-label="Next">▶</button>

            <span style={{ width: 8 }} />

            <div style={pill} aria-label="View switch">
              <button
                style={{ ...btn, padding: "8px 10px", background: view === "month" ? "#e2e8f0" : "white" }}
                onClick={() => setView("month")}
              >
                Month
              </button>
              <button
                style={{ ...btn, padding: "8px 10px", background: view === "week" ? "#e2e8f0" : "white" }}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>

            <span style={{ width: 8 }} />

            <button style={btnPrimary} onClick={() => openCreateModal()}>
              + Create event
            </button>
          </div>
        </div>

        {/* Filter by staff */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, opacity: 0.85 }}>Filter:</span>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            style={{ ...btn, padding: "10px 12px", minWidth: 200 }}
          >
            <option value="all">All staff</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <span style={{ opacity: 0.7 }}>
            Showing <b>{filteredEvents.length}</b> event(s)
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr", gap: 12 }}>
        {/* Calendar view */}
        <div style={{ ...cardStyle, padding: 12 }}>
          {view === "month" ? (
            <MonthView
              anchorDate={anchorDate}
              days={monthGridDays}
              today={today}
              events={filteredEvents}
              onDayClick={(d) => openCreateModal(d)}
              onEventClick={openEditModal}
            />
          ) : (
            <WeekView
              weekDays={weekDays}
              today={today}
              events={filteredEvents}
              onDayClick={(d) => openCreateModal(d)}
              onEventClick={openEditModal}
            />
          )}
        </div>

        {/* Right panel: Event list */}
        <div style={{ ...cardStyle, padding: 12 }}>
          <h2 style={{ fontSize: 16, margin: "4px 0 10px" }}>Events</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "72vh", overflow: "auto", paddingRight: 6 }}>
            {filteredEvents
              .slice()
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(ev => {
                const s = new Date(ev.start);
                const e = new Date(ev.end);

                const staffNames = ev.staffIds
                  .map(id => staffById.get(id)?.name)
                  .filter(Boolean)
                  .join(", ");

                const qualNames = ev.qualificationIds
                  .map(id => qualById.get(id)?.name)
                  .filter(Boolean)
                  .join(", ");

                const typeName = ev.eventTypeId ? typeById.get(ev.eventTypeId)?.name : null;

                return (
                  <div
                    key={ev.id}
                    style={{
                      border: "1px solid rgba(15,23,42,0.10)",
                      borderRadius: 14,
                      padding: 10,
                      background: "rgba(248,250,252,0.6)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: ev.color ?? "#2563eb", display: "inline-block" }} />
                        <div>
                          <div style={{ fontWeight: 800 }}>{ev.title}</div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            {formatReadable(s)} → {formatReadable(e)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={btn} onClick={() => openEditModal(ev)}>Edit</button>
                        <button style={{ ...btn, borderColor: "rgba(220,38,38,0.35)", color: "#dc2626" }} onClick={() => removeEvent(ev.id)}>
                          Delete
                        </button>
                      </div>
                    </div>

                    {ev.description ? (
                      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>{ev.description}</div>
                    ) : null}

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                      <b>Event Type:</b> {typeName ?? "—"}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      <b>Qualifications:</b> {qualNames || "—"}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      <b>Staff:</b> {staffNames || "—"}
                    </div>
                  </div>
                );
              })}

            {filteredEvents.length === 0 ? (
              <div style={{ padding: 14, borderRadius: 14, border: "1px dashed rgba(15,23,42,0.2)", opacity: 0.75 }}>
                No events yet. Click a day or “Create event”.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal onClose={closeModal} title={editingId ? "Edit event" : "Create event"}

footer={
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
      <button style={btn} onClick={closeModal}>Cancel</button>
      <button style={btnPrimary} onClick={validateAndSave}>
        {editingId ? "Save changes" : "Create event"}
      </button>
    </div>
  }
>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Shift planning"
                style={inputStyle()}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Description (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes..."
                style={{ ...inputStyle(), minHeight: 80, resize: "vertical" }}
              />
            </label>

            {/* Event type: SINGLE select */}
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Event Type</span>
              <select
                value={selectedEventTypeId ?? ""}
                onChange={(e) => setSelectedEventTypeId(e.target.value || null)}
                style={inputStyle()}
              >
                <option value="">Select event type...</option>
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Start</span>
                <input
                  type="datetime-local"
                  value={startStr}
                  onChange={(e) => setStartStr(e.target.value)}
                  style={inputStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>End</span>
                <input
                  type="datetime-local"
                  value={endStr}
                  onChange={(e) => setEndStr(e.target.value)}
                  style={inputStyle()}
                />
              </label>
            </div>

            {/* Qualifications: MULTI select */}
            <MultiSelectDropdown
              label="Qualifications (multi-select)"
              placeholder="Select qualifications..."
              options={qualifications.map(q => ({ value: q.id, label: q.name }))}
              value={selectedQualificationIds}
              onChange={setSelectedQualificationIds}
            />
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Experience (minimum years)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="e.g., 3"
                value={minExperienceYears === null ? "" : String(minExperienceYears)}
                onChange={(e) => {
                  const raw = e.target.value;

                  // Allow blank = no filter
                  if (raw === "") {
                    setMinExperienceYears(null);
                    return;
                  }

                  // Convert to number safely
                  const n = Number(raw);
                  if (Number.isNaN(n)) return;

                  // Optional: clamp negatives
                  setMinExperienceYears(Math.max(0, Math.floor(n)));
                }}
                style={inputStyle()}
              />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Staff list below will be filtered to staff with at least this many years of experience.
              </span>
            </label>

            {/* Staff: MULTI select, populated/filtered by selected qualifications */}
            <MultiSelectDropdown
              label="Assign Staff (filtered by qualifications)"
              placeholder={
                selectedQualificationIds.length > 0
                  ? "Select staff matching selected qualifications..."
                  : "Select staff..."
              }
              options={availableStaff.map(s => ({ value: s.id, label: s.name }))}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              emptyText={
                selectedQualificationIds.length > 0
                  ? "No staff match the selected qualifications."
                  : "No staff available."
              }
            />

            {/* <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button style={btn} onClick={closeModal}>Cancel</button>
              <button style={btnPrimary} onClick={validateAndSave}>
                {editingId ? "Save changes" : "Create event"}
              </button>
            </div> */}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------- UI Components ----------------

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(720px, 96vw)",
          maxHeight: "92vh", 
          borderRadius: 18,
          background: "white",
          border: "1px solid rgba(15,23,42,0.12)",
          boxShadow: "0 30px 80px rgba(2,6,23,0.25)",   
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", 
            padding: 14,
            borderBottom: "1px solid rgba(15,23,42,0.10)",
            background: "white",
 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, lineHeight: 1 }} aria-label="Close">
            ✕
          </button>
        </div>
        
        {/* Body (scrollable) */}
        <div
          style={{
            padding: 14,
            overflow: "auto",     // ✅ scroll inside modal
            flex: "1 1 auto",
          }}
        >
        {children}
        </div>
        
{/* Footer (sticky area) */}
        {footer ? (
          <div
            style={{
              padding: 14,
              borderTop: "1px solid rgba(15,23,42,0.10)",
              background: "white",
            }}
          >
            {footer}
          </div>
        ) : null}

      </div>
    </div>
  );
}

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  emptyText,
}: {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const selectedLabels = React.useMemo(() => {
    const map = new Map(options.map(o => [o.value, o.label]));
    return value.map(v => map.get(v)).filter(Boolean) as string[];
  }, [value, options]);

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val]);
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{label}</div>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: "100%",
            textAlign: "left",
            borderRadius: 12,
            padding: "10px 12px",
            border: "1px solid rgba(15,23,42,0.16)",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: selectedLabels.length ? 1 : 0.7,
            }}
          >
            {selectedLabels.length ? selectedLabels.join(", ") : (placeholder ?? "Select...")}
          </span>
          <span style={{ fontWeight: 900, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              zIndex: 10,
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "white",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              boxShadow: "0 18px 50px rgba(2,6,23,0.12)",
              padding: 8,
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", gap: 10 }}>
              <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                {value.length} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                style={{
                  borderRadius: 10,
                  padding: "6px 10px",
                  border: "1px solid rgba(15,23,42,0.15)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                Clear
              </button>
            </div>

            {options.length === 0 ? (
              <div style={{ padding: 12, fontSize: 13, opacity: 0.75 }}>
                {emptyText ?? "No options available."}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {options.map(opt => {
                  const checked = value.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: checked ? "rgba(37,99,235,0.08)" : "transparent",
                        border: "1px solid rgba(15,23,42,0.08)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt.value)}
                      />
                      <span style={{ fontWeight: 800 }}>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(15,23,42,0.15)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLabels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {selectedLabels.slice(0, 8).map(l => (
            <span
              key={l}
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.06)",
                border: "1px solid rgba(15,23,42,0.10)",
              }}
            >
              {l}
            </span>
          ))}
          {selectedLabels.length > 8 && (
            <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
              +{selectedLabels.length - 8} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Calendar views ----------------

function MonthView({
  anchorDate,
  days,
  today,
  events,
  onDayClick,
  onEventClick,
}: {
  anchorDate: Date;
  days: Date[];
  today: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const month = anchorDate.getMonth();
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, padding: "6px 6px 10px" }}>
        {weekdays.map(d => (
          <div key={d} style={{ fontWeight: 800, opacity: 0.75, fontSize: 12 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {days.map(day => {
          const inMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const dayEvents = events
            .filter(ev => isSameDay(new Date(ev.start), day))
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
            .slice(0, 4);

          const extraCount = events.filter(ev => isSameDay(new Date(ev.start), day)).length - dayEvents.length;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.10)",
                background: isToday ? "rgba(37,99,235,0.08)" : "white",
                padding: 10,
                minHeight: 110,
                cursor: "pointer",
                opacity: inMonth ? 1 : 0.55,
              }}
              title="Click to create event"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900 }}>{day.getDate()}</div>
                {isToday && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#2563eb" }}>Today</span>
                )}
              </div>

              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 10,
                      padding: "6px 8px",
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(248,250,252,0.8)",
                      cursor: "pointer",
                    }}
                    title="Click to edit"
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: ev.color ?? "#2563eb" }} />
                    <span style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </span>
                  </div>
                ))}
                {extraCount > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
                    +{extraCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekDays,
  today,
  events,
  onDayClick,
  onEventClick,
}: {
  weekDays: Date[];
  today: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {weekDays.map(day => {
        const isToday = isSameDay(day, today);
        const dayEvents = events
          .filter(ev => isSameDay(new Date(ev.start), day))
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return (
          <div
            key={day.toISOString()}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.10)",
              padding: 12,
              background: isToday ? "rgba(37,99,235,0.08)" : "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {day.toLocaleDateString(undefined, { weekday: "long" })}{" "}
                  <span style={{ opacity: 0.65, fontWeight: 800 }}>{formatYMD(day)}</span>
                </div>
                {isToday && <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 900 }}>Today</div>}
              </div>

              <button
                onClick={() => onDayClick(day)}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid rgba(37,99,235,0.35)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#2563eb",
                }}
              >
                + Add
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {dayEvents.map(ev => {
                const s = new Date(ev.start);
                const e = new Date(ev.end);
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    style={{
                      borderRadius: 14,
                      padding: 10,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(248,250,252,0.7)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                    title="Click to edit"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: ev.color ?? "#2563eb" }} />
                      <div>
                        <div style={{ fontWeight: 900 }}>{ev.title}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          {pad2(s.getHours())}:{pad2(s.getMinutes())} → {pad2(e.getHours())}:{pad2(e.getMinutes())}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                      {ev.staffIds.length ? `${ev.staffIds.length} staff` : "No staff"}
                    </div>
                  </div>
                );
              })}

              {dayEvents.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.7, border: "1px dashed rgba(15,23,42,0.2)", borderRadius: 14, padding: 12 }}>
                  No events for this day.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}