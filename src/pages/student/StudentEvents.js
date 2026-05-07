import React, { useEffect, useState, useCallback } from 'react';
import { getAllEventsForStudent, getMyEvents, registerForEvent, unregisterFromEvent } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

function durationLabel(hours) {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function EventCard({ ev, registered, acting, onToggle, studentSkills }) {
  const hasSkillMatch = ev.skills?.some(sk => studentSkills.includes(sk));
  return (
    <div className="event-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div className="event-name">{ev.eventName}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {registered && <span className="badge badge-good">Registered</span>}
          {ev.openForDifferentAbled && <span className="badge badge-info">♿ DA</span>}
        </div>
      </div>
      {ev.venue && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>📍 {ev.venue}</div>}
      <div className="event-time" style={{ marginBottom: 4 }}><strong>Start:</strong> {format(new Date(ev.eventTimeStart), 'd MMM yyyy, HH:mm')}</div>
      <div className="event-time" style={{ marginBottom: 6 }}><strong>End:</strong> {format(new Date(ev.eventTimeEnd), 'd MMM yyyy, HH:mm')}</div>
      <div className="event-duration" style={{ marginBottom: 8 }}>
        Duration: {durationLabel(ev.durationHours)}
        {!hasSkillMatch && <span className="badge badge-warn" style={{ marginLeft: 8, fontSize: 10 }}>New skills on completion</span>}
      </div>
      <div className="skills-list" style={{ marginBottom: 8 }}>{ev.skills.map(sk => <span key={sk} className={`skill-tag${studentSkills.includes(sk) ? ' matched' : ''}`}>{sk}</span>)}</div>
      {ev.assignedStaff?.length > 0 && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>Led by: {ev.assignedStaff.map(s => s.name).join(', ')}</div>}
      <div style={{ fontSize: 12, color: 'var(--ink-ghost)', marginBottom: 12 }}>{ev.registeredStudentCount} student{ev.registeredStudentCount !== 1 ? 's' : ''} registered</div>
      <button className={`btn ${registered ? 'btn-danger' : 'btn-primary'}`} style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }} disabled={acting === ev.id} onClick={() => onToggle(ev.id, registered)}>
        {acting === ev.id ? '…' : registered ? 'Unregister' : 'Register'}
      </button>
    </div>
  );
}

export default function StudentEvents() {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [myEventIds, setMyEventIds] = useState(new Set());
  const [studentSkills, setStudentSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('match'); // 'match' | 'other'

  const load = useCallback(async () => {
    setLoading(true);
    const [all, me] = await Promise.all([getAllEventsForStudent(), getMyEvents()]);
    setAllEvents(all.data);
    setMyEventIds(new Set(me.data.map(e => e.id)));
    // Get skills from local profile or infer from matched events
    const storedProfile = localStorage.getItem('studentProfile');
    if (storedProfile) { try { setStudentSkills(JSON.parse(storedProfile).skills || []); } catch {} }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Also load skills from API
  useEffect(() => {
    import('../../services/api').then(({ getMyStudentProfile }) => {
      getMyStudentProfile().then(r => {
        setStudentSkills(r.data.skills || []);
        localStorage.setItem('studentProfile', JSON.stringify(r.data));
      }).catch(() => {});
    });
  }, []);

  const toggle = async (eventId, isRegistered) => {
    setActing(eventId);
    try {
      if (isRegistered) { await unregisterFromEvent(eventId); setMsg('Unregistered successfully'); }
      else { await registerForEvent(eventId); setMsg('Registered! Check My Registrations.'); }
      await load();
    } catch (err) { setMsg(err.response?.data?.message || 'Action failed'); }
    finally { setActing(null); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const notRegistered = allEvents.filter(e => !myEventIds.has(e.id));
  const matchEvents = notRegistered.filter(e => e.skills?.some(sk => studentSkills.includes(sk)));
  const otherEvents = notRegistered.filter(e => !e.skills?.some(sk => studentSkills.includes(sk)));
  const show = tab === 'match' ? matchEvents : otherEvents;

  return (
    <>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Browse Events</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn btn-sm ${tab === 'match' ? 'btn-primary' : ''}`} onClick={() => setTab('match')}>
            🌟 Events you may like ({matchEvents.length})
          </button>
          <button className={`btn btn-sm ${tab === 'other' ? 'btn-primary' : ''}`} onClick={() => setTab('other')}>
            🗂 Other events ({otherEvents.length})
          </button>
        </div>
        {tab === 'other' && (
          <div style={{ background: 'var(--info-bg)', color: 'var(--info)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            💡 Registering for these events and completing them will automatically add their skills to your profile!
          </div>
        )}
        {show.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{tab === 'match' ? '🌟' : '🗂'}</div>
            <div className="empty-title">{tab === 'match' ? 'No matching events right now' : 'No other events available'}</div>
          </div>
        ) : (
          <div className="event-grid">
            {show.map(ev => (
              <EventCard key={ev.id} ev={ev} registered={myEventIds.has(ev.id)} acting={acting} onToggle={toggle} studentSkills={studentSkills} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
