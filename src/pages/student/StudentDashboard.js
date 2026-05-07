import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyEvents, getAvailableEvents, getAllEventsForStudent, getMyStudentProfile, dismissCertificateBanner } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

function durationLabel(hours) {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, all, pr] = await Promise.all([getMyEvents(), getAllEventsForStudent(), getMyStudentProfile()]);
      setMyEvents(me.data);
      setAllEvents(all.data);
      setProfile(pr.data);
      setShowBanner(pr.data.showCertificateBanner);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismissBanner = async () => {
    setShowBanner(false);
    try { await dismissCertificateBanner(); } catch {}
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const studentSkills = profile?.skills || [];
  const myEventIds = new Set(myEvents.map(e => e.id));
  const matchEvents = allEvents.filter(e => !myEventIds.has(e.id) && e.skills?.some(sk => studentSkills.includes(sk)));
  const otherEvents = allEvents.filter(e => !myEventIds.has(e.id) && !e.skills?.some(sk => studentSkills.includes(sk)));

  return (
    <>
      {showBanner && (
        <div style={{ background: 'linear-gradient(135deg, var(--forest), var(--good))', color: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>🎓 Congrats!! Check your certificate</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>You've completed an event — your certificate is ready to view!</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ background: 'white', color: 'var(--forest)', fontWeight: 600 }} onClick={() => navigate('/student/certificates')}>View Certificate</button>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }} onClick={dismissBanner}>×</button>
          </div>
        </div>
      )}

      <div className="impact-strip">
        <div><div className="impact-num">{myEvents.length}</div><div className="impact-lbl">My registrations</div></div>
        <div><div className="impact-num">{matchEvents.length}</div><div className="impact-lbl">Events you may like</div></div>
        <div><div className="impact-num">{profile?.completedEventIds?.length || 0}</div><div className="impact-lbl">Completed</div></div>
        <div><div className="impact-num">{myEvents.reduce((a, e) => a + e.durationHours, 0).toFixed(0)}h</div><div className="impact-lbl">Total hours</div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">My upcoming events</span>
            <button className="btn btn-sm" onClick={() => navigate('/student/my-events')}>View all</button>
          </div>
          {myEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem 0' }}>
              <div className="empty-icon">📚</div>
              <div className="empty-title">No registrations yet</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/student/events')}>Browse events</button>
            </div>
          ) : myEvents.slice(0, 4).map(ev => (
            <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--cream-dark)' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.eventName}</div>
              {ev.venue && <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>📍 {ev.venue}</div>}
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                {format(new Date(ev.eventTimeStart), 'd MMM yyyy HH:mm')} · {durationLabel(ev.durationHours)}
              </div>
              <div className="skills-list" style={{ marginTop: 4 }}>{ev.skills.map(sk => <span key={sk} className="skill-tag" style={{ fontSize: 10 }}>{sk}</span>)}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🌟 Events you may like</span>
            <button className="btn btn-sm" onClick={() => navigate('/student/events')}>Browse all</button>
          </div>
          {matchEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem 0' }}>
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No matching events right now</div>
            </div>
          ) : matchEvents.slice(0, 3).map(ev => (
            <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--cream-dark)' }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{ev.eventName}</div>
              {ev.venue && <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>📍 {ev.venue}</div>}
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{format(new Date(ev.eventTimeStart), 'd MMM yyyy HH:mm')} · {durationLabel(ev.durationHours)}</div>
              <div className="skills-list" style={{ marginTop: 4 }}>{ev.skills.map(sk => <span key={sk} className="skill-tag" style={{ fontSize: 10 }}>{sk}</span>)}</div>
            </div>
          ))}
          {matchEvents.length > 3 && <button className="btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => navigate('/student/events')}>See all {matchEvents.length} →</button>}
        </div>
      </div>

      {otherEvents.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🗂 Other events</span>
            <span style={{ fontSize: 12, color: 'var(--ink-ghost)' }}>Skills from these will be added to your profile after completion</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
            {otherEvents.slice(0, 6).map(ev => (
              <div key={ev.id} style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{ev.eventName}</div>
                {ev.venue && <div style={{ fontSize: 11, color: 'var(--ink-ghost)', marginBottom: 4 }}>📍 {ev.venue}</div>}
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>{format(new Date(ev.eventTimeStart), 'd MMM yyyy')}</div>
                <div className="skills-list">{ev.skills.map(sk => <span key={sk} className="skill-tag" style={{ fontSize: 10 }}>{sk}</span>)}</div>
              </div>
            ))}
          </div>
          {otherEvents.length > 6 && <button className="btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => navigate('/student/events')}>See all {otherEvents.length} other events →</button>}
        </div>
      )}
    </>
  );
}
