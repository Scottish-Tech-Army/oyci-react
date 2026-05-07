import React, { useEffect, useState, useCallback } from 'react';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../../services/api';

const SKILLS = [
  'Youth Work','First Aid','Sports Coaching','Music','Arts & Crafts',
  'Mentoring','Leadership','STEM','Outdoor Education','Drama','Cooking','Photography'
];
const AVAIL_OPTIONS = [
  'MON-FRI 09:00-17:00','MON-FRI 08:00-16:00','MON-WED 10:00-18:00',
  'WED-FRI 09:00-17:00','MON-SUN 09:00-17:00',
];

function StaffModal({ staff, onClose, onSaved }) {
  const editing = !!staff?.id;
  const [form, setForm] = useState(staff?.id ? {
    username: staff.username, password: '', name: staff.name, email: staff.email,
    timeAvailable: staff.timeAvailable, skills: [...staff.skills],
    supportDifferentlyAbled: staff.supportDifferentlyAbled || false
  } : { username: '', password: '', name: '', email: '', timeAvailable: AVAIL_OPTIONS[0], skills: [], supportDifferentlyAbled: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleSkill = sk => setForm(f => ({ ...f, skills: f.skills.includes(sk) ? f.skills.filter(s => s !== sk) : [...f.skills, sk] }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.skills.length === 0) { setError('Select at least one skill'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await updateStaff(staff.id, { name: form.name, email: form.email, timeAvailable: form.timeAvailable, skills: form.skills, supportDifferentlyAbled: form.supportDifferentlyAbled });
      } else {
        await createStaff(form);
      }
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{editing ? 'Edit staff member' : 'Add staff member'}</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          {!editing && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. sarah.m" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" required />
              </div>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@oyci.org.uk" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Availability</label>
            <select className="form-input" value={form.timeAvailable} onChange={e => setForm(f => ({ ...f, timeAvailable: e.target.value }))}>
              {AVAIL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Skills *</label>
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
              <input type="checkbox" checked={form.supportDifferentlyAbled} onChange={e => setForm(f => ({ ...f, supportDifferentlyAbled: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--forest)' }} />
              <span><strong>Support Differently Abled Students</strong>
                <span style={{ color: 'var(--ink-ghost)', marginLeft: 6, fontSize: 12 }}>— this staff will be eligible for events open to differently abled</span>
              </span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add staff'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getAllStaff().then(r => setStaff(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    setDeleting(id);
    try { await deleteStaff(id); load(); } finally { setDeleting(null); }
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.skills.some(sk => sk.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      {modal && <StaffModal staff={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      <div className="metric-row">
        <div className="metric-card"><div className="m-label">Total staff</div><div className="m-value">{staff.length}</div></div>
        <div className="metric-card"><div className="m-label">Hours this week</div><div className="m-value">{staff.reduce((a, s) => a + (s.weeklyHours || 0), 0).toFixed(1)}h</div></div>
        <div className="metric-card"><div className="m-label">Avg hours / staff</div><div className="m-value">{staff.length ? (staff.reduce((a, s) => a + (s.weeklyHours || 0), 0) / staff.length).toFixed(1) : 0}h</div></div>
        <div className="metric-card"><div className="m-label">Support DA</div><div className="m-value">{staff.filter(s => s.supportDifferentlyAbled).length}</div></div>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Staff members</span>
          <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add staff</button>
        </div>
        <input className="form-input" style={{ marginBottom: 16 }} placeholder="Search by name, username or skill…" value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Availability</th><th>Skills</th><th>DA</th><th>Hours/wk</th><th></th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ background: 'var(--good-bg)', color: 'var(--good)', width: 30, height: 30, fontSize: 11 }}>{s.name.split(' ').map(w => w[0]).join('')}</div>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                    </div></td>
                    <td><code style={{ fontSize: 12 }}>{s.username}</code></td>
                    <td style={{ fontSize: 12 }}>{s.email}</td>
                    <td style={{ fontSize: 12 }}>{s.timeAvailable}</td>
                    <td><div className="skills-list">{s.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div></td>
                    <td style={{ textAlign: 'center', fontSize: 16 }}>{s.supportDifferentlyAbled ? '♿' : '—'}</td>
                    <td><span style={{ fontWeight: 500, color: s.weeklyHours > 30 ? 'var(--danger)' : s.weeklyHours > 20 ? 'var(--warn)' : 'var(--good)' }}>{s.weeklyHours?.toFixed(1) || '0.0'}h</span></td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => setModal(s)}>Edit</button>
                      <button className="btn btn-sm btn-danger" disabled={deleting === s.id} onClick={() => handleDelete(s.id)}>{deleting === s.id ? '…' : 'Remove'}</button>
                    </div></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="empty-state" style={{ padding: '2rem' }}>No staff found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
