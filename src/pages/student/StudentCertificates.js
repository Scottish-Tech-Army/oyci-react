import React, { useEffect, useState, useCallback } from 'react';
import { getMyStudentProfile, getMyEvents, getAllEvents } from '../../services/api';
import { format } from 'date-fns';

export default function StudentCertificates() {
  const [profile, setProfile] = useState(null);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, myEv] = await Promise.all([getMyStudentProfile(), getMyEvents()]);
      setProfile(pr.data);
      const completed = myEv.data.filter(e => e.status === 'COMPLETED');
      setCompletedEvents(completed);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const printCert = (ev) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Certificate - ${ev.eventName}</title>
      <style>
        body { font-family: Georgia, serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f0e8; }
        .cert { background: white; width: 700px; padding: 60px; text-align: center; border: 6px double #2d6a4f; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
        .org { font-size: 13px; letter-spacing: 3px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
        .title { font-size: 38px; color: #2d6a4f; margin-bottom: 16px; font-style: italic; }
        .presented { font-size: 14px; color: #888; margin-bottom: 8px; }
        .name { font-size: 28px; font-weight: bold; color: #1a3d2b; border-bottom: 2px solid #2d6a4f; display: inline-block; padding-bottom: 4px; margin-bottom: 16px; }
        .body { font-size: 15px; color: #555; margin-bottom: 24px; line-height: 1.6; }
        .event-name { font-size: 20px; font-weight: bold; color: #2d6a4f; }
        .date { font-size: 13px; color: #888; margin-top: 32px; }
        .skills { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
        .skill { background: #e8f5e9; color: #2d6a4f; border-radius: 20px; padding: 4px 14px; font-size: 12px; }
        .seal { font-size: 48px; margin-top: 24px; }
      </style></head><body>
      <div class="cert">
        <div class="org">Ochil Youths Community Initiative</div>
        <div class="title">Certificate of Participation</div>
        <div class="presented">This is to certify that</div>
        <div class="name">${profile?.name || profile?.username}</div>
        <div class="body">has successfully participated in the event</div>
        <div class="event-name">${ev.eventName}</div>
        ${ev.venue ? `<div style="font-size:13px;color:#888;margin-top:6px">📍 ${ev.venue}</div>` : ''}
        <div class="body" style="margin-top:12px">
          held on ${format(new Date(ev.eventTimeStart), 'd MMMM yyyy')}
          · Duration: ${ev.durationHours.toFixed(1)} hours
        </div>
        <div class="skills">${ev.skills.map(sk => `<span class="skill">${sk}</span>`).join('')}</div>
        <div class="seal">🏅</div>
        <div class="date">Issued by OYCI · ${format(new Date(), 'd MMMM yyyy')}</div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="metric-row">
        <div className="metric-card"><div className="m-label">Certificates earned</div><div className="m-value">{completedEvents.length}</div></div>
        <div className="metric-card"><div className="m-label">Total hours</div><div className="m-value">{completedEvents.reduce((a, e) => a + e.durationHours, 0).toFixed(0)}h</div></div>
        <div className="metric-card">
          <div className="m-label">Skills gained</div>
          <div className="m-value">{[...new Set(completedEvents.flatMap(e => e.skills))].length}</div>
        </div>
      </div>

      {completedEvents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🎓</div>
            <div className="empty-title">No certificates yet</div>
            <div style={{ fontSize: 13, color: 'var(--ink-ghost)', marginTop: 6 }}>Complete an event to earn your first certificate!</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {completedEvents.map(ev => (
            <div key={ev.id} style={{ background: 'white', border: '3px double var(--forest)', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏅</div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--ink-ghost)', textTransform: 'uppercase', marginBottom: 8 }}>Certificate of Participation</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--forest)', marginBottom: 4 }}>{ev.eventName}</div>
              {ev.venue && <div style={{ fontSize: 12, color: 'var(--ink-ghost)', marginBottom: 8 }}>📍 {ev.venue}</div>}
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
                {format(new Date(ev.eventTimeStart), 'd MMM yyyy')} · {ev.durationHours.toFixed(1)}h
              </div>
              <div className="skills-list" style={{ justifyContent: 'center', marginBottom: 16 }}>
                {ev.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => printCert(ev)}>
                🖨️ Print / Download
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
