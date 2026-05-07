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
type ApiEventType = { id: string; name: string };
type ApiLocation = { id: string; name: string };


type CalendarView = "month" | "week" | "day";

type Qualification = { id: string; name: string };
type EventType = { id: string; name: string };

type WeeklyEventLite = {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
};


type WeeklyAssignments = Record<
  string, // weekKey (YYYY-MM-DD of Monday)
  {
    events: WeeklyEventLite[];
  }
>;

type StaffMember = {
  id: string;
  name: string;
  designation: string;
  qualificationIds: string[]; // <-- used to filter staff based on selected qualifications
  experienceYears: number;
  weeklyCapacityHours: number;
  weeklyAssignments: WeeklyAssignments;
};

type LocationOption = {
  id: string;
  name: string;
  source: "system" | "user"; // system = predefined, user = added in UI
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
  staffDisplay: string[];
  minExperienceYears: number | null;       // multi select (filtered by qualifications)
  locationId: string | null;
  color?: string;
};

// API 1
type EventTypeDetailResponse = {
  defDurMins: number;
  description: string;
  id: number;
  name: string;
  requiredExperience: string;
  requiredExperienceMonths: number;
  requiredQualifications: { id: number; name: string }[];
};

// API 2
type WeeklyEventInstance = {
  id: number | string;
  title?: string;
  name?: string;        // sometimes APIs use "name" instead of "title"
  start?: string;
  startTime?: string;   // sometimes APIs use "startTime"
  end?: string;
  endTime?: string;
};

type StaffAvailableResponseItem = {
  email: string;
  experienceMonths: number;
  id: number;
  name: string;
  designation?: string;
  qualificationIds: number[];
  remainingHours: number;        // available hours (likely within the week)
  weeklyAvailHours: number;      // weekly capacity
  weeklyCommittedHours: number;  // committed
  weeklyEventInstances: WeeklyEventInstance[];
};


type ApiQualification = {
  id: number | string;
  name: string;
};

const LS_KEY = "calendar_events_v2";

const LOC_LS_KEY = "calendar_locations_v1";

const DEFAULT_LOCATIONS: LocationOption[] = [
  { id: "l1", name: "Hyderabad Office", source: "system" },
  { id: "l2", name: "London Office", source: "system" },
  { id: "l3", name: "Remote", source: "system" },
];
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
// const DEFAULT_STAFF: StaffMember[] = [
//   { id: "s1", name: "Anil",      qualificationIds: ["q1", "q2"], experienceYears: 5 },
//   { id: "s2", name: "Siva",      qualificationIds: ["q2"], experienceYears: 3 },
//   { id: "s3", name: "Madhu",     qualificationIds: ["q1", "q3"], experienceYears: 4 },
//   { id: "s4", name: "Narendra",  qualificationIds: ["q3", "q4"], experienceYears: 6 },
//   { id: "s5", name: "Abi",       qualificationIds: ["q1", "q4"], experienceYears: 2 },
// ];
function toApiLocalStartTime(startStr: string) {
  // UI: "2026-03-31T09:00" -> API: "2026-03-31T09:00:00"
  return startStr?.length === 16 ? `${startStr}:00` : startStr;
}

function eventInstanceTooltip(instances: WeeklyEventInstance[]) {
  if (!instances || instances.length === 0) return "No events assigned this week.";

  const lines = instances.slice(0, 10).map((ev) => {
    const title = ev.title ?? ev.name ?? "Event";
    const s = ev.start ?? ev.startTime;
    const e = ev.end ?? ev.endTime;

    // If API provides timestamps, show local time. If not, show title only.
    if (!s || !e) return `• ${title}`;

    const sd = new Date(s);
    const ed = new Date(e);

    const sTxt = `${formatYMD(sd)} ${pad2(sd.getHours())}:${pad2(sd.getMinutes())}`;
    const eTxt = `${pad2(ed.getHours())}:${pad2(ed.getMinutes())}`;

    return `• ${title} (${sTxt}–${eTxt})`;
  });

  return `Events this week:\n${lines.join("\n")}${instances.length > 10 ? `\n...and ${instances.length - 10} more` : ""}`;
}
function safeParseLocations(raw: string | null): LocationOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocationOption[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(x => x?.id && x?.name && (x.source === "system" || x.source === "user"))
      .map(x => ({ ...x, name: String(x.name) }));
  } catch {
    return [];
  }
}
function buildMockWeeklyAssignments(weekKey: string) {
  // weekKey is local Monday date: "YYYY-MM-DD"
  // We'll create UTC instants that correspond to local times in that week.
  // Easiest: create local date-times and convert to ISO UTC.
  const mkUtc = (ymd: string, hh: number, mm: number) => {
    const local = new Date(`${ymd}T${pad2(hh)}:${pad2(mm)}`); // local
    return local.toISOString(); // UTC for backend
  };

  // Example commitments (local times), stored as UTC ISO as backend would.
  return {
    events: [
      {
        id: "we1",
        title: "Training",
        start: mkUtc(weekKey, 10, 0),
        end: mkUtc(weekKey, 12, 0),
      },
      {
        id: "we2",
        title: "Shift A",
        start: mkUtc(addDays(new Date(`${weekKey}T00:00`), 2).toISOString().slice(0,10), 9, 0), // Wed 09:00 local
        end: mkUtc(addDays(new Date(`${weekKey}T00:00`), 2).toISOString().slice(0,10), 17, 0), // Wed 17:00 local
      },
    ],
  };
}
const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "s1",
    name: "Anil",
    designation: "Team Lead",
    qualificationIds: ["q1", "q2"],
    experienceYears: 5,
    weeklyCapacityHours: 40,
    weeklyAssignments: {
      "2026-03-30": {
        events: [
          { id: "we1", title: "Training", start: "2026-03-30T10:00:00.000Z", end: "2026-03-30T12:00:00.000Z" },
          { id: "we2", title: "Shift A",   start: "2026-04-01T08:00:00.000Z", end: "2026-04-01T16:00:00.000Z" },
        ],
      },
    },
  },
  {
    id: "s2",
    name: "Siva",
    designation: "Senior Engineer",
    qualificationIds: ["q2"],
    experienceYears: 3,
    weeklyCapacityHours: 40,
    weeklyAssignments: {
      "2026-03-30": {
        events: [
          { id: "we3", title: "Shift B", start: "2026-03-31T09:00:00.000Z", end: "2026-03-31T17:00:00.000Z" },
        ],
      },
    },
  },
  {
    id: "s3",
    name: "Madhu",
    designation: "Engineer",
    qualificationIds: ["q1", "q3"],
    experienceYears: 2,
    weeklyCapacityHours: 40,
    weeklyAssignments: {
      //"2026-03-30": { events: [] },
      [weekKeyFromDate(new Date())]: buildMockWeeklyAssignments(weekKeyFromDate(new Date())),

    },
  },
  {
    id: "s4",
    name: "Narendra",
    designation: "Operations Specialist",
    qualificationIds: ["q3", "q4"],
    experienceYears: 7,
    weeklyCapacityHours: 40,
    weeklyAssignments: {
      // "2026-03-30": {
      //   events: [
      //     { id: "we4", title: "Overtime", start: "2026-04-03T14:00:00.000Z", end: "2026-04-03T18:00:00.000Z" },
      //     { id: "we5", title: "Shift C",  start: "2026-04-04T06:00:00.000Z", end: "2026-04-04T14:00:00.000Z" },
      //   ],
      // },
      [weekKeyFromDate(new Date())]: buildMockWeeklyAssignments(weekKeyFromDate(new Date())),
    },
  },
  {
    id: "s5",
    name: "Abi",
    designation: "Associate",
    qualificationIds: ["q1", "q4"],
    experienceYears: 4,
    weeklyCapacityHours: 40,
    weeklyAssignments: {
      // "2026-03-30": {
      //   events: [
      //     { id: "we6", title: "Leave (half-day)", start: "2026-04-02T08:00:00.000Z", end: "2026-04-02T12:00:00.000Z" },
      //   ],
      // },
      [weekKeyFromDate(new Date())]: buildMockWeeklyAssignments(weekKeyFromDate(new Date())),
    },
  },
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


