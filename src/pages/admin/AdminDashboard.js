import React, { useEffect, useState } from 'react';
import { getAllEvents, getAllStaff, getAllStudents } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getAllEvents(), getAllStaff(), getAllStudents()])
      .then(([ev, st, su]) => { setEvents(ev.data); setStaff(st.data); setStudents(su.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const upcoming = events.filter(e => e.status === 'UPCOMING');
  const completed = events.filter(e => e.status === 'COMPLETED');
  const totalStudents = events.reduce((a, e) => a + e.registeredStudentCount, 0);
  const weekHours = staff.reduce((a, s) => a + (s.weeklyHours || 0), 0);

  return (
    <>
      <div className="metric-row">
        <div className="metric-card"><div className="m-label">Total events</div><div className="m-value">{events.length}</div></div>
        <div className="metric-card"><div className="m-label">Upcoming</div><div className="m-value">{upcoming.length}</div></div>
        <div className="metric-card"><div className="m-label">Completed</div><div className="m-value">{completed.length}</div></div>
        <div className="metric-card"><div className="m-label">Total staff</div><div className="m-value">{staff.length}</div></div>
        <div className="metric-card"><div className="m-label">Students</div><div className="m-value">{students.length}</div></div>
        <div className="metric-card"><div className="m-label">Staff hrs/week</div><div className="m-value">{weekHours.toFixed(0)}h</div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming events</span>
            <button className="btn btn-sm" onClick={() => navigate('/admin/events')}>Manage</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem 0' }}>
              <div className="empty-icon">📅</div>
              <div className="empty-title">No upcoming events</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/admin/events')}>Create event</button>
            </div>
          ) : upcoming.slice(0, 5).map(ev => (
            <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--cream-dark)' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.eventName}</div>
              {ev.venue && <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>📍 {ev.venue}</div>}
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                {format(new Date(ev.eventTimeStart), 'd MMM yyyy, HH:mm')}
                {' · '}{ev.registeredStudentCount} student{ev.registeredStudentCount !== 1 ? 's' : ''}
                {ev.openForDifferentAbled && <span className="badge badge-info" style={{ marginLeft: 6, fontSize: 10 }}>♿</span>}
              </div>
              <div className="skills-list" style={{ marginTop: 4 }}>
                {ev.skills.map(sk => <span key={sk} className="skill-tag" style={{ fontSize: 10 }}>{sk}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Staff overview</span>
            <button className="btn btn-sm" onClick={() => navigate('/admin/staff')}>Manage</button>
          </div>
          {staff.slice(0, 6).map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--cream-dark)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar" style={{ background: 'var(--good-bg)', color: 'var(--good)', width: 28, height: 28, fontSize: 10 }}>
                  {s.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>{s.timeAvailable}{s.supportDifferentlyAbled ? ' · ♿' : ''}</div>
                </div>
              </div>
              <span style={{ fontWeight: 500, fontSize: 13, color: s.weeklyHours > 30 ? 'var(--danger)' : s.weeklyHours > 20 ? 'var(--warn)' : 'var(--good)' }}>
                {s.weeklyHours?.toFixed(1) || '0'}h
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
