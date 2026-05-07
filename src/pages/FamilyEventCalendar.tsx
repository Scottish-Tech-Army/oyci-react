import { useState, useEffect, useRef } from 'react';
import { familyApi } from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS_HEADER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const toISO = (d: Date) => d.toISOString().split('T')[0];
const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDay   = (y: number, m: number) => new Date(y, m, 1).getDay();

// Supports both single-date (e.date) and date-range (e.startDate/e.endDate) events
const getEventDate = (e: any): string => e.date || e.startDate || '';

const expandEventDates = (e: any): string[] => {
  const start = e.startDate || e.date;
  const end   = e.endDate   || e.date;
  if (!start) return [];
  const dates: string[] = [];
  const endD = new Date(end);
  for (let d = new Date(start); d <= endD; d.setDate(d.getDate() + 1)) {
    dates.push(toISO(new Date(d)));
  }
  return dates;
};

const PALETTE = [
  { pill: '#22c55e', bg: 'rgba(34,197,94,0.18)',   text: '#16a34a' },
  { pill: '#8b5cf6', bg: 'rgba(139,92,246,0.18)',  text: '#7c3aed' },
  { pill: '#ec4899', bg: 'rgba(236,72,153,0.15)',  text: '#db2777' },
  { pill: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  text: '#b45309' },
  { pill: '#0ea5e9', bg: 'rgba(14,165,233,0.15)',  text: '#0369a1' },
  { pill: '#ef4444', bg: 'rgba(239,68,68,0.15)',   text: '#dc2626' },
];