function weekKeyFromDate(d: Date) {
  // week starts Monday (same as your calendar)
  const ws = startOfWeek(d, 1);
  return formatYMD(ws); // YYYY-MM-DD
}

function hoursBetween(startIso: string, endIso: string) {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  return Math.max(0, (e - s) / (1000 * 60 * 60));
}

function formatTimeHM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function staffWeekCommittedHours(staff: StaffMember, wk: string) {
  const events = staff.weeklyAssignments[wk]?.events ?? [];
  const total = events.reduce((sum, ev) => sum + hoursBetween(ev.start, ev.end), 0);
  // round to 0.5 hours for display
  return Math.round(total * 2) / 2;
}

function staffWeekAvailableHours(staff: StaffMember, wk: string) {
  const committed = staffWeekCommittedHours(staff, wk);
  const available = (staff.weeklyCapacityHours ?? 40) - committed;
  return Math.max(0, Math.round(available * 2) / 2);
}


function staffWeekTooltip(staff: StaffMember, wk: string) {
  const events = staff.weeklyAssignments[wk]?.events ?? [];
  if (events.length === 0) return "No events assigned this week.";

  // Multi-line tooltip string
  const lines = events
    .slice(0, 10)
    .map(ev => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      return `• ${ev.title} (${formatYMD(s)} ${formatTimeHM(s)}–${formatTimeHM(e)})`;
    });

  const more = events.length > 10 ? `\n...and ${events.length - 10} more` : "";
  return `Events this week:\n${lines.join("\n")}${more}`;
}
function nowLocalDateTimeInput() {
  const now = new Date();
  return `${formatYMD(now)}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

async function fetchEventTypes(signal?: AbortSignal): Promise<EventType[]> {
  const res = await fetch("http://localhost:8080/api/event-types", {
    method: "GET",
    headers: { accept: "*/*" },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to load event types (${res.status})`);
  }

  const data = (await res.json()) as ApiEventType[];

  // Map/normalize
  return (Array.isArray(data) ? data : []).map((x) => ({
    id: String(x.id),
    name: String(x.name),
  }));
}

async function fetchLocations(signal?: AbortSignal): Promise<LocationOption[]> {
  const res = await fetch("http://localhost:8080/api/locations", {
    method: "GET",
    headers: { accept: "*/*" },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to load locations (${res.status})`);
  }

  const data = (await res.json()) as ApiLocation[];

  // Map/normalize. Mark as "system" since coming from backend
  return (Array.isArray(data) ? data : []).map((x) => ({
    id: String(x.id),
    name: String(x.name),
    source: "system",
  }));
}

async function fetchEventTypeDetail(eventTypeId: string, signal?: AbortSignal) {
  const res = await fetch(`http://localhost:8080/api/event-types/${eventTypeId}`, {
    method: "GET",
    headers: { accept: "*/*" },
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load event type details (${res.status})`);
  return (await res.json()) as EventTypeDetailResponse;
}

async function fetchStaffAvailableForEvent(params: { eventTypeId: string; startTime: string }, signal?: AbortSignal) {
  const qs = new URLSearchParams({
    eventTypeId: params.eventTypeId,
    startTime: params.startTime,
  });

  const res = await fetch(`http://localhost:8080/api/staff/available-for-event?${qs.toString()}`, {
    method: "GET",
    headers: { accept: "*/*" },
    signal,
  });

  if (!res.ok) throw new Error(`Failed to load available staff (${res.status})`);
  const data = (await res.json()) as StaffAvailableResponseItem[];

  return Array.isArray(data) ? data : [];
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "*/*" },
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return (await res.json()) as T;
}

