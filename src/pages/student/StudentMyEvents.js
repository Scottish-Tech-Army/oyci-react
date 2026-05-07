import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyEvents, unregisterFromEvent, submitFeedback, getMyStudentProfile } from '../../services/api';
import { format, isFuture, isPast } from 'date-fns';

function durationLabel(hours) {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function FeedbackModal({ event, studentId, onClose, onSaved }) {
  const [form, setForm] = useState({ staffRating: 5, eventRating: 5, staffComment: '', eventComment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try { await submitFeedback(event.id, form); onSaved(); }
    catch (err) { setError(err.response?.data?.message || 'Submit failed'); }
    finally { setSaving(false); }
  };

  const StarRating = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: n <= value ? '#f59e0b' : 'var(--cream-dark)', padding: 0 }}>★</button>
      ))}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Feedback — {event.eventName}</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="form-group">
          <label className="form-label">Staff rating</label>
          <StarRating value={form.staffRating} onChange={v => setForm(f => ({ ...f, staffRating: v }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Comment on staff</label>
          <textarea className="form-input" rows={2} value={form.staffComment} onChange={e => setForm(f => ({ ...f, staffComment: e.target.value }))} placeholder="How was the staff support?" style={{ resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Event rating</label>
          <StarRating value={form.eventRating} onChange={v => setForm(f => ({ ...f, eventRating: v }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Comment on event</label>
          <textarea className="form-input" rows={2} value={form.eventComment} onChange={e => setForm(f => ({ ...f, eventComment: e.target.value }))} placeholder="How was the event overall?" style={{ resize: 'vertical' }} />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Submitting…' : 'Submit feedback'}</button>
        </div>
      </div>
    </div>
  );
}

export default function StudentMyEvents() {
  const [events, setEvents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unregistering, setUnregistering] = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, pr] = await Promise.all([getMyEvents(), getMyStudentProfile()]);
    setEvents(ev.data);
    setProfile(pr.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unregister = async (id) => {
    if (!window.confirm('Unregister from this event?')) return;
    setUnregistering(id);
    try { await unregisterFromEvent(id); load(); } finally { setUnregistering(null); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const upcoming = events.filter(e => isFuture(new Date(e.eventTimeStart)));
  const past = events.filter(e => isPast(new Date(e.eventTimeEnd)));
  const totalHours = events.reduce((a, e) => a + e.durationHours, 0);

  return (
    <>
      {feedbackTarget && (
        <FeedbackModal event={feedbackTarget} studentId={profile?.id}
          onClose={() => setFeedbackTarget(null)}
          onSaved={() => { setFeedbackTarget(null); load(); }} />
      )}

      <div className="metric-row">
        <div className="metric-card"><div className="m-label">Total registrations</div><div className="m-value">{events.length}</div></div>
        <div className="metric-card"><div className="m-label">Upcoming</div><div className="m-value">{upcoming.length}</div></div>
        <div className="metric-card"><div className="m-label">Completed</div><div className="m-value">{past.length}</div></div>
        <div className="metric-card"><div className="m-label">Total hours</div><div className="m-value">{totalHours.toFixed(0)}h</div></div>
      </div>

      {upcoming.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Upcoming registrations</span></div>
          <div className="event-grid">
            {upcoming.map(ev => (
              <div key={ev.id} className="event-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div className="event-name">{ev.eventName}</div>
                  <span className="badge badge-good">Upcoming</span>
                </div>
                {ev.venue && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>📍 {ev.venue}</div>}
                <div className="event-time">{format(new Date(ev.eventTimeStart), 'd MMM yyyy, HH:mm')}</div>
                <div className="event-time">→ {format(new Date(ev.eventTimeEnd), 'd MMM yyyy, HH:mm')}</div>
                <div className="event-duration" style={{ margin: '8px 0 10px' }}>{durationLabel(ev.durationHours)}</div>
                <div className="skills-list" style={{ marginBottom: 10 }}>{ev.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div>
                {ev.assignedStaff?.length > 0 && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>Led by: {ev.assignedStaff.map(s => s.name).join(', ')}</div>}
                <button className="btn btn-danger btn-sm" disabled={unregistering === ev.id} onClick={() => unregister(ev.id)} style={{ marginTop: 'auto' }}>
                  {unregistering === ev.id ? '…' : 'Unregister'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Past events</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>Venue</th><th>Date</th><th>Duration</th><th>Skills</th><th>Feedback</th></tr></thead>
              <tbody>
                {past.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 500 }}>{ev.eventName}</td>
                    <td style={{ fontSize: 12 }}>{ev.venue || '—'}</td>
                    <td>{format(new Date(ev.eventTimeStart), 'd MMM yyyy')}</td>
                    <td>{durationLabel(ev.durationHours)}</td>
                    <td><div className="skills-list">{ev.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div></td>
                    <td>
                      {ev.feedbackGiven
                        ? <span style={{ fontSize: 12, color: 'var(--good)' }}>✓ Submitted</span>
                        : <button className="btn btn-sm btn-primary" onClick={() => setFeedbackTarget(ev)}>Give feedback</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No registrations yet</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/student/events')}>Browse events</button>
          </div>
        </div>
      )}
    </>
  );
}
