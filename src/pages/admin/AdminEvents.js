import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  getAllEvents, createEvent, updateEvent, deleteEvent,
  getEligibleStaff, getEligibleStaffPreview, assignStaff, duplicateEvent
} from '../../services/api';

const SKILLS = [
  'Youth Work','First Aid','Sports Coaching','Music','Arts & Crafts',
  'Mentoring','Leadership','STEM','Outdoor Education','Drama','Cooking','Photography'
];
const EMPTY_FORM = { eventName:'', venue:'', eventTimeStart:'', eventTimeEnd:'', skills:[], openForDifferentAbled:false, assignedStaffIds:[], optionalStaffIds:[] };

function fmt(dt) { return dt ? format(new Date(dt), 'd MMM yyyy HH:mm') : '—'; }
function durationLabel(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)} days`;
}
function statusClass(ev) {
  if (ev.status === 'CANCELLED') return 'badge-danger';
  if (ev.status === 'COMPLETED') return 'badge-neutral';
  if (ev.status === 'ONGOING') return 'badge-warn';
  return 'badge-good';
}
function matchColor(pct) {
  if (pct >= 80) return 'var(--good)';
  if (pct >= 60) return 'var(--warn)';
  return 'var(--danger)';
}
function nowISOLocal() {
  const d = new Date(); d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function StaffPicker({ eligible, loading, selectedIds, onChange, label }) {
  if (loading) return <div style={{ fontSize: 13, color: 'var(--ink-ghost)' }}>Loading staff…</div>;
  if (!eligible || eligible.length === 0) return <div style={{ fontSize: 13, color: 'var(--ink-ghost)' }}>No eligible staff found (need ≥60% skill match and availability 1hr either side of event)</div>;
  return (
    <div className="staff-picker">
      {eligible.map(s => {
        const selected = selectedIds.includes(s.id);
        const hoursColor = s.weeklyHours > 30 ? 'var(--danger)' : s.weeklyHours > 20 ? 'var(--warn)' : 'var(--good)';
        return (
          <div key={s.id} className={`staff-pick-item${selected ? ' selected' : ''}`}
            onClick={() => onChange(selected ? selectedIds.filter(id => id !== s.id) : [...selectedIds, s.id])}>
            <div className="staff-pick-left">
              <div className="avatar" style={{ background: 'var(--info-bg)', color: 'var(--info)', width: 32, height: 32, fontSize: 11 }}>
                {s.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-ghost)' }}>{s.timeAvailable}</div>
                <div className="skills-list" style={{ marginTop: 3 }}>
                  {s.skills.map(sk => <span key={sk} className="skill-tag" style={{ fontSize: 10, padding: '1px 7px' }}>{sk}</span>)}
                </div>
                {s.supportDifferentlyAbled && <div style={{ fontSize: 10, color: 'var(--info)', marginTop: 2 }}>♿ Supports differently abled</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: matchColor(s.skillsMatchPercent || 0) }}>{(s.skillsMatchPercent || 0).toFixed(0)}%</div>
              <div style={{ fontSize: 10, color: 'var(--ink-ghost)' }}>skill match</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: hoursColor, marginTop: 4 }}>{s.weeklyHours?.toFixed(1) || '0'}h</div>
              <div style={{ fontSize: 10, color: 'var(--ink-ghost)' }}>this week</div>
              {selected && <div style={{ fontSize: 11, color: 'var(--good)', marginTop: 4 }}>✓ {label}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DuplicateModal({ event, onClose, onSaved }) {
  const [form, setForm] = useState({ eventTimeStart: '', eventTimeEnd: '', venue: event.venue || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const minDate = nowISOLocal();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.eventTimeStart || !form.eventTimeEnd) { setError('Both dates required'); return; }
    if (new Date(form.eventTimeStart) <= new Date()) { setError('Start must be in the future'); return; }
    if (new Date(form.eventTimeEnd) <= new Date(form.eventTimeStart)) { setError('End must be after start'); return; }
    setSaving(true); setError('');
    try {
      await duplicateEvent(event.id, {
        eventTimeStart: new Date(form.eventTimeStart).toISOString(),
        eventTimeEnd: new Date(form.eventTimeEnd).toISOString(),
        venue: form.venue
      });
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Duplicate failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Duplicate: {event.eventName}</div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>Creates a copy with new dates. Staff must be reassigned after creation.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">New start *</label>
              <input className="form-input" type="datetime-local" min={minDate} value={form.eventTimeStart} onChange={e => setForm(f => ({ ...f, eventTimeStart: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">New end *</label>
              <input className="form-input" type="datetime-local" min={form.eventTimeStart || minDate} value={form.eventTimeEnd} onChange={e => setForm(f => ({ ...f, eventTimeEnd: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Venue</label>
            <input className="form-input" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Leave blank to keep original venue" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create copy'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageStaffModal({ event, onClose, onSaved }) {
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [primaryIds, setPrimaryIds] = useState(event.assignedStaff?.map(s => s.id) || []);
  const [optionalIds, setOptionalIds] = useState(event.optionalStaff?.map(s => s.id) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getEligibleStaff(event.id, event.openForDifferentAbled)
      .then(r => setEligible(r.data))
      .catch(() => setEligible([]))
      .finally(() => setLoading(false));
  }, [event.id, event.openForDifferentAbled]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await assignStaff(event.id, { staffIds: primaryIds, optionalStaffIds: optionalIds });
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Manage Staff — {event.eventName}</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--forest)' }}>👤 Primary Staff</div>
          <StaffPicker eligible={eligible} loading={loading} selectedIds={primaryIds} onChange={setPrimaryIds} label="Primary" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--warn)' }}>🔄 Optional / Backup Staff</div>
          <StaffPicker eligible={eligible} loading={loading} selectedIds={optionalIds} onChange={setOptionalIds} label="Backup" />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save staff'}</button>
        </div>
      </div>
    </div>
  );
}

function EventModal({ event, onClose, onSaved }) {
  const editing = !!event?.id;
  const minDate = nowISOLocal();

  const [form, setForm] = useState(event?.id ? {
    eventName: event.eventName, venue: event.venue || '',
    eventTimeStart: event.eventTimeStart?.slice(0, 16),
    eventTimeEnd: event.eventTimeEnd?.slice(0, 16),
    skills: event.skills || [], openForDifferentAbled: event.openForDifferentAbled || false,
    assignedStaffIds: event.assignedStaff?.map(s => s.id) || [],
    optionalStaffIds: event.optionalStaff?.map(s => s.id) || []
  } : { ...EMPTY_FORM });

  const [eligible, setEligible] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canShowStaff = form.skills.length > 0 && form.eventTimeStart && form.eventTimeEnd && new Date(form.eventTimeEnd) > new Date(form.eventTimeStart);

  const fetchStaff = useCallback(async () => {
    if (!canShowStaff) return;
    setLoadingStaff(true);
    try {
      let r;
      if (editing) {
        r = await getEligibleStaff(event.id, form.openForDifferentAbled);
      } else {
        r = await getEligibleStaffPreview(
          form.skills.join(","),
          form.eventTimeStart,
          form.eventTimeEnd,
         // new Date(form.eventTimeStart).toISOString(),
         // new Date(form.eventTimeEnd).toISOString(),
          form.openForDifferentAbled
        );
      }
      setEligible(r.data);
    } catch { setEligible([]); }
    finally { setLoadingStaff(false); }
  }, [form.skills, form.eventTimeStart, form.eventTimeEnd, form.openForDifferentAbled, editing, event?.id, canShowStaff]);

  useEffect(() => { if (showStaff) fetchStaff(); }, [showStaff, fetchStaff]);

  const toggleSkill = sk => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(sk) ? f.skills.filter(s => s !== sk) : [...f.skills, sk],
      assignedStaffIds: [], optionalStaffIds: []
    }));
    setShowStaff(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.eventName || !form.eventTimeStart || !form.eventTimeEnd) { setError('Fill all required fields'); return; }
    if (form.skills.length === 0) { setError('Select at least one skill'); return; }
    if (!editing && new Date(form.eventTimeStart) <= new Date()) { setError('Start time must be in the future'); return; }
    if (new Date(form.eventTimeEnd) <= new Date(form.eventTimeStart)) { setError('End must be after start'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, eventTimeStart: new Date(form.eventTimeStart).toISOString(), eventTimeEnd: new Date(form.eventTimeEnd).toISOString() };
      if (editing) await updateEvent(event.id, payload);
      else await createEvent(payload);
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{editing ? 'Edit event' : 'Create new event'}</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Event name *</label>
            <input className="form-input" value={form.eventName} onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))} placeholder="e.g. After-School Sports Drop-In" />
          </div>
          <div className="form-group">
            <label className="form-label">Venue</label>
            <input className="form-input" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Community Sports Hall" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start date & time *</label>
              <input className="form-input" type="datetime-local" min={editing ? undefined : minDate} value={form.eventTimeStart}
                onChange={e => setForm(f => ({ ...f, eventTimeStart: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End date & time *</label>
              <input className="form-input" type="datetime-local" min={form.eventTimeStart || minDate} value={form.eventTimeEnd}
                onChange={e => setForm(f => ({ ...f, eventTimeEnd: e.target.value }))} />
            </div>
          </div>
          {form.eventTimeStart && form.eventTimeEnd && new Date(form.eventTimeEnd) > new Date(form.eventTimeStart) && (
            <div style={{ fontSize: 12, color: 'var(--good)', marginBottom: 12 }}>
              Duration: {durationLabel((new Date(form.eventTimeEnd) - new Date(form.eventTimeStart)) / 3600000)}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Skills required *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SKILLS.map(sk => (
                <button key={sk} type="button" onClick={() => toggleSkill(sk)} className="badge"
                  style={{ cursor: 'pointer', border: 'none', background: form.skills.includes(sk) ? 'var(--forest)' : 'var(--cream-dark)', color: form.skills.includes(sk) ? 'white' : 'var(--ink-soft)', padding: '5px 12px', fontSize: 12, transition: 'all 0.12s' }}>
                  {sk}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.openForDifferentAbled} onChange={e => setForm(f => ({ ...f, openForDifferentAbled: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--forest)' }} />
              <span><strong>Open for Differently Abled Students</strong>
                <span style={{ color: 'var(--ink-ghost)', marginLeft: 6, fontSize: 12 }}>— filters staff who support differently abled</span>
              </span>
            </label>
          </div>

          {canShowStaff && !showStaff && (
            <button type="button" className="btn" style={{ marginBottom: 16 }} onClick={() => { setShowStaff(true); }}>
              👥 Show available staff
            </button>
          )}

          {showStaff && canShowStaff && (
            <>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--forest)' }}>
                  Primary Staff
                  <span style={{ color: 'var(--ink-ghost)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>— ≥60% skill match · available 1hr either side · sorted by hours</span>
                </label>
                <StaffPicker eligible={eligible} loading={loadingStaff} selectedIds={form.assignedStaffIds}
                  onChange={ids => setForm(f => ({ ...f, assignedStaffIds: ids }))} label="Primary" />
                {form.assignedStaffIds.length > 0 && <div style={{ fontSize: 12, color: 'var(--good)', marginTop: 6 }}>{form.assignedStaffIds.length} primary staff selected</div>}
              </div>
              {/* <div className="form-group">
                <label className="form-label" style={{ color: 'var(--warn)' }}>
                  Optional / Backup Staff
                  <span style={{ color: 'var(--ink-ghost)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>— in case primary staff cancel</span>
                </label>
                <StaffPicker eligible={eligible} loading={loadingStaff} selectedIds={form.optionalStaffIds}
                  onChange={ids => setForm(f => ({ ...f, optionalStaffIds: ids }))} label="Backup" />
                {form.optionalStaffIds.length > 0 && <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6 }}>{form.optionalStaffIds.length} backup staff selected</div>}
              </div> */}
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [manageStaffTarget, setManageStaffTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(() => {
    setLoading(true);
    getAllEvents().then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    setDeleting(id);
    try { await deleteEvent(id); load(); } finally { setDeleting(null); }
  };

  const filtered = filter === 'ALL' ? events : events.filter(e => e.status === filter);

  return (
    <>
      {modal && <EventModal event={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {duplicateTarget && <DuplicateModal event={duplicateTarget} onClose={() => setDuplicateTarget(null)} onSaved={() => { setDuplicateTarget(null); load(); }} />}
      {manageStaffTarget && <ManageStaffModal event={manageStaffTarget} onClose={() => setManageStaffTarget(null)} onSaved={() => { setManageStaffTarget(null); load(); }} />}

      <div className="card">
        <div className="card-header">
          <span className="card-title">All events</span>
          <button className="btn btn-primary" onClick={() => setModal('create')}>+ New event</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {loading ? <div className="loading"><div className="spinner" /></div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <div className="empty-title">No events found</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal('create')}>Create your first event</button>
            </div>
          ) : (
            <div className="event-grid">
              {filtered.map(ev => (
                <div key={ev.id} className="event-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div className="event-name">{ev.eventName}</div>
                    <span className={`badge ${statusClass(ev)}`}>{ev.status}</span>
                  </div>
                  {ev.venue && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>📍 {ev.venue}</div>}
                  <div className="event-time">{fmt(ev.eventTimeStart)} → {fmt(ev.eventTimeEnd)}</div>
                  <div className="event-duration" style={{ marginBottom: 8 }}>
                    {durationLabel(ev.durationHours)} · {ev.registeredStudentCount} student{ev.registeredStudentCount !== 1 ? 's' : ''}
                    {ev.openForDifferentAbled && <span className="badge badge-info" style={{ marginLeft: 8 }}>♿</span>}
                  </div>
                  <div className="skills-list" style={{ marginBottom: 8 }}>{ev.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div>
                  {ev.assignedStaff?.length > 0 && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>👤 {ev.assignedStaff.map(s => s.name).join(', ')}</div>}
                  {ev.optionalStaff?.length > 0 && <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>🔄 Backup: {ev.optionalStaff.map(s => s.name).join(', ')}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                    {ev.status !== 'COMPLETED' && ev.status !== 'CANCELLED' && <button className="btn btn-sm" onClick={() => setModal(ev)}>Edit</button>}
                    <button className="btn btn-sm" onClick={() => setManageStaffTarget(ev)}>Staff</button>
                    {ev.status === 'COMPLETED' && (
                      <button className="btn btn-sm" style={{ background: 'var(--info-bg)', color: 'var(--info)' }} onClick={() => setDuplicateTarget(ev)}>Duplicate</button>
                    )}
                    <button className="btn btn-sm btn-danger" disabled={deleting === ev.id} onClick={() => handleDelete(ev.id)}>
                      {deleting === ev.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </>
  );
}