// async function fetchQualifications(signal?: AbortSignal) {
//   // Your sample: [{ id: 3, name: "First Aid" }]
//   const data = await fetchJson<ApiQualification[]>(
//     "http://localhost:8080/api/qualifications",
//     signal
//   );
//   return (Array.isArray(data) ? data : []).map((q) => ({
//     id: String(q.id),
//     name: String(q.name),
//   }));
// }
async function fetchQualifications(signal?: AbortSignal) {
  const res = await fetch("http://localhost:8080/api/qualifications", {
    method: "GET",
    headers: { accept: "*/*" },
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load qualifications (${res.status})`);

  const data = (await res.json()) as Array<{ id: number | string; name: string }>;

  return (Array.isArray(data) ? data : []).map((q) => ({
    id: String(q.id),      // ✅ IMPORTANT
    name: String(q.name),
  }));
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

const twoColResponsive: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "0.8fr 1.2fr", // Experience | Location
  gap: 12,
  alignItems: "start",
};


function miniBtnStyle(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "4px 8px",
    border: "1px solid rgba(15,23,42,0.15)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };
}

// ---------------- Main page ----------------
export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(new Date()));
  const today = startOfDay(new Date());

  const [qualifications,setQualifications] = useState<Qualification[]>(DEFAULT_QUALIFICATIONS);
  const [eventTypes,setEventTypes] = useState<EventType[]>(DEFAULT_EVENT_TYPES);
  const [staff,setStaff] = useState<StaffMember[]>(DEFAULT_STAFF);

  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

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

  const refAbortRef = React.useRef<AbortController | null>(null);


// async function loadReferenceDataIfNeeded(force = false) {

//   // cancel any in-flight request
//   refAbortRef.current?.abort();
//   const controller = new AbortController();
//   refAbortRef.current = controller;

//   setRefLoading(true);
//   setRefError(null);

//   try {
//     const [types, locs] = await Promise.all([
//       fetchEventTypes(controller.signal),
//       fetchLocations(controller.signal),
//     ]);

//     setEventTypes(types);
//     setLocations(locs);

//   } catch (e: any) {
//     if (e?.name === "AbortError") return;
//     setRefError(e?.message ?? "Failed to load reference data.");
//   } finally {
//     setRefLoading(false);
//   }
// }
async function loadReferenceDataIfNeeded(force = false) {

  // Abort any in-flight loads
  refAbortRef.current?.abort();
  const controller = new AbortController();
  refAbortRef.current = controller;

  setRefLoading(true);
  setRefError(null);

  try {
    const [types, locs, quals] = await Promise.all([
      fetchEventTypes(controller.signal),
      fetchLocations(controller.signal),
      fetchQualifications(controller.signal),
    ]);

    setEventTypes(types);
    setLocations(locs);
    setQualifications(quals);


  } catch (e: any) {
    if (e?.name === "AbortError") return;
    setRefError(e?.message ?? "Failed to load reference data.");
  } finally {
    setRefLoading(false);
  }
}

const [eventTypeDetailLoading, setEventTypeDetailLoading] = useState(false);
const [eventTypeDetailError, setEventTypeDetailError] = useState<string | null>(null);

const [staffLoading, setStaffLoading] = useState(false);
const [staffError, setStaffError] = useState<string | null>(null);

const [availableStaffFromApi, setAvailableStaffFromApi] = useState<StaffAvailableResponseItem[]>([]);

const eventTypeAbortRef = React.useRef<AbortController | null>(null);
const staffAbortRef = React.useRef<AbortController | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(events));
  }, [events]);

  // Lookup maps
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  const qualById = useMemo(() => new Map(qualifications.map(q => [q.id, q])), [qualifications]);
  const typeById = useMemo(() => new Map(eventTypes.map(t => [t.id, t])), [eventTypes]);
  const minNow = nowLocalDateTimeInput();
  const minEnd = startStr ? startStr : minNow;

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

  const eventStartDateForWeek = useMemo(() => {
  const d = new Date(startStr);
  return Number.isNaN(d.getTime()) ? anchorDate : d;
}, [startStr, anchorDate]);

const selectedWeekKey = useMemo(
  () => weekKeyFromDate(eventStartDateForWeek),
  [eventStartDateForWeek]
);

const isEditingPastEvent = useMemo(() => {
  if (!editingId) return false;
  const ev = events.find(e => e.id === editingId);
  return ev ? new Date(ev.start).getTime() < Date.now() : false;
}, [editingId, events]);

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

  const [locations, setLocations] = useState<LocationOption[]>(() => {
  const persisted = safeParseLocations(localStorage.getItem(LOC_LS_KEY));
  // Merge persisted user locations with default system locations
  const system = DEFAULT_LOCATIONS;
  const user = persisted.filter(l => l.source === "user");
  // Avoid duplicates by name
  const seen = new Set(system.map(s => s.name.toLowerCase()));
  const merged = [...system];
  for (const u of user) {
    const key = u.name.toLowerCase().trim();
    if (!seen.has(key)) {
      merged.push(u);
      seen.add(key);
    }
  }
  return merged;
});

const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
useEffect(() => {
  // Persist only user locations
  const userLocations = locations.filter(l => l.source === "user");
  localStorage.setItem(LOC_LS_KEY, JSON.stringify(userLocations));
}, [locations]);
const locationById = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);
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
    } else if (view === "week") {
      setAnchorDate(addDays(anchorDate, -7));
    } else if (view === "day") {
      setAnchorDate(addDays(anchorDate, -1));
    }
  }
  function goNext() {
    if (view === "month") {
      const d = new Date(anchorDate);
      d.setMonth(d.getMonth() + 1);
      setAnchorDate(startOfDay(d));
    } else if (view === "week"){
      setAnchorDate(addDays(anchorDate, 7));
    } else {
          // ✅ day view
      setAnchorDate(addDays(anchorDate, 1));
    }

  }

  const headerTitle = useMemo(() => {
    if (view === "month") {
      const d = anchorDate;
      const monthName = d.toLocaleString(undefined, { month: "long" });
      return `${monthName} ${d.getFullYear()}`;
    }
    if (view === "week") {
    const start = startOfWeek(anchorDate, 1);
    const end = addDays(start, 6);
    return `${formatYMD(start)} → ${formatYMD(end)}`;
    }
    
      // ✅ day view
      const d = anchorDate;
      const weekday = d.toLocaleString(undefined, { weekday: "long" });
      return `${weekday}, ${formatYMD(d)}`;
  }, [anchorDate, view]);

  // ---------------- Modal open/edit ----------------
  function openCreateModal(prefillDate?: Date) {
    setEditingId(null);
    setTitle("");
    setDescription("");

    const todayStart = startOfDay(new Date());

    const base = prefillDate ? startOfDay(prefillDate) : todayStart;
    
    if (base.getTime() < todayStart.getTime()) {
        alert("You can only create events for today or future dates.");
        return;
      }

    // const start = clampToDayRange(base, 10, 0);
    // const end = clampToDayRange(base, 11, 0);
    
const now = new Date();
  const start =
    prefillDate && isSameDay(prefillDate, now)
      ? new Date(now.getTime() + 15 * 60 * 1000)
      : clampToDayRange(base, 10, 0);

  const end = new Date(start.getTime() + 60 * 60 * 1000);


    // setStartStr(`${formatYMD(start)}T${pad2(start.getHours())}:${pad2(start.getMinutes())}`);
    // setEndStr(`${formatYMD(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}`);

setStartStr(utcIsoToLocalDateTimeInput(start.toISOString()));
  setEndStr(utcIsoToLocalDateTimeInput(end.toISOString()));

    // reset new fields
    setSelectedEventTypeId(null);
    setSelectedQualificationIds([]);
    setSelectedStaffIds([]);
    setMinExperienceYears(null);
    setSelectedLocationId(null);
    setIsModalOpen(true);
  }

  function openEditModal(evt: CalendarEvent) {
    setEditingId(evt.id);
    setTitle(evt.title);
    setDescription(evt.description ?? "");

    const s = new Date(evt.start);
    const e = new Date(evt.end);
    // setStartStr(`${formatYMD(s)}T${pad2(s.getHours())}:${pad2(s.getMinutes())}`);
    // setEndStr(`${formatYMD(e)}T${pad2(e.getHours())}:${pad2(e.getMinutes())}`);
    setStartStr(utcIsoToLocalDateTimeInput(evt.start));
    setEndStr(utcIsoToLocalDateTimeInput(evt.end));
    setSelectedEventTypeId(evt.eventTypeId ?? null);
    setSelectedQualificationIds(evt.qualificationIds ?? []);
    setSelectedStaffIds(evt.staffIds ?? []);
    setMinExperienceYears(evt.minExperienceYears ?? null);
    setSelectedLocationId(evt.locationId ?? null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function removeEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }
function deleteLocation(id: string) {
  setLocations(prev => prev.filter(l => l.id !== id));
  setSelectedLocationId(prev => (prev === id ? null : prev)); // ✅ clear if selected
}
const availableStaffMap = useMemo(() => {
  const m = new Map<string, StaffAvailableResponseItem>();
  for (const s of availableStaffFromApi) m.set(String(s.id), s);
  return m;
}, [availableStaffFromApi]);
function CreatableSingleSelectDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  onAdd,
  onEdit,
  onDelete,
}: {
  label: string;
  placeholder?: string;
  options: LocationOption[];
  value: string | null;
  onChange: (next: string | null) => void;

  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const [adding, setAdding] = React.useState(false);
  const [newText, setNewText] = React.useState("");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");

  const selectedName = React.useMemo(() => {
    const found = options.find(o => o.id === value);
    return found?.name ?? "";
  }, [options, value]);

  function closeInlineEditors() {
    setAdding(false);
    setNewText("");
    setEditingId(null);
    setEditText("");
  }

  function doAdd() {
    const name = newText.trim();
    if (!name) return;
    onAdd(name);
    setNewText("");
    setAdding(false);
  }

  function doStartEdit(opt: LocationOption) {
    setAdding(false);
    setNewText("");
    setEditingId(opt.id);
    setEditText(opt.name);
  }

  function doSaveEdit() {
    if (!editingId) return;
    const name = editText.trim();
    if (!name) return;
    onEdit(editingId, name);
    setEditingId(null);
    setEditText("");
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{label}</div>

      <div style={{ position: "relative" }}>
        {/* Trigger */}
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
              opacity: selectedName ? 1 : 0.7,
            }}
          >
            {selectedName || (placeholder ?? "Select...")}
          </span>
          <span style={{ fontWeight: 900, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              zIndex: 20,
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "white",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              boxShadow: "0 18px 50px rgba(2,6,23,0.12)",
              padding: 8,
              maxHeight: 220,
              overflow: "auto",
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", gap: 10 }}>
              <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                {value ? "1 selected" : "No selection"}
              </span>

              {/* <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdding(a => !a);
                    setEditingId(null);
                    setEditText("");
                  }}
                  style={miniBtn()}
                >
                  + Add
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                    closeInlineEditors();
                  }}
                  style={miniBtn()}
                >
                  Clear
                </button>
              </div> */}
            </div>

            {/* Add row */}
            {adding && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "8px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.10)",
                  background: "rgba(248,250,252,0.8)",
                  margin: "6px 0 10px",
                  alignItems: "center",
                }}
              >
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter new location..."
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    padding: "8px 10px",
                    border: "1px solid rgba(15,23,42,0.16)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  title="Add"
                  onClick={(e) => {
                    e.stopPropagation();
                    doAdd();
                  }}
                  style={iconBtnStyle("#16a34a")}
                >
                  ✓
                </button>
                <button
                  type="button"
                  title="Cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeInlineEditors();
                  }}
                  style={iconBtnStyle("#64748b")}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Options */}
            <div style={{ display: "grid", gap: 6 }}>
              {options.map(opt => {
                const isSelected = value === opt.id;
                const isUser = opt.source === "user";
                const isEditing = editingId === opt.id;

                return (
                  <div
                    key={opt.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: isSelected ? "rgba(37,99,235,0.08)" : "transparent",
                      border: "1px solid rgba(15,23,42,0.08)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (isEditing) return;
                      onChange(opt.id);
                      // Optional: close dropdown upon selection
                      // setOpen(false);
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Radio style indicator */}
                      <span
                        aria-hidden
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          border: "2px solid rgba(15,23,42,0.35)",
                          display: "inline-block",
                          background: isSelected ? "#2563eb" : "transparent",
                        }}
                      />

                      {!isEditing ? (
                        <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opt.name}
                          {opt.source === "system" ? (
                            <span style={{ fontSize: 12, opacity: 0.55, fontWeight: 800 }}>{"  "}• system</span>
                          ) : null}
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            style={{
                              flex: 1,
                              borderRadius: 10,
                              padding: "8px 10px",
                              border: "1px solid rgba(15,23,42,0.16)",
                              outline: "none",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            title="Save"
                            onClick={(e) => {
                              e.stopPropagation();
                              doSaveEdit();
                            }}
                            style={iconBtnStyle("#16a34a")}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            title="Cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeInlineEditors();
                            }}
                            style={iconBtnStyle("#64748b")}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit/Delete icons for user-created only */}
                    {!isEditing && isUser && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            doStartEdit(opt);
                          }}
                          style={iconBtnStyle("#0f172a")}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete location "${opt.name}"?`)) {
                              onDelete(opt.id);
                              closeInlineEditors();
                            }
                          }}
                          style={iconBtnStyle("#dc2626")}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  closeInlineEditors();
                }}
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
    </div>
  );
}

