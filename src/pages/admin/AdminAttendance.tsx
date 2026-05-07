import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../../services/api';

// ── helpers ────────────────────────────────────────────────────────────────────
const getEventStatus = (e: any): 'previous' | 'current' | 'upcoming' => {
  if (!e.date) return 'upcoming';
  const now   = new Date();
  const start = new Date(`${e.date}T${e.startTime || '00:00'}:00`);
  const end   = new Date(`${e.date}T${e.endTime   || '23:59'}:00`);
  if (now > end)   return 'previous';
  if (now < start) return 'upcoming';
  return 'current';
};

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', bg: 'rgba(16,185,129,0.14)', color: '#10b981', border: 'rgba(16,185,129,0.4)', icon: '✅' },
  ABSENT:  { label: 'Absent',  bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.35)', icon: '❌' },
  LATE:    { label: 'Late',    bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.35)', icon: '⏱️' },
} as const;

type AttStatus = keyof typeof STATUS_CONFIG;

const LS_KEY = 'att_selectedEventId';

// ── Component ──────────────────────────────────────────────────────────────────
const AdminAttendance = () => {
  const [events,           setEvents          ] = useState<any[]>([]);
  const [selectedEvent,    setSelectedEvent   ] = useState<any | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  // attendanceMap: the current (persisted) state from DB
  const [attendanceMap,    setAttendanceMap   ] = useState<Record<string, AttStatus>>({});
  // savingRow: tracks which familyId is currently being auto-saved
  const [savingRow,        setSavingRow       ] = useState<Record<string, boolean>>({});
  // bulkSaving: when "mark all" triggers a batch save
  const [bulkSaving,       setBulkSaving      ] = useState(false);
  const [filterStatus,     setFilterStatus    ] = useState<string>('all');
  const [loadingDetail,    setLoadingDetail   ] = useState(false);
  const [toast,            setToast           ] = useState<{ msg: string; ok: boolean } | null>(null);
  const [metrics,          setMetrics         ] = useState({ total: 0, present: 0, absent: 0, late: 0 });

  // keep latest enrolledStudents in a ref so auto-save closures see fresh data
  const enrolledRef = useRef(enrolledStudents);
  useEffect(() => { enrolledRef.current = enrolledStudents; }, [enrolledStudents]);

  // Date filter — default: current week
  const getStartOfWeek = () => {
    const d = new Date(); const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - day + 1); return d.toISOString().split('T')[0];
  };
  const getEndOfWeek = () => {
    const d = new Date(); const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - day + 7); return d.toISOString().split('T')[0];
  };
  const [fromDate, setFromDate] = useState(getStartOfWeek());
  const [toDate,   setToDate  ] = useState(getEndOfWeek());

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshMetrics = () =>
    API.get('/attendance/metrics/overview').then(r => setMetrics(r.data)).catch(() => {});

  // ── Load attendance for an event (also called on auto-restore) ───────────────
  const loadDetail = useCallback(async (eventId: string) => {
    setLoadingDetail(true);
    setAttendanceMap({});
    setEnrolledStudents([]);
    try {
      const { data } = await API.get(`/attendance/${eventId}`);
      setSelectedEvent(data.event);
      setEnrolledStudents(data.enrolledStudents || []);
      // ← attendanceMap comes straight from DB: already persisted
      setAttendanceMap(data.attendanceMap || {});
      // Save for page-refresh restore
      localStorage.setItem(LS_KEY, eventId);
    } catch (err) {
      console.error('Failed to load attendance detail', err);
      showToast('Failed to load attendance data.', false);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── On mount: load events + metrics, then auto-restore last session ───────────
  useEffect(() => {
    const init = async () => {
      try {
        const [evRes, metricsRes] = await Promise.all([
          API.get('/events'),
          API.get('/attendance/metrics/overview'),
        ]);
        setEvents(evRes.data);
        setMetrics(metricsRes.data);

        // Auto-restore the previously selected event on page refresh
        const savedId = localStorage.getItem(LS_KEY);
        if (savedId && evRes.data.some((e: any) => e._id === savedId)) {
          await loadDetail(savedId);
        }
      } catch (err) {
        console.error('Init failed:', err);
      }
    };
    init();
  }, [loadDetail]);

  const handleSelectEvent = (e: any) => loadDetail(e._id);

  // ── AUTO-SAVE: single row ────────────────────────────────────────────────────
  const saveOne = async (
    familyId: string,
    childName: string,
    status: AttStatus,
    eventId: string
  ) => {
    setSavingRow(prev => ({ ...prev, [familyId]: true }));
    try {
      await API.post(`/attendance/${eventId}/mark`, {
        records: [{ familyId, childName, status }],
      });
      // update local map to reflect DB state
      setAttendanceMap(prev => ({ ...prev, [familyId]: status }));
      refreshMetrics();
    } catch {
      showToast('Failed to save — please try again.', false);
    } finally {
      setSavingRow(prev => ({ ...prev, [familyId]: false }));
    }
  };

  const handleToggle = (familyId: string, childName: string, status: AttStatus) => {
    if (!selectedEvent?._id) return;
    // Optimistically update UI instantly, then persist
    setAttendanceMap(prev => ({ ...prev, [familyId]: status }));
    saveOne(familyId, childName, status, selectedEvent._id);
  };

  // ── MARK ALL: batch save ─────────────────────────────────────────────────────
  const markAll = async (status: AttStatus) => {
    if (!selectedEvent?._id || enrolledRef.current.length === 0) return;
    setBulkSaving(true);
    // Optimistic UI
    const next: Record<string, AttStatus> = {};
    enrolledRef.current.forEach(s => { next[s.familyId] = status; });
    setAttendanceMap(next);
    try {
      const records = enrolledRef.current.map(s => ({
        familyId:  s.familyId,
        childName: s.childName,
        status,
      }));
      await API.post(`/attendance/${selectedEvent._id}/mark`, { records });
      refreshMetrics();
      showToast(`All marked as ${STATUS_CONFIG[status].label}`, true);
    } catch {
      showToast('Bulk save failed — please try again.', false);
    } finally {
      setBulkSaving(false);
    }
  };

  // Computed session metrics
  const total   = enrolledStudents.length;
  const marked  = enrolledStudents.filter(s => attendanceMap[s.familyId]).length;
  const present = enrolledStudents.filter(s => attendanceMap[s.familyId] === 'PRESENT').length;
  const absent  = enrolledStudents.filter(s => attendanceMap[s.familyId] === 'ABSENT').length;
  const late    = enrolledStudents.filter(s => attendanceMap[s.familyId] === 'LATE').length;
  const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  // Event list filters
  const displayedEvents = events
    .map(e => ({ ...e, _status: getEventStatus(e) }))
    .filter(e => {
      if (filterStatus !== 'all' && e._status !== filterStatus) return false;
      if (fromDate && e.date < fromDate) return false;
      if (toDate   && e.date > toDate)   return false;
      return true;
    })
    .sort((a, b) => b.date?.localeCompare(a.date) || 0);

  const statusBadge = (s: string) => {
    const map: Record<string, [string, string]> = {
      previous: ['#6366f1', 'rgba(99,102,241,0.12)'],
      current:  ['#22c55e', 'rgba(34,197,94,0.12)'],
      upcoming: ['#f59e0b', 'rgba(245,158,11,0.12)'],
    };
    const [c, bg] = map[s] || ['#6b7280', '#f3f4f6'];
    return (
      <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
        background: bg, color: c, border: `1px solid ${c}40`, textTransform: 'uppercase' as const }}>
        {s}
      </span>
    );
  };

  const FILTER_TABS = [
    { id: 'all',      label: 'All'      },
    { id: 'previous', label: 'Previous' },
    { id: 'current',  label: 'Current'  },
    { id: 'upcoming', label: 'Upcoming' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px', alignItems: 'start' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.ok ? '#022c22' : '#450a0a',
          border: `1px solid ${toast.ok ? '#16a34a' : '#dc2626'}`,
          color: toast.ok ? '#4ade80' : '#f87171',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>{toast.msg}</div>
      )}

      {/* ── LEFT: Detail Panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Global KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Marked',  value: metrics.total,   color: '#6366f1', icon: '📋' },
            { label: 'Total Present', value: metrics.present, color: '#10b981', icon: '✅' },
            { label: 'Total Absent',  value: metrics.absent,  color: '#ef4444', icon: '❌' },
            { label: 'Total Late',    value: metrics.late,    color: '#f59e0b', icon: '⏱️' },
          ].map(k => (
            <div key={k.label} className="admin-table-card" style={{ padding: '16px 18px', borderLeft: `4px solid ${k.color}` }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' as const }}>
                {k.icon} {k.label}
              </p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Session Panel */}
        <div className="admin-table-card" style={{ padding: 0, overflow: 'hidden' }}>
          {!selectedEvent ? (
            <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '52px', marginBottom: '16px' }}>👈</span>
              <h3 style={{ margin: 0 }}>Select a Session</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Pick a session from the list on the right to start marking attendance.</p>
            </div>
          ) : loadingDetail ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '32px' }}>⏳</span>
              <p>Loading students & saved attendance…</p>
            </div>
          ) : (
            <>
              {/* Session header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    📋 {selectedEvent.eventName}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    📅 {selectedEvent.date} &nbsp;·&nbsp; ⏰ {selectedEvent.startTime}–{selectedEvent.endTime} &nbsp;·&nbsp; 📍 {selectedEvent.location}
                  </p>
                </div>
                {/* Auto-save indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', padding: '5px 12px', borderRadius: '99px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Auto-saves on click
                </div>
              </div>

              {/* Session metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'Enrolled', value: total,     color: '#6366f1' },
                  { label: 'Marked',   value: marked,    color: '#8b5cf6' },
                  { label: 'Present',  value: present,   color: '#10b981' },
                  { label: 'Absent',   value: absent,    color: '#ef4444' },
                  { label: 'Rate',     value: `${rate}%`, color: rate >= 75 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444' },
                ].map((m, i) => (
                  <div key={m.label} style={{ padding: '14px', textAlign: 'center', borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' as const }}>{m.label}</p>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Bulk mark bar */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' as const }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {bulkSaving ? '⏳ Saving all…' : 'Mark All:'}
                  </span>
                  {!bulkSaving && (Object.keys(STATUS_CONFIG) as AttStatus[]).map(s => (
                    <button key={s} onClick={() => markAll(s)} style={{
                      padding: '5px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', border: `1.5px solid ${STATUS_CONFIG[s].border}`,
                      background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color,
                    }}>
                      {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
                {/* progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '220px' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${total > 0 ? (marked / total) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#10b981)', transition: 'width 0.3s', borderRadius: '99px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' as const }}>{marked}/{total}</span>
                </div>
              </div>

              {/* Student table */}
              {enrolledStudents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No students are onboarded for this session yet.
                </div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: '430px' }}>
                  <table className="admin-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: '24px', width: '32px' }}>#</th>
                        <th>Child</th>
                        <th>Guardian</th>
                        <th style={{ textAlign: 'center' }}>Attendance</th>
                        <th style={{ width: '56px', textAlign: 'center' }}>Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrolledStudents.map((s, idx) => {
                        const cur     = attendanceMap[s.familyId];
                        const isSaving = savingRow[s.familyId];
                        const rowBg =
                          cur === 'PRESENT' ? 'rgba(16,185,129,0.04)' :
                          cur === 'ABSENT'  ? 'rgba(239,68,68,0.04)'  :
                          cur === 'LATE'    ? 'rgba(245,158,11,0.04)' : '';

                        return (
                          <tr key={s.familyId} style={{ background: rowBg, transition: 'background 0.2s' }}>
                            <td style={{ paddingLeft: '24px', color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.childName}</span>
                                <br />
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{s.familyId}</span>
                              </div>
                            </td>
                            <td><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.guardianName}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                {(Object.keys(STATUS_CONFIG) as AttStatus[]).map(status => {
                                  const cfg    = STATUS_CONFIG[status];
                                  const active = cur === status;
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => !isSaving && handleToggle(s.familyId, s.childName, status)}
                                      disabled={isSaving}
                                      style={{
                                        padding: '4px 11px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        border: `1.5px solid ${active ? cfg.border : 'var(--border)'}`,
                                        background: active ? cfg.bg : 'transparent',
                                        color: active ? cfg.color : 'var(--text-secondary)',
                                        transition: 'all 0.12s',
                                        opacity: isSaving ? 0.5 : 1,
                                      }}
                                    >
                                      {active ? cfg.icon : ''} {cfg.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            {/* Per-row save state */}
                            <td style={{ textAlign: 'center' }}>
                              {isSaving ? (
                                <span style={{ fontSize: '16px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                              ) : cur ? (
                                <span title="Saved to database" style={{ fontSize: '16px' }}>💾</span>
                              ) : (
                                <span title="Not yet marked" style={{ fontSize: '16px', opacity: 0.3 }}>○</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: Session List ── */}
      <div className="admin-table-card" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>📅 Sessions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[{ label: 'FROM', val: fromDate, set: setFromDate }, { label: 'TO', val: toDate, set: setToDate }].map(f => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' as const }}>{f.label}</label>
                <input type="date" value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '12px' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {FILTER_TABS.map(t => (
              <button key={t.id} onClick={() => setFilterStatus(t.id)} style={{
                padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                border: filterStatus === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: filterStatus === t.id ? 'var(--accent)' : 'transparent',
                color: filterStatus === t.id ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayedEvents.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '24px' }}>No sessions found.</p>
          ) : (
            displayedEvents.map(event => {
              const isSelected = selectedEvent?._id === event._id;
              return (
                <div key={event._id} onClick={() => handleSelectEvent(event)} style={{
                  padding: '13px 14px', borderRadius: '10px', cursor: 'pointer',
                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--bg-input)',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${event.sessionType === 'ASC' ? '#f59e0b' : event.sessionType === 'Drama' ? '#8b5cf6' : '#10b981'}`,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{event.eventName}</span>
                    {statusBadge(event._status)}
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    📅 {event.date} · ⏰ {event.startTime}–{event.endTime}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                      {event.sessionType}
                    </span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                      {(event.registeredFamilies || []).length} Enrolled
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAttendance;
