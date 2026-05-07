import React, { useEffect, useState, useCallback } from 'react';
import { getAllEvents, getMyStaffProfile, updateMyStaffProfile, addHoliday, removeHoliday, withdrawFromEvent } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, isFuture, isPast } from 'date-fns';

const SKILLS = ['Youth Work','First Aid','Sports Coaching','Music','Arts & Crafts','Mentoring','Leadership','STEM','Outdoor Education','Drama','Cooking','Photography'];

function durationLabel(hours) {
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function ThankYouDialog({ events, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <div className="modal-title" style={{ fontSize: 22 }}>Thank You!</div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 16 }}>
          You have successfully completed {events.length} event{events.length > 1 ? 's' : ''}. Your dedication makes a real difference to the young people in our community.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {events.map(ev => (
            <div key={ev.id} style={{ background: 'var(--good-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--good)' }}>
              ✓ {ev.eventName}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const [skills, setSkills] = useState(profile.skills || []);
  const [timeAvailable, setTimeAvailable] = useState(profile.timeAvailable || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const AVAIL_OPTIONS = ['MON-FRI 09:00-17:00','MON-FRI 08:00-16:00','MON-WED 10:00-18:00','WED-FRI 09:00-17:00','MON-SUN 09:00-17:00'];
  const toggleSkill = sk => setSkills(s => s.includes(sk) ? s.filter(x => x !== sk) : [...s, sk]);
  const save = async () => {
    setSaving(true); setError('');
    try { await updateMyStaffProfile({ skills, timeAvailable }); onSaved(); }
    catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Edit My Profile</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="form-group">
          <label className="form-label">Availability</label>
          <select className="form-input" value={timeAvailable} onChange={e => setTimeAvailable(e.target.value)}>
            {AVAIL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Skills</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SKILLS.map(sk => (
              <button key={sk} type="button" onClick={() => toggleSkill(sk)} className="badge"
                style={{ cursor: 'pointer', border: 'none', background: skills.includes(sk) ? 'var(--forest)' : 'var(--cream-dark)', color: skills.includes(sk) ? 'white' : 'var(--ink-soft)', padding: '5px 12px', fontSize: 12 }}>
                {sk}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouEvents, setThankYouEvents] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newHoliday, setNewHoliday] = useState('');
  const [withdrawing, setWithdrawing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evR, prR] = await Promise.all([getAllEvents(), getMyStaffProfile()]);
      const mine = evR.data.filter(ev => ev.assignedStaff?.some(s => s.username === user.username) || ev.optionalStaff?.some(s => s.username === user.username));
      setEvents(mine);
      setProfile(prR.data);
      // Show thank-you for newly completed events
      const justCompleted = mine.filter(e => e.status === 'COMPLETED' && isPast(new Date(e.eventTimeEnd)));
      if (justCompleted.length > 0) {
        const key = 'thankyou_shown_' + user.username;
        const shownIds = JSON.parse(localStorage.getItem(key) || '[]');
        const newOnes = justCompleted.filter(e => !shownIds.includes(e.id));
        if (newOnes.length > 0) {
          setThankYouEvents(newOnes);
          setShowThankYou(true);
          localStorage.setItem(key, JSON.stringify([...shownIds, ...newOnes.map(e => e.id)]));
        }
      }
    } finally { setLoading(false); }
  }, [user.username]);

  useEffect(() => { load(); }, [load]);

  const handleAddHoliday = async () => {
    if (!newHoliday) return;
    try { await addHoliday({ holidayDate: newHoliday }); setNewHoliday(''); load(); setMsg('Holiday added'); setTimeout(() => setMsg(''), 3000); }
    catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveHoliday = async (date) => {
    try { await removeHoliday(date); load(); }
    catch (err) { setMsg('Failed to remove'); }
  };

  const handleWithdraw = async (ev) => {
    if (!window.confirm(`Withdraw from "${ev.eventName}"? You have used ${profile?.withdrawalsThisMonth || 0}/3 withdrawals this month.`)) return;
    setWithdrawing(ev.id);
    try {
      await withdrawFromEvent({ eventId: ev.id });
      setMsg('Withdrawn successfully');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Withdrawal failed'); }
    finally { setWithdrawing(null); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const upcoming = events.filter(e => isFuture(new Date(e.eventTimeStart)));
  const past = events.filter(e => isPast(new Date(e.eventTimeEnd)));

  return (
    <>
      {showThankYou && <ThankYouDialog events={thankYouEvents} onClose={() => setShowThankYou(false)} />}
      {showEditProfile && <EditProfileModal profile={profile} onClose={() => setShowEditProfile(false)} onSaved={() => { setShowEditProfile(false); load(); }} />}

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="impact-strip">
        <div><div className="impact-num">{events.length}</div><div className="impact-lbl">Assigned events</div></div>
        <div><div className="impact-num">{upcoming.length}</div><div className="impact-lbl">Upcoming</div></div>
        <div><div className="impact-num">{profile?.weeklyHours?.toFixed(1) || '0'}h</div><div className="impact-lbl">This week</div></div>
        <div><div className="impact-num">{profile?.withdrawalsThisMonth || 0}/3</div><div className="impact-lbl">Withdrawals this month</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Profile</span>
            <button className="btn btn-sm" onClick={() => setShowEditProfile(true)}>Edit</button>
          </div>
          <div style={{ fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}><strong>Name:</strong> {profile?.name}</div>
            <div style={{ marginBottom: 6 }}><strong>Email:</strong> {profile?.email}</div>
            <div style={{ marginBottom: 6 }}><strong>Availability:</strong> {profile?.timeAvailable}</div>
            <div style={{ marginBottom: 6 }}><strong>Support DA:</strong> {profile?.supportDifferentlyAbled ? '♿ Yes' : 'No'}</div>
            <div style={{ marginBottom: 4 }}><strong>Skills:</strong></div>
            <div className="skills-list">{profile?.skills?.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div>
          </div>
        </div>

        {/* Holidays Card */}
        <div className="card">
          <div className="card-header"><span className="card-title">My Holidays</span></div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="date" className="form-input" value={newHoliday} onChange={e => setNewHoliday(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleAddHoliday}>Add</button>
          </div>
          {(!profile?.holidays || profile.holidays.length === 0) ? (
            <div style={{ fontSize: 13, color: 'var(--ink-ghost)' }}>No holidays logged</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {profile.holidays.sort().map(d => (
                <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'var(--cream-dark)', borderRadius: 6, padding: '4px 10px' }}>
                  <span>{format(new Date(d), 'd MMM yyyy')}</span>
                  <button className="btn btn-sm btn-danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleRemoveHoliday(d)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="card">
        <div className="card-header"><span className="card-title">My upcoming events</span></div>
        {upcoming.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No upcoming events</div></div>
        ) : (
          <div className="event-grid">
            {upcoming.map(ev => {
              const isPrimary = ev.assignedStaff?.some(s => s.username === user.username);
              return (
                <div key={ev.id} className="event-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="event-name">{ev.eventName}</div>
                    <span className={`badge ${isPrimary ? 'badge-good' : 'badge-warn'}`}>{isPrimary ? 'Primary' : 'Backup'}</span>
                  </div>
                  {ev.venue && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>📍 {ev.venue}</div>}
                  <div className="event-time">{format(new Date(ev.eventTimeStart), 'd MMM yyyy HH:mm')} → {format(new Date(ev.eventTimeEnd), 'd MMM yyyy HH:mm')}</div>
                  <div className="event-duration" style={{ marginBottom: 8 }}>Duration: {durationLabel(ev.durationHours)}</div>
                  <div className="skills-list" style={{ marginBottom: 8 }}>{ev.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>{ev.registeredStudentCount} student{ev.registeredStudentCount !== 1 ? 's' : ''} registered</div>
                  <button className="btn btn-sm btn-danger" disabled={withdrawing === ev.id} onClick={() => handleWithdraw(ev)} style={{ marginTop: 'auto' }}>
                    {withdrawing === ev.id ? '…' : 'Withdraw'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Past events</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>Venue</th><th>Date</th><th>Duration</th><th>Students</th></tr></thead>
              <tbody>
                {past.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 500 }}>{ev.eventName}</td>
                    <td style={{ fontSize: 12 }}>{ev.venue || '—'}</td>
                    <td>{format(new Date(ev.eventTimeStart), 'd MMM yyyy')}</td>
                    <td>{durationLabel(ev.durationHours)}</td>
                    <td>{ev.registeredStudentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