function miniBtn(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "6px 10px",
    border: "1px solid rgba(15,23,42,0.15)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
    color,
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
  };
}

function normalizeLocationName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function addLocation(name: string) {
  const normalized = normalizeLocationName(name);
  if (!normalized) return;

  const exists = locations.some(l => l.name.toLowerCase() === normalized.toLowerCase());
  if (exists) {
    alert("Location already exists.");
    return;
  }

  const newLoc: LocationOption = {
    id: "loc-" + uid(),
    name: normalized,
    source: "user",
  };

  setLocations(prev => [...prev, newLoc]);
  setSelectedLocationId(newLoc.id); // ✅ single select -> auto select
}


function editLocation(id: string, name: string) {
  const normalized = normalizeLocationName(name);
  if (!normalized) return;

  // Prevent renaming into a duplicate name (other than itself)
  const exists = locations.some(l => l.id !== id && l.name.toLowerCase() === normalized.toLowerCase());
  if (exists) {
    alert("Another location with same name already exists.");
    return;
  }

  setLocations(prev =>
    prev.map(l => (l.id === id ? { ...l, name: normalized } : l))
  );
}



  function validateAndSave() {
    
const nowMs = Date.now();

const startUtcIso = localDateTimeInputToUtcIso(startStr);
const endUtcIso = localDateTimeInputToUtcIso(endStr);

const s = new Date(startUtcIso);
const e = new Date(endUtcIso);

    // const s = new Date(startStr);
    // const e = new Date(endStr);

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

    const startMs = new Date(startUtcIso).getTime();
    const endMs = new Date(endUtcIso).getTime();

    // ✅ Rule 1: Start must be now or future
    if (startMs < nowMs) {
      alert("Event start time must be current or in the future.");
      return;
    }

    // ✅ Rule 2: End must be in the future
    if (endMs < nowMs) {
      alert("Event end time must be in the future.");
      return;
    }

    // ✅ Rule 3: End must be strictly after start
    if (endMs <= startMs) {
      alert("Event end time must be after the start time.");
      return;
    }

    // optional: require event type
    if (!selectedEventTypeId) {
      alert("Please select an event type.");
      return;
    }
// useEffect(() => {
//   if (!selectedEventTypeId) return;
//   if (!startStr) return;

//   const timer = setTimeout(async () => {
//     staffAbortRef.current?.abort();
//     const controller = new AbortController();
//     staffAbortRef.current = controller;

//     setStaffLoading(true);
//     setStaffError(null);

//     try {
//       const staffList = await fetchStaffAvailableForEvent(
//         { eventTypeId: selectedEventTypeId, startTime: toApiLocalStartTime(startStr) },
//         controller.signal
//       );

//       setAvailableStaffFromApi(staffList);

//       const allowed = new Set(staffList.map(s => String(s.id)));
//       setSelectedStaffIds(prev => prev.filter(x => allowed.has(x)));

//     } catch (err: any) {
//       if (err?.name === "AbortError") return;
//       setStaffError(err?.message ?? "Failed to load available staff.");
//     } finally {
//       setStaffLoading(false);
//     }
//   }, 300);

//   return () => clearTimeout(timer);
// }, [selectedEventTypeId, startStr]);
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

const staffDisplay = (selectedStaffIds ?? []).map((id) => {
  const s = availableStaffMap.get(String(id));
  const name = s?.name ?? `Unknown (${id})`;
  const designation = s?.designation ?? ""; // until API provides it
  return designation ? `${name} • ${designation}` : name;
});

    const payload: CalendarEvent = {
      id: editingId ?? uid(),
      title: title.trim(),
      description: description.trim() || undefined,
      start: startUtcIso,
      end: endUtcIso,
      eventTypeId: selectedEventTypeId,
      qualificationIds: selectedQualificationIds,
      staffIds: selectedStaffIds,
      staffDisplay : staffDisplay,
      minExperienceYears: minExperienceYears,
      locationId: selectedLocationId,
      color: pickColor(title.trim()),
    };

    setEvents(prev => {
      if (editingId) return prev.map(p => (p.id === editingId ? payload : p));
      return [...prev, payload];
    });

    setIsModalOpen(false);
  }

