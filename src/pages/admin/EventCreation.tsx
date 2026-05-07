import { useState, useEffect } from 'react';
import API from '../../services/api';
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


// ── Fulfilment helpers ────────────────────────────────────────────────────────
const getAssignedCount = (e: any): number =>
  Array.isArray(e.assignedStaff) ? e.assignedStaff.length : 0;

const getTotalRequired = (e: any): number =>
  (e.requiredYouthWorkers || 0) + (e.requiredSessionSupport || 0);

const isFullyFulfilled = (e: any): boolean =>
  getAssignedCount(e) >= getTotalRequired(e);

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

// ─────────────────────────────────────────────────────────────────────────────

const EventCreation = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [form, setForm] = useState<EventForm>({
    eventName: '',
    location: '',
    sessionType: 'General',
    sessionTime: 'AFTERNOON_TO_EVENING',
    date: '',
    startTime: '',
    endTime: '',
    requiredYouthWorkers: 2,
    requiredSessionSupport: 0,
  });
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const todayISO = new Date().toISOString().split('T')[0];

  const fetchEvents = async () => {
    try {
      const { data } = await API.get('/events');
      setEvents(data);
      setSelectedEvent((prev: any) => {
        if (prev) {
          const updated = data.find((e: any) => e._id === prev._id);
          return updated || data[0] || null;
        }
        return data.length > 0 ? data[0] : null;
      });
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setApiError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.eventName || !form.location || !form.sessionType || !form.date || !form.startTime || !form.endTime) {
      setApiError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEventId) {
        await API.put(`/events/${editingEventId}`, form);
        setSuccessMsg('Session updated successfully!');
        setEditingEventId(null);
        setSelectedEvent(null);
      } else {
        await API.post('/events', form);
        setSuccessMsg('Session Instance created successfully!');
      }
      setForm({
        eventName: '',
        location: '',
        sessionType: 'General',
        sessionTime: 'AFTERNOON_TO_EVENING',
        date: '',
        startTime: '',
        endTime: '',
        requiredYouthWorkers: 2,
        requiredSessionSupport: 1,
      });
      setIsModalOpen(false);
      fetchEvents();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message || 'Failed to save event.');
      } else {
        setApiError('Failed to save event.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (ev: any) => {
    setEditingEventId(ev._id);
    setSelectedEvent(null);
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
    setApiError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (evId: string, evName: string, assignedStaff?: any[]) => {
    const hasStaff = Array.isArray(assignedStaff) && assignedStaff.length > 0;
    const msg = hasStaff
      ? `"${evName}" has ${assignedStaff!.length} staff assigned. Are you sure you want to delete it?`
      : `Delete "${evName}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await API.delete(`/events/${evId}`);
      if (selectedEvent?._id === evId) setSelectedEvent(null);
      if (editingEventId === evId) { setEditingEventId(null); setForm({ eventName: '', location: '', sessionType: 'General', sessionTime: 'AFTERNOON_TO_EVENING', date: '', startTime: '', endTime: '', requiredYouthWorkers: 2, requiredSessionSupport: 1 }); }
      fetchEvents();
    } catch {
      alert('Failed to delete event.');
    }
  };

  const handleToggleStatus = async (ev: any, evName: string) => {
    const newStatus = !ev.isManuallyCompleted;
    if (!window.confirm(`${newStatus ? 'End' : 'Re-open'} "${evName}" manually?`)) return;
    try {
      await API.put(`/events/${ev._id}`, { isManuallyCompleted: newStatus });
      fetchEvents();
      if (selectedEvent?._id === ev._id) {
        setSelectedEvent({ ...selectedEvent, isManuallyCompleted: newStatus });
      }
    } catch {
      alert('Failed to change event status.');
    }
  };

  // ── Sidebar event counts ───────────────────────────────────────────────────
  const fulfilledCount  = events.filter(e => isFullyFulfilled(e)).length;
  const pendingCount    = events.length - fulfilledCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontSize: '22px' }}>Session Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Create and manage daily sessions and activities.</p>
        </div>
          <button 
          onClick={() => { setEditingEventId(null); setForm({ eventName: '', location: '', sessionType: 'General', sessionTime: 'AFTERNOON_TO_EVENING', date: '', startTime: '', endTime: '', requiredYouthWorkers: 2, requiredSessionSupport: 1 }); setApiError(''); setSuccessMsg(''); setIsModalOpen(true); }} 
          className="btn-primary" 
          style={{ width: 'auto', padding: '10px 20px', margin: 0, height: 'fit-content' }}>
          + Create Session
        </button>
      </div>

      {events.length === 0 && !loading ? (
        <div className="admin-table-card" style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '40px auto 0', maxWidth: '600px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📅</div>
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No Sessions Scheduled</h3>
          <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 0 24px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            No session has been scheduled. Kindly click on the Create Session button to add a session.
          </p>
          <button 
            onClick={() => { setEditingEventId(null); setForm({ eventName: '', location: '', sessionType: 'General', sessionTime: 'AFTERNOON_TO_EVENING', date: '', startTime: '', endTime: '', requiredYouthWorkers: 2, requiredSessionSupport: 1 }); setApiError(''); setSuccessMsg(''); setIsModalOpen(true); }} 
            className="btn-primary" 
            style={{ width: 'auto', padding: '10px 24px', margin: 0 }}>
            + Create Session
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* ── LEFT SIDEBAR: Event Status Overview ────────────────────────────── */}
          <div style={{
            width: '420px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Summary Pills */}
            <div className="admin-table-card" style={{ padding: '20px' }}>
              <h3 className="section-title" style={{ marginBottom: '16px', fontSize: '15px' }}>
                📅 Session Status Overview
              </h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center'
                }}>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#22c55e' }}>{fulfilledCount}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>FULFILLED</p>
                </div>
                <div style={{
                  flex: 1, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center'
                }}>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#eab308' }}>{pendingCount}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>NEEDS STAFF</p>
                </div>
              </div>
            </div>

            {/* Event Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Loading sessions...
                </div>
              ) : (
                events.map((e) => {
                  const fulfilled = isFullyFulfilled(e);
                  const assignedCount = getAssignedCount(e);
                  const requiredCount = getTotalRequired(e);
                  const isSelected = selectedEvent?._id === e._id;
                  const eStatus = getEventStatus(e);

                  return (
                    <div
                      key={e._id}
                      onClick={() => setSelectedEvent(isSelected ? null : e)}
                      style={{
                        background: isSelected ? 'rgba(99,102,241,0.07)' : 'var(--bg-card)',
                        border: `2px solid ${isSelected ? 'var(--accent)' : editingEventId === e._id ? 'rgba(99,102,241,0.6)' : fulfilled ? 'rgba(34,197,94,0.4)' : 'rgba(234,179,8,0.3)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                      }}
                    >
                      {/* Status stripe */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                        background: editingEventId === e._id ? 'var(--accent)' : fulfilled ? '#22c55e' : '#eab308',
                      }} />

                      <div style={{ paddingLeft: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, paddingRight: '8px' }}>
                            {e.eventName}
                            {editingEventId === e._id && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>EDITING</span>}
                          </p>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: eStatus === 'COMPLETED' ? 'rgba(100,100,100,0.1)' : eStatus === 'ONGOING' ? 'rgba(14,165,233,0.1)' : 'rgba(156,163,175,0.1)', color: eStatus === 'COMPLETED' ? '#6b7280' : eStatus === 'ONGOING' ? '#0284c7' : '#9ca3af' }}>
                            {eStatus === 'COMPLETED' ? 'COMPLETED' : eStatus === 'ONGOING' ? 'ONGOING' : 'UPCOMING'}
                          </span>
                        </div>

                        {/* Worker Requirements */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                            👤 {e.requiredYouthWorkers || 0} Youth Workers
                          </span>
                          <span style={{ fontSize: '10px', background: 'rgba(234,179,8,0.1)', color: '#ca8a04', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                            🤝 {e.requiredSessionSupport || 0} Support
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: fulfilled ? '#16a34a' : '#ca8a04' }}>
                              {assignedCount}/{requiredCount}
                            </span>
                          </div>
                          <div style={{ height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, (assignedCount / (requiredCount || 1)) * 100)}%`,
                              background: fulfilled ? '#22c55e' : '#eab308',
                              borderRadius: '99px',
                            }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {e.location} · {e.date} · {e.startTime}–{e.endTime}
                          </p>
                          {/* Edit / Delete / Toggle actions */}
                          <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }} onClick={ev => ev.stopPropagation()}>
                            {e.isManuallyCompleted ? (
                              <button
                                onClick={() => handleToggleStatus(e, e.eventName)}
                                style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.08)', color: '#16a34a', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                🔄
                              </button>
                            ) : eStatus !== 'COMPLETED' && (
                              <button
                                onClick={() => handleToggleStatus(e, e.eventName)}
                                style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                ⏹
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(e)}
                              style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--accent)', background: editingEventId === e._id ? 'var(--accent)' : 'rgba(99,102,241,0.07)', color: editingEventId === e._id ? '#fff' : 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(e._id, e.eventName, e.assignedStaff)}
                              style={{ fontSize: '13px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              &#x2715;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
          <div className="event-creation" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            {selectedEvent ? (() => {
              const e = selectedEvent;
              const assignedCount = getAssignedCount(e);
              const requiredCount = getTotalRequired(e);
              const fulfilled = getAssignedCount(e) >= requiredCount;
              const eStatus = getEventStatus(e);

              return (
                <div className="admin-table-card" style={{
                  border: `1px solid ${fulfilled ? 'rgba(34,197,94,0.4)' : 'var(--accent)'}`,
                  background: fulfilled ? 'rgba(34,197,94,0.03)' : 'rgba(99,102,241,0.03)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h3 className="section-title" style={{ marginBottom: 0 }}>{e.eventName}</h3>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '99px',
                          background: fulfilled ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                          color: fulfilled ? '#16a34a' : '#ca8a04'
                        }}>
                          {fulfilled ? '✓ Fully Staffed' : '⚠ Needs Staff'}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '99px',
                          background: eStatus === 'COMPLETED' ? 'rgba(100,100,100,0.1)' : eStatus === 'ONGOING' ? 'rgba(14,165,233,0.1)' : 'rgba(156,163,175,0.1)',
                          color: eStatus === 'COMPLETED' ? '#6b7280' : eStatus === 'ONGOING' ? '#0284c7' : '#9ca3af'
                        }}>
                          {eStatus === 'COMPLETED' ? '🏁 Completed' : eStatus === 'ONGOING' ? '▶️ Ongoing' : '⏳ Yet to Start'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        📍 {e.location} · {e.date} ({e.startTime} - {e.endTime})
                      </p>
                    </div>
                    <button onClick={() => setSelectedEvent(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>SESSION TYPE</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{e.sessionType}</p>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>STAFFING REQUIREMENT</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {assignedCount} / {requiredCount} Assigned
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ROLES NEEDED</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '12px', background: 'var(--bg-input)', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        Youth Workers: <strong>{e.requiredYouthWorkers}</strong>
                      </span>
                      <span style={{ fontSize: '12px', background: 'var(--bg-input)', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        Session Support: <strong>{e.requiredSessionSupport}</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ASSIGNED STAFF</p>
                    {Array.isArray(e.assignedStaff) && e.assignedStaff.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {e.assignedStaff.map((staff: any) => {
                          const id = typeof staff === 'string' ? staff : staff._id;
                          const name = typeof staff === 'string' ? staff : `${staff.firstName} ${staff.lastName}`;
                          const role = typeof staff === 'object' && staff.roleType ? staff.roleType : null;
                          const email = typeof staff === 'object' && staff.emailId ? staff.emailId : null;
                          const phone = typeof staff === 'object' && staff.phoneNumber ? staff.phoneNumber : null;
                          return (
                            <div key={id} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>👤 {name}</span>
                              {role && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '2px 7px', borderRadius: '4px', alignSelf: 'flex-start' }}>{role}</span>}
                              {(email || phone) && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 8px', marginTop: '2px', alignItems: 'center' }}>
                                  {email && (<>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>✉️</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                                  </>)}
                                  {phone && (<>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>📞</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{phone}</span>
                                  </>)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No staff assigned yet — use the Assignment Engine in Staff Management.</p>
                    )}
                  </div>

                  {/* Edit / Delete / Toggle actions */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    {e.isManuallyCompleted ? (
                      <button
                        onClick={() => handleToggleStatus(e, e.eventName)}
                        style={{ flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.07)', color: '#16a34a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🔄 Re-open Session
                      </button>
                    ) : eStatus !== 'COMPLETED' && (
                      <button
                        onClick={() => handleToggleStatus(e, e.eventName)}
                        style={{ flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⏹ End Session
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(e)}
                      style={{ flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✏️ Edit Session
                    </button>
                    <button
                      onClick={() => handleDelete(e._id, e.eventName, e.assignedStaff)}
                      style={{ flex: 1, padding: '9px 0', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.5)', background: 'transparent', color: '#ef4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🗑 Delete Session
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="admin-table-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>👆</div>
                <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Select a Session</h3>
                <p style={{ fontSize: '14px', maxWidth: '300px' }}>Click any session card on the left to view its staffing and configuration details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation/Edit Form Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <h3 className="section-title" style={{ margin: 0, fontSize: '18px' }}>
                  {editingEventId ? '✏️ Edit Session Details' : 'Schedule New Session'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#ef4444', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontWeight: 700 }}>✕</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <p className="read-only-text" style={{ margin: '0 0 24px 0' }}>
                Sessions represent single day occurrences of programs. Staff are assigned on a per-session basis to account for varying daily availability.
              </p>

              {apiError && <div className="alert alert-error">⚠️ {apiError}</div>}
              {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="eventName">Session Title <span className="required">*</span></label>
                    <input id="eventName" name="eventName" type="text" className="form-input"
                      value={form.eventName} onChange={handleChange} placeholder="e.g. Wednesday ASC Group" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="location">Location <span className="required">*</span></label>
                    <input id="location" name="location" type="text" className="form-input"
                      value={form.location} onChange={handleChange} placeholder="e.g. Main Hall" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Session Type <span className="required">*</span></label>
                    <select name="sessionType" className="form-input" value={form.sessionType} onChange={handleChange}>
                      {SESSION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="date">Session Date <span className="required">*</span></label>
                    <input id="date" name="date" type="date" min={todayISO} className="form-input"
                      value={form.date} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label className="form-label" htmlFor="startTime">Start T. <span className="required">*</span></label>
                      <input id="startTime" name="startTime" type="time" className="form-input" value={form.startTime} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="endTime">End T. <span className="required">*</span></label>
                      <input id="endTime" name="endTime" type="time" className="form-input" value={form.endTime} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="requiredYouthWorkers">Required Youth Workers <span className="required">*</span></label>
                    <input id="requiredYouthWorkers" name="requiredYouthWorkers" type="number" 
                      min={form.sessionType === 'ASC' ? 2 : 2} 
                      className="form-input"
                      value={form.requiredYouthWorkers} onChange={handleChange} />
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Minimum: {form.sessionType === 'ASC' ? '2 (ASC req. 3 total staff)' : '2'}
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="requiredSessionSupport">Required Session Support <span className="required">*</span></label>
                    <input id="requiredSessionSupport" name="requiredSessionSupport" type="number" 
                      min="1" 
                      className="form-input"
                      value={form.requiredSessionSupport} onChange={handleChange} />
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Minimum: 1
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ margin: 0, width: 'auto', padding: '10px 24px' }}>
                    {isSubmitting ? (editingEventId ? 'Updating...' : 'Scheduling...') : (editingEventId ? '💾 Update Session' : 'Schedule Session')}
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

export default EventCreation;