// ── Component ─────────────────────────────────────────────────────────────────
const FamilyEventCalendar = () => {
  const today    = new Date();
  const todayISO = toISO(today);

  const [events, setEvents]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [viewYear, setViewYear]       = useState(today.getFullYear());
  const [viewMonth, setViewMonth]     = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const familyStr = localStorage.getItem('family');
  const familyData = familyStr ? JSON.parse(familyStr) : null;
  const myFamilyId = familyData?.familyId || '';

  const fetchEvents = () => {
    familyApi.get('/events/family')
      .then(r => {
        // Only show events this child is onboarded to
        const onboarded = r.data.filter((e: any) =>
          (e.registeredFamilies || []).some((id: string) => id.toString() === myFamilyId)
        );
        setEvents(onboarded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  // Map ISO date → list of events
  const dateMap: Record<string, any[]> = {};
  events.forEach((e, idx) => {
    expandEventDates(e).forEach(iso => {
      if (!dateMap[iso]) dateMap[iso] = [];
      dateMap[iso].push({ ...e, _colorIdx: idx % PALETTE.length });
    });
  });

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDay(todayISO); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDay(viewYear, viewMonth);
  const totalCells  = firstDay + daysInMonth;
  const totalRows   = Math.ceil(totalCells / 7);
  const MAX_VISIBLE_PILLS = totalRows <= 5 ? 3 : 2;

  const selectedEvents = selectedDay ? (dateMap[selectedDay] || []) : [];

  const isRegistered = (event: any) => {
    if (!myFamilyId) return false;
    return (event.registeredFamilies || []).some((id: string) => id === myFamilyId);
  };


  // ── Upcoming Events Logic ──
  const now = new Date();
  
  const startThisWeek = new Date(now);
  startThisWeek.setDate(now.getDate() - now.getDay());
  startThisWeek.setHours(0,0,0,0);

  const endThisWeek = new Date(startThisWeek);
  endThisWeek.setDate(endThisWeek.getDate() + 6);
  endThisWeek.setHours(23,59,59,999);

  const startNextWeek = new Date(endThisWeek);
  startNextWeek.setDate(startNextWeek.getDate() + 1);
  startNextWeek.setHours(0,0,0,0);

  const endNextWeek = new Date(startNextWeek);
  endNextWeek.setDate(endNextWeek.getDate() + 6);
  endNextWeek.setHours(23,59,59,999);

  const thisWeekEvents = events.filter(e => {
    const d = new Date(getEventDate(e) + 'T12:00:00');
    return d >= startThisWeek && d <= endThisWeek;
  }).sort((a, b) => new Date(getEventDate(a)).getTime() - new Date(getEventDate(b)).getTime());

  const nextWeekEvents = events.filter(e => {
    const d = new Date(getEventDate(e) + 'T12:00:00');
    return d >= startNextWeek && d <= endNextWeek;
  }).sort((a, b) => new Date(getEventDate(a)).getTime() - new Date(getEventDate(b)).getTime());

  // ── Render Event Card Helper ──
  const renderEventCard = (e: any, idx: number, listKey: string) => {
    const colorObj = PALETTE[e._colorIdx ?? (idx % PALETTE.length)];
    const { pill, bg } = colorObj;
    const registered = isRegistered(e);
    const staffList: any[] = e.assignedStaff || [];

    return (
      <div key={`${listKey}-${e._id}-${idx}`} style={{
        background: 'var(--bg-card)', borderRadius: '12px',
        border: registered ? '1.5px solid #22c55e' : '1px solid var(--border)',
        overflow: 'hidden',
        animation: `slideUp 0.2s ease ${idx * 0.06}s both`,
      }}>
        {/* Accent bar */}
        <div style={{ height: '5px', background: registered ? 'linear-gradient(90deg, #22c55e, #16a34a)' : `linear-gradient(90deg, ${pill}, ${pill}88)` }} />

        <div style={{ padding: '14px 16px' }}>
          {/* Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {e.eventName}
            </h4>
            {registered && (
              <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#16a34a', whiteSpace: 'nowrap', flexShrink: 0 }}>
                ✓ Onboarded
              </span>
            )}
          </div>

          {/* Location */}
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📍</span> {e.location}
          </p>

          {/* Metadata chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {[
              e.date && { icon: '📅', label: e.date },
              e.startTime && e.endTime && { icon: '🕐', label: `${e.startTime} – ${e.endTime}` },
              e.sessionType && { icon: '🏷️', label: e.sessionType },
            ].filter(Boolean).map((chip: any) => (
              <span key={chip.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                padding: '3px 9px', borderRadius: '99px',
                background: bg, color: pill, fontSize: '11px', fontWeight: 600,
                border: `1px solid ${pill}33`,
              }}>
                {chip.icon} {chip.label}
              </span>
            ))}
          </div>

          {/* Assigned Staff Section */}
          {staffList.length > 0 && (
            <div style={{ marginBottom: '14px', padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                👥 Assigned Staff ({staffList.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {staffList.map((s: any) => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 800, color: '#fff',
                    }}>
                      {(s.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 1px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.firstName} {s.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {s.roleType || 'Staff'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      {s.phoneNumber && (
                        <a href={`tel:${s.phoneNumber}`} style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                          📞 {s.phoneNumber}
                        </a>
                      )}
                      {s.emailId && (
                        <a href={`mailto:${s.emailId}`} style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                          ✉️ {s.emailId}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {staffList.length === 0 && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                👤 No staff assigned yet
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>

      {/* ── LEFT: Calendar Grid ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: selectedDay ? '1px solid var(--border)' : 'none' }}>

        {/* Top bar */}
        <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
            <span>{MONTHS[viewMonth]}</span>{' '}
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{viewYear}</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={prevMonth} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={goToday} style={{ padding: '5px 18px', borderRadius: '99px', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>Today</button>
            <button onClick={nextMonth} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '16px 0 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {DAYS_HEADER.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${totalRows}, 1fr)`, overflow: 'hidden' }}>
          {Array.from({ length: totalRows * 7 }).map((_, cellIdx) => {
            const dayNum = cellIdx - firstDay + 1;
            const valid = dayNum >= 1 && dayNum <= daysInMonth;
            const isoDate = valid ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : null;
            const isToday = isoDate === todayISO;
            const isSelected = isoDate === selectedDay;
            const cellEvents = isoDate ? (dateMap[isoDate] || []) : [];
            const extraCount = cellEvents.length - MAX_VISIBLE_PILLS;
            const isOverflow = !valid;
            let overflowDay = '';
            if (cellIdx < firstDay) {
              const prevTotal = getDaysInMonth(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
              overflowDay = String(prevTotal - firstDay + cellIdx + 1);
            } else if (dayNum > daysInMonth) {
              overflowDay = String(dayNum - daysInMonth);
            }

            return (
              <div key={cellIdx}
                onClick={() => isoDate && setSelectedDay(prev => prev === isoDate ? null : isoDate)}
                style={{
                  borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                  padding: '6px 6px 4px', cursor: valid ? 'pointer' : 'default',
                  background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                  position: 'relative', overflow: 'hidden', transition: 'background 0.15s', minHeight: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '50%',
                    fontSize: isToday ? '13px' : '12px', fontWeight: isToday ? 800 : valid ? 500 : 400,
                    color: isToday ? '#fff' : isOverflow ? 'var(--text-secondary)' : 'var(--text-primary)',
                    background: isToday ? '#ef4444' : 'transparent', opacity: isOverflow ? 0.4 : 1,
                  }}>
                    {valid ? dayNum : overflowDay}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {cellEvents.slice(0, MAX_VISIBLE_PILLS).map((e: any) => {
                    const { pill } = PALETTE[e._colorIdx];
                    const registered = isRegistered(e);
                    return (
                      <div key={e._id} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: registered ? 'rgba(34,197,94,0.18)' : `${pill}22`,
                        borderLeft: `3px solid ${registered ? '#22c55e' : pill}`,
                        borderRadius: '3px', padding: '1px 5px',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: registered ? '#16a34a' : pill, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {registered && '✓ '}{e.eventName}
                        </span>
                      </div>
                    );
                  })}
                  {extraCount > 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, paddingLeft: '4px' }}>+{extraCount} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Detail Panel / Upcoming ─────────────────────────────────── */}
      {selectedDay ? (
        <div ref={panelRef} style={{
          width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          overflowY: 'auto', background: 'var(--bg-input)', borderLeft: '1px solid var(--border)',
          animation: 'slideInFromRight 0.22s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {/* Panel header */}
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, color: selectedDay === todayISO ? '#ef4444' : 'var(--text-primary)' }}>
                    {new Date(selectedDay + 'T12:00:00').getDate()}
                  </span>
                  <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', padding: '4px', lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {selectedEvents.length === 0 ? 'No events on this day' : `${selectedEvents.length} ${selectedEvents.length === 1 ? 'event' : 'events'}`}
            </p>
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
              selectedEvents.map((e: any, idx: number) => renderEventCard(e, idx, 'daily'))
            )}
          </div>
        </div>
      ) : (
        <div style={{
          width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          overflowY: 'auto', background: 'var(--bg-input)', borderLeft: '1px solid var(--border)',
          animation: 'slideInFromRight 0.22s cubic-bezier(0.16,1,0.3,1) both',
        }}>
           <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>
             <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Calendar</h3>
             <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Highlighting this week and next week.</p>
           </div>
           
           <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* This Week */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> This Week
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loading ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading…</div>
                  ) : thisWeekEvents.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center' }}>No events scheduled for this week.</p>
                  ) : (
                    thisWeekEvents.map((e, idx) => renderEventCard(e, idx, 'this-week'))
                  )}
                </div>
              </div>

              {/* Next Week */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} /> Next Week
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loading ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading…</div>
                  ) : nextWeekEvents.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center' }}>No events scheduled for next week.</p>
                  ) : (
                    nextWeekEvents.map((e, idx) => renderEventCard(e, idx, 'next-week'))
                  )}
                </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default FamilyEventCalendar;