//   const staffOptions = useMemo(() => {
//   return availableStaff.map(s => {
//     const hours = staffWeekCommittedHours(s, selectedWeekKey);
//     return {
//       value: s.id,
//       label: `${s.name} • ${s.designation}`,
//       _meta: {
//         designation: s.designation,
//         committedHours: hours,
//       },
//     };
//   });
// }, [availableStaff, selectedWeekKey]);


const staffOptions = useMemo(() => {
  return availableStaffFromApi.map((s) => {
    const designation = s.designation ?? "—";
    return {
      value: String(s.id),
      label: `${s.name} • ${designation}`, // ✅ selected display includes designation
    };
  });
}, [availableStaffFromApi]);


// const staffMetaById = useMemo(() => {
//   const m = new Map<string, { designation: string; committedHours: number; availableHours: number; tooltip: string }>();
//   availableStaff.forEach(s => {
//     m.set(s.id, {
//       designation: s.designation,
//       committedHours: staffWeekCommittedHours(s, selectedWeekKey),
//       availableHours: staffWeekAvailableHours(s, selectedWeekKey),
//       tooltip: staffWeekTooltip(s, selectedWeekKey),
//     });
//   });
//   return m;
// }, [availableStaff, selectedWeekKey]);


const staffMetaById = useMemo(() => {
  const m = new Map<string, { committed: number; available: number; tooltip: string; designation: string }>();

  availableStaffFromApi.forEach((s) => {
    const designation = s.designation ?? "—";

    const committed = Number(s.weeklyCommittedHours ?? 0);

    // Available hours: prefer remainingHours; fallback to weeklyAvailHours - committed
    const available =
      s.remainingHours != null
        ? Number(s.remainingHours)
        : Math.max(0, Number(s.weeklyAvailHours ?? 0) - committed);

    const tooltip = eventInstanceTooltip(s.weeklyEventInstances ?? []);

    m.set(String(s.id), { committed, available, tooltip, designation });
  });

  return m;
}, [availableStaffFromApi]);


