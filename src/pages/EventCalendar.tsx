import { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import axios from 'axios';

interface EventForm {
  eventName: string;
  location: string;
  sessionType: string;
  sessionTime: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredYouthWorkers: number | '';
  requiredSessionSupport: number | '';
}

const SESSION_TYPES = ['General', 'ASC', 'Drama', 'PIAW'];

const EMPTY_FORM: EventForm = {
  eventName: '',
  location: '',
  sessionType: 'General',
  sessionTime: 'AFTERNOON_TO_EVENING',
  date: '',
  startTime: '',
  endTime: '',
  requiredYouthWorkers: 2,
  requiredSessionSupport: 1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS_HEADER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const toISO = (d: Date) => d.toISOString().split('T')[0];

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDay   = (y: number, m: number) => new Date(y, m, 1).getDay();

// Expand an event across every date it spans
// For single-day events (current model), this is just the event date.
const expandEventDates = (e: any): string[] => {
  if (e.date) return [e.date]; // New model uses 'date'
  if (e.startDate && e.endDate) { // Fallback for legacy DB entries if they exist
    const dates: string[] = [];
    const end = new Date(e.endDate);
    for (let d = new Date(e.startDate); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(toISO(new Date(d)));
    }
    return dates;
  }
  return [];
};

// Consistent colour per event (cycles through palette)
const PALETTE = [
  { pill: '#22c55e', bg: 'rgba(34,197,94,0.18)',   text: '#16a34a' },
  { pill: '#8b5cf6', bg: 'rgba(139,92,246,0.18)',  text: '#7c3aed' },
  { pill: '#ec4899', bg: 'rgba(236,72,153,0.15)',  text: '#db2777' },
  { pill: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  text: '#b45309' },
  { pill: '#0ea5e9', bg: 'rgba(14,165,233,0.15)',  text: '#0369a1' },
  { pill: '#ef4444', bg: 'rgba(239,68,68,0.15)',   text: '#dc2626' },
];

const getEventStatus = (e: any): 'YET_TO_START' | 'ONGOING' | 'COMPLETED' => {
  if (e.isManuallyCompleted) return 'COMPLETED';
  if (!e.date || !e.startTime || !e.endTime) return 'YET_TO_START';

  const now = new Date();
  const startObj = new Date(`${e.date}T${e.startTime}:00`);
  const endObj = new Date(`${e.date}T${e.endTime}:00`);

  if (now < startObj) return 'YET_TO_START';
  if (now > endObj) return 'COMPLETED';
  return 'ONGOING';
};

// ── Main Component ────────────────────────────────────────────────────────────
interface EventCalendarProps { isAdmin?: boolean; }

const EventCalendar = ({ isAdmin = false }: EventCalendarProps) => {
  const today      = new Date();
  const todayISO   = toISO(today);

  const [events, setEvents]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayISO);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Create/Edit modal state (admin only) ───────────────────────────────
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm]                   = useState<EventForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [formError, setFormError]         = useState('');

  const openCreateModal = (prefilledDate?: string) => {
    setEditingEventId(null);
    setForm({ ...EMPTY_FORM, date: prefilledDate ?? '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (ev: any) => {
    setEditingEventId(ev._id);
    setForm({
      eventName: ev.eventName || '',
      location: ev.location || '',
      sessionType: ev.sessionType || 'General',
      sessionTime: ev.sessionTime || 'AFTERNOON_TO_EVENING',
      date: ev.date || '',
      startTime: ev.startTime || '',
      endTime: ev.endTime || '',
      requiredYouthWorkers: ev.requiredYouthWorkers ?? 2,
      requiredSessionSupport: ev.requiredSessionSupport ?? 1,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (ev: any) => {
    const hasStaff = Array.isArray(ev.assignedStaff) && ev.assignedStaff.length > 0;
    const msg = hasStaff
      ? `"${ev.eventName}" has ${ev.assignedStaff.length} staff assigned. Are you sure you want to delete it?`
      : `Delete "${ev.eventName}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await API.delete(`/events/${ev._id}`);
      const r = await API.get('/events');
      setEvents(r.data);
    } catch {
      alert('Failed to delete event.');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventName || !form.location || !form.sessionType || !form.date || !form.startTime || !form.endTime) {
      setFormError('Please fill out all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingEventId) {
        await API.put(`/events/${editingEventId}`, form);
      } else {
        await API.post('/events', form);
      }
      setIsModalOpen(false);
      setEditingEventId(null);
      const r = await API.get('/events');
      setEvents(r.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.message || 'Failed to save event.');
      } else {
        setFormError('Failed to save event.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    API.get('/events')
      .then(r => setEvents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map ISO date → list of events
  const dateMap: Record<string, any[]> = {};
  events.forEach((e, idx) => {
    expandEventDates(e).forEach(iso => {
      if (!dateMap[iso]) dateMap[iso] = [];
      dateMap[iso].push({ ...e, _colorIdx: idx % PALETTE.length });
    });
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(todayISO);
  };

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDay     = getFirstDay(viewYear, viewMonth);
  // How many rows we need
  const totalCells   = firstDay + daysInMonth;
  const totalRows    = Math.ceil(totalCells / 7);

  const selectedEvents = selectedDay ? (dateMap[selectedDay] || []) : [];

  const MAX_VISIBLE_PILLS = totalRows <= 5 ? 3 : 2;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>

      {/* ── LEFT: Full Calendar Grid ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: selectedDay ? '1px solid var(--border)' : 'none' }}>

        {/* Top bar */}
        <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
            <span style={{ fontWeight: 800 }}>{MONTHS[viewMonth]}</span>{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{viewYear}</span>
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={prevMonth} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <button onClick={goToday} style={{ padding: '5px 18px', borderRadius: '99px', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>Today</button>
            <button onClick={nextMonth} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            {isAdmin && (
              <button
                onClick={() => openCreateModal()}
                style={{
                  padding: '5px 16px', borderRadius: '99px', border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginLeft: '4px',
                }}
              >
                + Add Event
              </button>
            )}
          </div>
        </div>

        {/* Day-of-week header row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '16px 0 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {DAYS_HEADER.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${totalRows}, 1fr)`, overflow: 'hidden' }}>
          {Array.from({ length: totalRows * 7 }).map((_, cellIdx) => {
            const dayNum  = cellIdx - firstDay + 1;
            const valid   = dayNum >= 1 && dayNum <= daysInMonth;
            const isoDate = valid
              ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : null;
            const isToday    = isoDate === todayISO;
            const isSelected = isoDate === selectedDay;
            const cellEvents = isoDate ? (dateMap[isoDate] || []) : [];
            const extraCount = cellEvents.length - MAX_VISIBLE_PILLS;

            // Determine if cell is in the previous or next month area
            const isOverflow = !valid;
            // Adjacent month day numbers
            let overflowDay = '';
            if (cellIdx < firstDay) {
              const prevTotal = getDaysInMonth(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
              overflowDay = String(prevTotal - firstDay + cellIdx + 1);
            } else if (dayNum > daysInMonth) {
              overflowDay = String(dayNum - daysInMonth);
            }

            return (
              <div
                key={cellIdx}
                onClick={() => isoDate && setSelectedDay(prev => prev === isoDate ? null : isoDate)}
                style={{
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  cursor: valid ? 'pointer' : 'default',
                  background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'background 0.15s',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Day number — absolute top-right */}
                <div style={{ position: 'absolute', top: '4px', right: '5px', zIndex: 2 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '22px', height: '22px', borderRadius: '50%',
                    fontSize: isToday ? '12px' : '11px',
                    fontWeight: isToday ? 800 : valid ? 500 : 400,
                    color: isToday ? '#fff' : isOverflow ? 'var(--text-secondary)' : 'var(--text-primary)',
                    background: isToday ? '#ef4444' : 'transparent',
                    opacity: isOverflow ? 0.4 : 1,
                  }}>
                    {valid ? dayNum : overflowDay}
                  </span>
                </div>

                {/* Color-filled event blocks */}
                {cellEvents.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '28px', gap: '2px', padding: '0 3px 3px' }}>
                    {cellEvents.slice(0, MAX_VISIBLE_PILLS).map((e: any, i: number) => {
                      const { pill, text } = PALETTE[e._colorIdx];
                      const isLast = i === Math.min(cellEvents.length, MAX_VISIBLE_PILLS) - 1;
                      const showExtra = isLast && extraCount > 0;
                      return (
                        <div
                          key={e._id}
                          style={{
                            flex: 1,
                            background: `${pill}20`,
                            borderLeft: `3px solid ${pill}`,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '5px',
                            paddingRight: '4px',
                            overflow: 'hidden',
                            minHeight: 0,
                            animation: `calEventFadeIn 0.25s ease ${i * 0.05}s both`,
                          }}
                        >
                          <span style={{
                            fontSize: '10px', fontWeight: 700,
                            color: text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {showExtra ? `+${extraCount + 1} more` : e.eventName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Detail Panel ────────────────────────────────────────────── */}
      {selectedDay && (
        <div
          ref={panelRef}
          style={{
            width: '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: 'var(--bg-input)',
            animation: 'slideInFromRight 0.22s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Panel header */}
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{
                    fontSize: '48px', fontWeight: 800, lineHeight: 1,
                    color: selectedDay === todayISO ? '#ef4444' : 'var(--text-primary)',
                  }}>
                    {new Date(selectedDay + 'T12:00:00').getDate()}
                  </span>
                  <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px',
                color: 'var(--text-secondary)', padding: '4px', lineHeight: 1,
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                {selectedEvents.length === 0
                  ? 'No events on this day'
                  : `${selectedEvents.length} ${selectedEvents.length === 1 ? 'event' : 'events'}`}
              </p>
              {isAdmin && (
                <button
                  onClick={() => openCreateModal(selectedDay)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Add Event
                </button>
              )}
            </div>
          </div>

          {/* Event cards */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading…</div>
            ) : selectedEvents.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>No events scheduled</p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Dates with events show coloured pills on the calendar
                </p>
              </div>
            ) : (
              selectedEvents.map((e: any, idx: number) => {
                const { pill, bg } = PALETTE[e._colorIdx];
                const assignedCount = Array.isArray(e.assignedStaff) ? e.assignedStaff.length : 0;
                const totalNeeded = (e.requiredYouthWorkers || 0) + (e.requiredSessionSupport || 0);
                const isFull = assignedCount >= totalNeeded && totalNeeded > 0;

                return (
                  <div key={e._id + idx} style={{
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    animation: `slideUp 0.2s ease ${idx * 0.06}s both`,
                  }}>
                    {/* Accent bar */}
                    <div style={{ height: '5px', background: `linear-gradient(90deg, ${pill}, ${pill}88)` }} />

                    <div style={{ padding: '14px 16px' }}>
                      {/* Title + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {e.eventName}
                        </h4>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {isAdmin && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
                              background: isFull ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                              color: isFull ? '#16a34a' : '#ca8a04',
                              marginLeft: '6px', whiteSpace: 'nowrap', flexShrink: 0,
                            }}>
                              {isFull ? '✓ Staffed' : '⚠ Open'}
                            </span>
                          )}
                          <span style={{
                            padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
                            background: getEventStatus(e) === 'COMPLETED' ? 'rgba(100,100,100,0.1)' : getEventStatus(e) === 'ONGOING' ? 'rgba(14,165,233,0.1)' : 'rgba(156,163,175,0.1)',
                            color: getEventStatus(e) === 'COMPLETED' ? '#6b7280' : getEventStatus(e) === 'ONGOING' ? '#0284c7' : '#9ca3af',
                            marginLeft: '6px', whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            {getEventStatus(e) === 'COMPLETED' ? '🏁 Completed' : getEventStatus(e) === 'ONGOING' ? '▶️ Ongoing' : '⏳ Yet to Start'}
                          </span>
                        </div>
                      </div>

                      {/* Location */}
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📍</span> {e.location}
                      </p>

                      {/* Metadata chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {[
                          { icon: '🕐', label: `${e.startTime || '?'} - ${e.endTime || '?'}` },
                          { icon: '👥', label: `${assignedCount} / ${totalNeeded} staff (${e.requiredYouthWorkers || 0} YW, ${e.requiredSessionSupport || 0} SS)` },
                        ].map(chip => (
                          <span key={chip.label} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            padding: '3px 9px', borderRadius: '99px',
                            background: bg, color: pill,
                            fontSize: '11px', fontWeight: 600,
                            border: `1px solid ${pill}33`,
                          }}>
                            {chip.icon} {chip.label}
                          </span>
                        ))}
                      </div>

                      {/* Edit / Delete actions (admin only) */}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                          <button
                            onClick={() => openEditModal(e)}
                            style={{ flex: 1, padding: '6px 0', borderRadius: '7px', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(e)}
                            style={{ flex: 1, padding: '6px 0', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.5)', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      )}

                      {/* Assigned Staff */}
                      {e.assignedStaff?.length > 0 && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                          <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Assigned Staff
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {e.assignedStaff.map((staff: any) => {
                              const name = typeof staff === 'string' ? staff : `${staff.firstName} ${staff.lastName}`;
                              return (
                                <span key={typeof staff === 'string' ? staff : staff._id} style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                  background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                                }}>
                                  👤 {name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes calEventFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Create Event Modal (admin only) ───────────────────────────────── */}
      {isAdmin && isModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div
            style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{editingEventId ? '✏️ Edit Session' : '📅 Schedule New Session'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#ef4444', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontWeight: 700 }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px' }}>
              {formError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {formError}</div>}

              <form onSubmit={handleCreateSubmit} className="auth-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Session Title <span className="required">*</span></label>
                    <input name="eventName" type="text" className="form-input" value={form.eventName} onChange={handleFormChange} placeholder="e.g. Wednesday ASC Group" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location <span className="required">*</span></label>
                    <input name="location" type="text" className="form-input" value={form.location} onChange={handleFormChange} placeholder="e.g. Main Hall" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Session Type <span className="required">*</span></label>
                    <select name="sessionType" className="form-input" value={form.sessionType} onChange={handleFormChange}>
                      {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date <span className="required">*</span></label>
                    <input name="date" type="date" className="form-input" value={form.date} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Time <span className="required">*</span></label>
                    <input name="startTime" type="time" className="form-input" value={form.startTime} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time <span className="required">*</span></label>
                    <input name="endTime" type="time" className="form-input" value={form.endTime} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Youth Workers Required</label>
                    <input name="requiredYouthWorkers" type="number" min="0" className="form-input" value={form.requiredYouthWorkers} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Session Support Required</label>
                    <input name="requiredSessionSupport" type="number" min="0" className="form-input" value={form.requiredSessionSupport} onChange={handleFormChange} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}>
                    {isSubmitting ? 'Saving…' : editingEventId ? '💾 Save Changes' : '💾 Create Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