/** Convert a UTC ISO string -> "YYYY-MM-DDTHH:mm" in browser local time (for datetime-local input) */
function utcIsoToLocalDateTimeInput(utcIso: string) {
  const d = new Date(utcIso); // Date represents the instant; getters are local-time based
  return `${formatYMD(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Convert datetime-local string ("YYYY-MM-DDTHH:mm") -> UTC ISO string for DB/API */
function localDateTimeInputToUtcIso(localValue: string) {
  // In browsers, "YYYY-MM-DDTHH:mm" is interpreted as local time
  const d = new Date(localValue);
  return d.toISOString();
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
              <button
                  style={{ ...btn, padding: "8px 10px", background: view === "day" ? "#e2e8f0" : "white" }}
                  onClick={() => setView("day")}
                >
                  Day
                </button>
            </div>

            <span style={{ width: 8 }} />

            {/* <button style={btnPrimary} onClick={() => openCreateModal()}>
              + Create event
            </button> */}
            <button
              style={btnPrimary}
              onClick={async () => {
                await loadReferenceDataIfNeeded(); // ✅ pull event types + locations
                openCreateModal();
              }}
            >
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
              onDayClick={async (d) => {
                await loadReferenceDataIfNeeded();
                openCreateModal(d);
              }}
             onEventClick={openEditModal}
            />
          ) : view === "week" ? (
            <WeekView
              weekDays={weekDays}
              today={today}
              events={filteredEvents}
              onDayClick={async (d) => {
                await loadReferenceDataIfNeeded();
                openCreateModal(d);
              }}
              onEventClick={openEditModal}
            />
          ) : (
            <DayView
              day={anchorDate}
              today={today}
              events={filteredEvents}
              onAdd={() => openCreateModal(anchorDate)}
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

                // const staffNames = ev.staffIds
                //   .map(id => staffById.get(id)?.name +'-'+ staffById.get(id)?.designation)
                //   .filter(Boolean)
                //   .join(", ");
                const staffNames =
                  ev.staffDisplay?.length
                    ? ev.staffDisplay.join(", ")
                    : (ev.staffIds?.length ? ev.staffIds.join(", ") : "—");
                // const qualNames = ev.qualificationIds
                //   .map(id => qualById.get(id)?.name)
                //   .filter(Boolean)
                //   .join(", ");

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

                    {/* <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      <b>Qualifications:</b> {qualNames || "—"}
                    </div> */}

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

            {/* Event type: SINGLE select */}
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Event Type</span>
              {/* <select
                value={selectedEventTypeId ?? ""}
                onChange={(e) => setSelectedEventTypeId(e.target.value || null)}
                style={inputStyle()}
                disabled={refLoading || !!refError}
              >
                {/* <option value="">Select event type...</option>
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option> */}

                {/*  <option value="">
                  {refLoading ? "Loading event types..." : "Select event type..."}
                </option>

                {eventTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}

            </select> */}
            
            
<select
  value={selectedEventTypeId ?? ""}
  onChange={async (e) => {
    const id = e.target.value || null;
    setSelectedEventTypeId(id);

    setEventTypeDetailError(null);
    setStaffError(null);

    if (!id) {
      setAvailableStaffFromApi([]);
      return;
    }

    // Abort in-flight calls
    eventTypeAbortRef.current?.abort();
    staffAbortRef.current?.abort();

    const c1 = new AbortController();
    const c2 = new AbortController();
    eventTypeAbortRef.current = c1;
    staffAbortRef.current = c2;

    setEventTypeDetailLoading(true);
    setStaffLoading(true);

    try {
      // ---- API 1 ----
      const detail = await fetchEventTypeDetail(id, c1.signal);

      setTitle(detail.name ?? "");
      setDescription(detail.description ?? "");

      // experience is a number input: convert months -> years (integer)
      const years = Math.floor((detail.requiredExperienceMonths ?? 0) / 12);
      setMinExperienceYears(years);

      // qualifications
      const qualIds = (detail.requiredQualifications ?? []).map((q) => String(q.id));
      setSelectedQualificationIds(qualIds);

      // default duration: End = Start + defDurMins
      const startLocal = new Date(startStr);
      if (!Number.isNaN(startLocal.getTime()) && (detail.defDurMins ?? 0) > 0) {
        const endLocal = new Date(startLocal.getTime() + detail.defDurMins * 60_000);
        setEndStr(`${formatYMD(endLocal)}T${pad2(endLocal.getHours())}:${pad2(endLocal.getMinutes())}`);
      }

      setEventTypeDetailLoading(false);

      // ---- API 2 ----
      const apiStartTime = toApiLocalStartTime(startStr);
      const staffList = await fetchStaffAvailableForEvent(
        { eventTypeId: id, startTime: apiStartTime },
        c2.signal
      );

      setAvailableStaffFromApi(staffList);
      // If staff options changed, remove selected staff not present anymore
      const allowed = new Set(staffList.map(s => String(s.id)));
      setSelectedStaffIds(prev => prev.filter(x => allowed.has(x)));

    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = err?.message ?? "Failed to load event type/staff.";
      // show as detail error if detail still loading, else staff error
      if (eventTypeDetailLoading) setEventTypeDetailError(msg);
      else setStaffError(msg);
    } finally {
      setEventTypeDetailLoading(false);
      setStaffLoading(false);
    }
  }}
  style={inputStyle()}
>
  <option value="">Select event type...</option>
  {eventTypes.map((t) => (
    <option key={t.id} value={t.id}>
      {t.name}
    </option>
  ))}
</select>
{eventTypeDetailLoading && (
  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
    Loading event type details...
  </div>
)}
{eventTypeDetailError && (
  <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 800 }}>
    {eventTypeDetailError}
  </div>
)}
            {refError && (
                <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 800 }}>
                  {refError}{" "}
                  <button
                    type="button"
                    onClick={() => loadReferenceDataIfNeeded(true)}
                    style={{ marginLeft: 8, ...miniBtnStyle() }}
                  >
                    Retry
                  </button>
                </div>
              )}

            </label>

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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Start</span>
                <input
                  disabled={isEditingPastEvent}
                  type="datetime-local"
                  value={startStr}
                  min={minNow}
                  onChange={(e) => setStartStr(e.target.value)}
                  style={inputStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>End</span>
                <input
                  type="datetime-local"
                  value={endStr}
                  min={minEnd}
                  onChange={(e) => setEndStr(e.target.value)}
                  style={inputStyle()}
                />
              </label>
              {isEditingPastEvent && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(234,88,12,0.10)",
                    border: "1px solid rgba(234,88,12,0.25)",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  This event is in the past. Time cannot be modified.
                </div>
              )}
            </div>

            {/* Qualifications: MULTI select */}
            {/* <MultiSelectDropdown
              label="Qualifications (multi-select)"
              placeholder="Select qualifications..."
              options={qualifications.map(q => ({ value: q.id, label: q.name }))}
              value={selectedQualificationIds}
              onChange={setSelectedQualificationIds}
            /> */}
            <MultiSelectDropdown
              label="Qualifications (multi-select)"
              placeholder={refLoading ? "Loading qualifications..." : "Select qualifications..."}
              options={qualifications.map((q) => ({ value: q.id, label: q.name }))}
              value={selectedQualificationIds}
              onChange={setSelectedQualificationIds}
              emptyText={refLoading ? "Loading..." : "No qualifications available."}
            />
            {/* <label style={{ display: "grid", gap: 6 }}>
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
            </label> */}

            <div style={twoColResponsive}>
                {/* Experience */}
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
                      if (raw === "") {
                        setMinExperienceYears(null);
                        return;
                      }
                      const n = Number(raw);
                      if (Number.isNaN(n)) return;
                      setMinExperienceYears(Math.max(0, Math.floor(n)));
                    }}
                    style={inputStyle()}
                  />
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    Filters staff by minimum experience.
                  </span>
                </label>

                {/* Location (single select + add/edit/delete) */}
                <CreatableSingleSelectDropdown
                  label="Location"
                  placeholder="Select location..."
                  options={locations}
                  value={selectedLocationId}
                  onChange={setSelectedLocationId}
                  onAdd={addLocation}
                  onEdit={editLocation}
                  onDelete={deleteLocation}
                />
              </div>

            {/* Staff: MULTI select, populated/filtered by selected qualifications */}
            {/* <MultiSelectDropdown
              label="Assign Staff (name • designation • weekly hours committed)"
              placeholder={
                selectedQualificationIds.length > 0
                  ? "Select staff matching selected qualifications..."
                  : "Select staff..."
              }
              options={staffOptions}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              emptyText={
                selectedQualificationIds.length > 0
                  ? "No staff match the selected qualifications."
                  : "No staff available."
              }
              
              getOptionTitle={(opt) => staffMetaById.get(opt.value)?.tooltip} // ✅ hover shows events
                renderOption={(opt) => {
                  const meta = staffMetaById.get(opt.value);
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                          {meta?.designation ?? "—"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, whiteSpace: "nowrap" }}>
                        {meta ? `${meta.committedHours}h / week` : ""}
                      </div>
                    </div>
                  );
                }}
            /> */}

            {/* <MultiSelectDropdown
              label="Assign Staff (name • designation • weekly hours)"
              placeholder={
                selectedQualificationIds.length > 0
                  ? "Select staff matching selected qualifications..."
                  : "Select staff..."
              }
              options={staffOptions}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              emptyText={
                selectedQualificationIds.length > 0
                  ? "No staff match the selected qualifications/experience."
                  : "No staff available."
              }
              getOptionTitle={(opt) => staffMetaById.get(opt.value)?.tooltip} // ✅ hover shows event list
              renderOption={(opt) => {
                const meta = staffMetaById.get(opt.value);
                if (!meta) return <span style={{ fontWeight: 800 }}>{opt.label}</span>;

                // opt.label already contains "Name • Designation"
                const [name] = opt.label.split(" • ");

                return (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                        {meta.designation}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                        Committed: {meta.committedHours}h
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: meta.availableHours <= 4 ? "#dc2626" : "#16a34a" }}>
                        Available: {meta.availableHours}h
                      </div>
                    </div>
                  </div>
                );
              }}
            /> */}
            <MultiSelectDropdown
              label="Assign Staff (name • designation • weekly hours)"
              placeholder={staffLoading ? "Loading staff..." : "Select staff..."}
              options={staffOptions}
              value={selectedStaffIds}
              onChange={setSelectedStaffIds}
              emptyText={staffLoading ? "Loading..." : "No staff available for this event."}
              getOptionTitle={(opt) => staffMetaById.get(opt.value)?.tooltip}
              renderOption={(opt) => {
                const meta = staffMetaById.get(opt.value);
                const [name] = opt.label.split(" • ");

                return (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                        {meta?.designation ?? "—"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                        Committed: {meta?.committed ?? 0}h
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: (meta?.available ?? 0) <= 4 ? "#dc2626" : "#16a34a",
                        }}
                      >
                        Available: {meta?.available ?? 0}h
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {staffError && (
              <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 800, marginTop: 6 }}>
                {staffError}
              </div>
            )}
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
  renderOption,
  getOptionTitle
}: {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
  renderOption?: (opt: { value: string; label: string }, checked: boolean) => React.ReactNode;
  getOptionTitle?: (opt: { value: string; label: string }) => string | undefined;
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
                      title={getOptionTitle?.(opt)} // ✅ hover tooltip
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
                      
                    <div style={{ minWidth: 0, flex: 1 }}>
                        {renderOption ? (
                          renderOption(opt, checked)
                        ) : (
                      <span style={{ fontWeight: 800 }}>{opt.label}</span>
                    )}
                    </div>
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

function DayView({
  day,
  today,
  events,
  onAdd,
  onEventClick,
}: {
  day: Date;
  today: Date;
  events: CalendarEvent[];
  onAdd: () => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const isToday = isSameDay(day, today);

  const dayEvents = useMemo(() => {
    return events
      .filter((ev) => isSameDay(new Date(ev.start), day)) // UTC stored -> local display via Date()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, day]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.10)",
          padding: 12,
          background: isToday ? "rgba(37,99,235,0.08)" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {day.toLocaleDateString(undefined, { weekday: "long" })}{" "}
            <span style={{ opacity: 0.65, fontWeight: 800 }}>{formatYMD(day)}</span>
          </div>
          {isToday && <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 900 }}>Today</div>}
        </div>

        <button
          onClick={onAdd}
          style={{
            borderRadius: 12,
            padding: "10px 12px",
            border: "1px solid rgba(37,99,235,0.35)",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
            color: "#2563eb",
          }}
        >
          + Add event
        </button>
      </div>

      {/* Events list */}
      <div style={{ display: "grid", gap: 10 }}>
        {dayEvents.map((ev) => {
          const s = new Date(ev.start);
          const e = new Date(ev.end);

          return (
            <div
              key={ev.id}
              onClick={() => onEventClick(ev)}
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(15,23,42,0.10)",
                background: "rgba(248,250,252,0.75)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
              title="Click to edit"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: ev.color ?? "#2563eb",
                    flex: "0 0 auto",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>
                    {pad2(s.getHours())}:{pad2(s.getMinutes())} → {pad2(e.getHours())}:{pad2(e.getMinutes())}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, whiteSpace: "nowrap" }}>
                {ev.staffIds?.length ? `${ev.staffIds.length} staff` : "No staff"}
              </div>
            </div>
          );
        })}

        {dayEvents.length === 0 && (
          <div
            style={{
              fontSize: 13,
              opacity: 0.7,
              border: "1px dashed rgba(15,23,42,0.2)",
              borderRadius: 16,
              padding: 14,
              background: "white",
            }}
          >
            No events for this day. Click “+ Add event”.
          </div>
        )}
      </div>
    </div>
  );
}