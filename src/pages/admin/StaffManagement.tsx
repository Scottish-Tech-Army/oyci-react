import { useState, useEffect } from 'react';
import API from '../../services/api';

const ROLE_OPTIONS = ['Youth Worker', 'Session Support', 'ASC Staff', 'Drama Staff'];
const SKILL_OPTIONS = ['Drama', 'ASC', 'Youth Work'];

const getDatesBetween = (startStr: string, endStr: string) => {
  const dates: { dateString: string; displayDay: string; displayDate: string }[] = [];
  if (!startStr || !endStr) return dates;
  let curr = new Date(startStr);
  const end = new Date(endStr);
  let count = 0;
  while (curr <= end && count < 90) {
    const dStr = curr.getFullYear() + '-' + String(curr.getMonth() + 1).padStart(2, '0') + '-' + String(curr.getDate()).padStart(2, '0');
    dates.push({
      dateString: dStr,
      displayDay: curr.toLocaleDateString('en-GB', { weekday: 'long' }),
      displayDate: curr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    });
    curr.setDate(curr.getDate() + 1);
    count++;
  }
  return dates;
};

const formatISO = (d: Date) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

interface EditStaffForm {
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  gender: string;
  roleType: string;
  skills: string[];
  specificAvailability: { date: string; startTime: string; endTime: string; isWorking: boolean }[];
  holidayDates: string[];
  employmentType: 'salaried' | 'contractual' | '';
  fixedSalary: number | '';
  hourlyRate: number | '';
}

const buildEditForm = (u: any): EditStaffForm => ({
  firstName: u.firstName || '',
  lastName: u.lastName || '',
  emailId: u.emailId || '',
  phoneNumber: u.phoneNumber || '',
  gender: u.gender || 'other',
  roleType: u.roleType || '',
  skills: u.skills || [],
  specificAvailability: u.specificAvailability || [],
  holidayDates: u.holidayDates || [],
  employmentType: u.employmentType || '',
  fixedSalary: u.fixedSalary || '',
  hourlyRate: u.hourlyRate || '',
});

const EditStaffModal = ({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) => {
  const [form, setForm] = useState<EditStaffForm>(buildEditForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
  const [rangeStart, setRangeStart] = useState(formatISO(today));
  const [rangeEnd, setRangeEnd] = useState(formatISO(nextWeek));

  const currentDates = getDatesBetween(rangeStart, rangeEnd);

  const toggleSkill = (val: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(val) ? prev.skills.filter(s => s !== val) : [...prev.skills, val]
    }));
  };

  const getDayConfig = (dateString: string) => {
    const found = form.specificAvailability.find(a => a.date === dateString);
    return found || { date: dateString, startTime: '', endTime: '', isWorking: false };
  };

  const handleAvailabilityChange = (dateString: string, field: 'startTime' | 'endTime' | 'isWorking', value: any) => {
    setForm(prev => {
      const existing = prev.specificAvailability.map(a => ({ ...a }));
      const idx = existing.findIndex(a => a.date === dateString);
      if (idx !== -1) { (existing[idx] as any)[field] = value; }
      else { existing.push({ date: dateString, startTime: field === 'startTime' ? value : '', endTime: field === 'endTime' ? value : '', isWorking: field === 'isWorking' ? value : false }); }
      return { ...prev, specificAvailability: existing };
    });
  };

  const toggleHoliday = (dateString: string) => {
    setForm(prev => ({
      ...prev,
      holidayDates: prev.holidayDates.includes(dateString)
        ? prev.holidayDates.filter(d => d !== dateString)
        : [...prev.holidayDates, dateString]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await API.put(`/users/${user._id}/profile`, {
        firstName: form.firstName,
        lastName: form.lastName,
        emailId: form.emailId,
        phoneNumber: form.phoneNumber,
        gender: form.gender,
        roleType: form.roleType,
        skills: form.skills,
        specificAvailability: form.specificAvailability,
        holidayDates: form.holidayDates,
        employmentType: form.employmentType || '',
        fixedSalary: form.employmentType === 'salaried' ? form.fixedSalary : '',
        hourlyRate: form.employmentType === 'contractual' ? form.hourlyRate : '',
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update staff profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>Edit Staff Profile</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{user.firstName} {user.lastName} — {user.emailId}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <form id="edit-staff-form" onSubmit={handleSave}>
            {error && <div style={{ margin: '16px 28px 0', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'var(--error)', fontSize: '14px' }}>⚠️ {error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', height: '100%' }}>

              {/* ── LEFT COLUMN ── */}
              <div style={{ padding: '24px 28px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>1. Personal Details</h3>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>First Name *</label>
                      <input required className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Name *</label>
                      <input required className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Doe" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email Address *</label>
                      <input required type="email" className="form-input" value={form.emailId} onChange={e => setForm({ ...form, emailId: e.target.value })} placeholder="staff@oyci.org" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone Number</label>
                      <input type="tel" className="form-input" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} placeholder="Mobile Number" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Gender *</label>
                      <select required className="form-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Position Type</label>
                      <select className="form-input" value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value as any, fixedSalary: '', hourlyRate: '' })}>
                        <option value="">-- Unspecified / Volunteer --</option>
                        <option value="salaried">Salaried (Fixed Rate)</option>
                        <option value="contractual">Contractual (Hourly)</option>
                      </select>
                    </div>
                  </div>
                  {(form.employmentType === 'salaried' || form.employmentType === 'contractual') && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{form.employmentType === 'salaried' ? 'Fixed Salary (EUR/mo)' : 'Hourly Rate (EUR/hr)'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>€</span>
                        <input type="number" step="0.01" min="0" className="form-input" style={{ maxWidth: '140px' }}
                          value={form.employmentType === 'salaried' ? form.fixedSalary : form.hourlyRate}
                          onChange={e => {
                            if (form.employmentType === 'salaried') setForm({ ...form, fixedSalary: e.target.value ? Number(e.target.value) : '' });
                            else setForm({ ...form, hourlyRate: e.target.value ? Number(e.target.value) : '' });
                          }}
                          placeholder={form.employmentType === 'salaried' ? 'e.g. 2000' : 'e.g. 15.50'} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>2. Role & Skills</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Primary Role Type</label>
                    <select className="form-input" value={form.roleType} onChange={e => setForm({ ...form, roleType: e.target.value })}>
                      <option value="">-- Select Role --</option>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Active Skills</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {SKILL_OPTIONS.map(skill => {
                        const sel = form.skills.includes(skill);
                        return (
                          <button type="button" key={skill} onClick={() => toggleSkill(skill)}
                            style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'transparent', color: sel ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                            {sel ? '✓ ' : '+ '}{skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Timesheet ── */}
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>3. Availability Timesheet</h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>FROM</label>
                      <input type="date" className="form-input" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
                    </div>
                    <span style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>→</span>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>TO</label>
                      <input type="date" className="form-input" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {currentDates.map(({ dateString, displayDay, displayDate }) => {
                      const config = getDayConfig(dateString);
                      const isHoliday = form.holidayDates.includes(dateString);
                      return (
                        <div key={dateString} style={{ background: isHoliday ? 'rgba(239,68,68,0.06)' : 'var(--bg-input)', border: `1px solid ${isHoliday ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', opacity: isHoliday ? 0.7 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: '100px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{displayDay}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{displayDate}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={config.isWorking && !isHoliday} disabled={isHoliday} onChange={e => handleAvailabilityChange(dateString, 'isWorking', e.target.checked)} />
                                Working
                              </label>
                              <input type="time" className="form-input" style={{ padding: '4px 6px', fontSize: '12px', width: '100px', opacity: (!config.isWorking || isHoliday) ? 0.4 : 1 }} disabled={!config.isWorking || isHoliday} value={config.startTime} onChange={e => handleAvailabilityChange(dateString, 'startTime', e.target.value)} />
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>to</span>
                              <input type="time" className="form-input" style={{ padding: '4px 6px', fontSize: '12px', width: '100px', opacity: (!config.isWorking || isHoliday) ? 0.4 : 1 }} disabled={!config.isWorking || isHoliday} value={config.endTime} onChange={e => handleAvailabilityChange(dateString, 'endTime', e.target.value)} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: '#ef4444' }}>
                                <input type="checkbox" checked={isHoliday} onChange={() => toggleHoliday(dateString)} />
                                Holiday
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {currentDates.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>Select a date range to generate the timesheet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button type="submit" form="edit-staff-form" disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay() || 7;
  if (day !== 1) date.setHours(-24 * (day - 1));
  return date.toISOString().split('T')[0];
};

const getSunday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay() || 7;
  if (day !== 7) date.setHours(24 * (7 - day));
  return date.toISOString().split('T')[0];
};

const getDatesInRange = (startStr: string, endStr: string) => {
  const dates = [];
  let current = new Date(startStr);
  const end = new Date(endStr);

  let count = 0;
  while (current <= end && count < 365) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
    count++;
  }
  return dates;
};

const getDuration = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startDec = sh + (sm / 60);
  const endDec = eh + (em / 60);
  return endDec > startDec ? (endDec - startDec) : 0;
};



// ── View Staff Modal ──────────────────────────────────────────────────────────
const ViewStaffModal = ({ user, onClose }: { user: any; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
    <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '560px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '28px 28px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '12px' }}>👤</div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 800 }}>{user.firstName} {user.lastName}</h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>{user.roleType || 'Staff'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#fff', fontSize: '18px', lineHeight: 1 }}>✕</button>
        </div>
        <span style={{ display: 'inline-block', marginTop: '10px', padding: '3px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: user.status === 'APPROVED' ? 'rgba(16,185,129,0.25)' : user.status === 'PENDING' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)', color: user.status === 'APPROVED' ? '#6ee7b7' : user.status === 'PENDING' ? '#fcd34d' : '#fca5a5' }}>
          {user.status}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { label: '📧 Email',       value: user.emailId      || '—' },
          { label: '📱 Phone',       value: user.phoneNumber  || '—' },
          { label: '⚧ Gender',      value: user.gender       || '—' },
          { label: '💼 Position',    value: user.employmentType ? (user.employmentType === 'salaried' ? `Salaried — £${user.fixedSalary || 0}/mo` : `Contractual — £${user.hourlyRate || 0}/hr`) : 'Volunteer' },
          { label: '🔧 Skills',      value: (user.skills || []).join(', ') || 'None' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', gap: '12px', alignItems: 'baseline', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, minWidth: '110px' }}>{row.label}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{row.value}</span>
          </div>
        ))}
        <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>📅 Availability</span>
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(user.specificAvailability || []).filter((a: any) => a.isWorking).length === 0
              ? <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No availability set</span>
              : (user.specificAvailability || []).filter((a: any) => a.isWorking).map((a: any) => (
                  <span key={a.date} style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {a.date} {a.startTime}–{a.endTime}
                  </span>
                ))
            }
          </div>
        </div>
        {(user.holidayDates || []).length > 0 && (
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>🏖️ Holiday Dates</span>
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {user.holidayDates.map((d: string) => (
                <span key={d} style={{ fontSize: '11px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const StaffManagement = () => {
  const [activeTab, setActiveTab] = useState<'ASSIGNMENT' | 'DIRECTORY'>('ASSIGNMENT');
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);

  // Assignment Engine State
  const [fromDate, setFromDate] = useState(getMonday(new Date()));
  const [toDate, setToDate] = useState(getSunday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<string[]>([]);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);

  const rangeDates = getDatesInRange(fromDate, toDate);

  const fetchUsers = async () => {
    try {
      const { data } = await API.get('/users');
      setUsers(data.filter((u: any) => u.role !== 'admin'));
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await API.get('/events');
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchEvents()]).finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async (userId: string, status: string) => {
    if (!window.confirm(`Are you sure you want to change user status to ${status}?`)) return;
    try {
      setLoading(true);
      await API.patch(`/users/${userId}/status`, { status, assignedEventIds: [] });
      await fetchUsers();
    } catch (err) {
      alert('Failed to update user status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedSessionId) return;
    setSavingAssignment(true);
    try {
      await API.patch(`/events/${selectedSessionId}/staff`, { staffIds: assignmentDraft });
      await API.put(`/events/${selectedSessionId}`, { isManuallyCompleted: true });
      await fetchEvents();
      alert('Staff successfully assigned to session and session marked as completed!');
    } catch (err) {
      alert('Failed to save assignments.');
      console.error(err);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleUnlockSession = async () => {
    if (!selectedSessionId) return;
    try {
      await API.put(`/events/${selectedSessionId}`, { isManuallyCompleted: false });
      await fetchEvents();
    } catch (err) {
      alert('Failed to unlock session for editing.');
      console.error(err);
    }
  };

  // ─── ASSIGNMENT ENGINE LOGIC ───
  const eventsInRange = events.filter(e => {
    if (selectedDate) return e.date === selectedDate;
    return e.date >= fromDate && e.date <= toDate;
  });

  const selectedSession = events.find(e => e._id === selectedSessionId);

  // Sync draft IDs when selecting a new session
  useEffect(() => {
    if (selectedSession) {
      setAssignmentDraft((selectedSession.assignedStaff || []).map((s: any) => typeof s === 'string' ? s : s._id));
    } else {
      setAssignmentDraft([]);
    }
  }, [selectedSessionId, events]);

  // Matching Engine
  const matchingStaff = users.filter(user => {
    if (!selectedSession || user.status !== 'APPROVED') return false;

    // 1. Check Holiday Override — explicit holiday blocks
    if (user.holidayDates && user.holidayDates.includes(selectedSession.date)) {
      return false;
    }

    // 2. Check Specific Availability — only block if an entry EXPLICITLY says isWorking: false
    //    If no entry exists for the date, we treat the staff as potentially available
    const userGrid = user.specificAvailability || [];
    const dateConfig = userGrid.find((a: any) => a.date === selectedSession.date);

    if (dateConfig) {
      // Entry exists — honour it
      if (!dateConfig.isWorking) return false;

      // If both times are set, do exact time math verification
      if (dateConfig.startTime && selectedSession.startTime && dateConfig.startTime > selectedSession.startTime) {
        return false; // Staff starts after event begins
      }
      if (dateConfig.endTime && selectedSession.endTime && dateConfig.endTime < selectedSession.endTime) {
        return false; // Staff leaves before event ends
      }
    }
    // No dateConfig → no explicit restriction → staff passes availability check

    // 3. Skill Requirement — strict exact match per session type
    // Session Support staff bypass skill checks — they qualify for any session
    const userSkills = user.skills || [];
    if (user.roleType !== 'Session Support') {
      if (selectedSession.sessionType === 'ASC' && !userSkills.includes('ASC')) return false;
      if (selectedSession.sessionType === 'Drama' && !userSkills.includes('Drama')) return false;
      if (selectedSession.sessionType === 'PIAW' && !userSkills.includes('Drama')) return false;
      // General → any approved non-support staff qualifies regardless of skills
    }

    return true;
  });

  // Calculate Pre-Allocation Hours for this week
  const userHoursMap: Record<string, number> = {};
  if (selectedSession) {
    const wStart = getMonday(new Date(selectedSession.date));
    const wEnd = getSunday(new Date(selectedSession.date));
    const eventsInWeek = events.filter(e => e.date >= wStart && e.date <= wEnd);

    users.forEach(u => {
      let hours = 0;
      eventsInWeek.forEach(e => {
        if (Array.isArray(e.assignedStaff)) {
          const isAssigned = e.assignedStaff.some((s: any) =>
            (typeof s === 'string' ? s : s._id?.toString()) === u._id?.toString()
          );
          if (isAssigned) hours += getDuration(e.startTime, e.endTime);
        }
      });
      userHoursMap[u._id] = hours;
    });
  }

  // OYCI Rule Validation
  let validationErrors: string[] = [];
  if (selectedSession) {
    const selectedStaffMap = assignmentDraft.map(id => users.find(u => u._id === id)).filter(Boolean);
    const selectedYouthWorkers = selectedStaffMap.filter(u => u.roleType !== 'Session Support').length;
    const selectedSupport = selectedStaffMap.filter(u => u.roleType === 'Session Support').length;

    // Check Youth Worker Minimums
    if (selectedYouthWorkers < (selectedSession.requiredYouthWorkers || 2)) {
      validationErrors.push(`Requires ≥ ${selectedSession.requiredYouthWorkers || 2} Youth Workers/Specialists (Selected: ${selectedYouthWorkers})`);
    }
    // Check Support Minimums
    if (selectedSupport < (selectedSession.requiredSessionSupport || 1)) {
      validationErrors.push(`Requires ≥ ${selectedSession.requiredSessionSupport || 1} Support Worker (Selected: ${selectedSupport})`);
    }
    // Check ASC specific count
    if (selectedSession.sessionType === 'ASC' && selectedStaffMap.length < 3) {
      validationErrors.push(`ASC Session strictly requires ≥ 3 total staff (Selected: ${selectedStaffMap.length})`);
    }
  }

  const rulesPassed = validationErrors.length === 0;

  if (loading && users.length === 0) return <div className="loading-state">Loading staff management...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <button
          className={`btn-secondary ${activeTab === 'ASSIGNMENT' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('ASSIGNMENT')}
          style={{ background: activeTab === 'ASSIGNMENT' ? 'var(--accent)' : 'transparent', color: activeTab === 'ASSIGNMENT' ? '#fff' : 'var(--text-primary)', border: 'none', padding: '10px 20px', fontWeight: activeTab === 'ASSIGNMENT' ? 700 : 500, borderRadius: '8px' }}
        >
          Session Assignment Engine
        </button>
        <button
          className={`btn-secondary ${activeTab === 'DIRECTORY' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('DIRECTORY')}
          style={{ background: activeTab === 'DIRECTORY' ? 'var(--accent)' : 'transparent', color: activeTab === 'DIRECTORY' ? '#fff' : 'var(--text-primary)', border: 'none', padding: '10px 20px', fontWeight: activeTab === 'DIRECTORY' ? 700 : 500, borderRadius: '8px' }}
        >
          Staff Info & Approvals
        </button>
      </div>

      {editingStaff && (
        <EditStaffModal
          user={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={fetchUsers}
        />
      )}
      {viewingStaff && (
        <ViewStaffModal
          user={viewingStaff}
          onClose={() => setViewingStaff(null)}
        />
      )}

      {activeTab === 'ASSIGNMENT' ? (
        <div className="staff-management staff-split-layout">
          {/* LEFT: Sessions List */}
          <div className="calendar-panel">
            <div className="calendar-header">
              <h3>Date Range Filter</h3>
              <p>Find sessions needing staff coverage.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>FROM</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="form-input" style={{ padding: '8px', width: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>TO</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="form-input" style={{ padding: '8px', width: '100%' }} />
              </div>
            </div>

            <div className="day-block-list" style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '16px' }}>
              {rangeDates.map((dateObj, i) => {
                const isoStr = dateObj.toISOString().split('T')[0];
                return (
                  <div key={i} className={`day-block ${selectedDate === isoStr ? 'selected' : ''}`} onClick={() => setSelectedDate(prev => prev === isoStr ? null : isoStr)}>
                    <span className="day-name">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="day-date">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div className="calendar-header" style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Sessions in Range ({eventsInRange.length})</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {eventsInRange.map(e => (
                  <div
                    key={e._id}
                    onClick={() => setSelectedSessionId(e._id)}
                    style={{
                      padding: '12px', background: selectedSessionId === e._id ? 'var(--bg-input)' : 'var(--bg-card)',
                      border: `1px solid ${selectedSessionId === e._id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      borderLeft: `4px solid ${e.sessionType === 'ASC' ? '#f59e0b' : e.sessionType === 'Drama' ? '#8b5cf6' : '#10b981'}`
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{e.eventName}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{e.date} • {e.startTime} - {e.endTime}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>{e.sessionType}</span>
                      <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>{Array.isArray(e.assignedStaff) ? e.assignedStaff.length : 0} Staff</span>
                    </div>
                  </div>
                ))}
                {eventsInRange.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>No sessions found.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Staff Matching */}
          <div className="admin-table-card">
            {!selectedSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>👥</div>
                <h3>Select a Session</h3>
                <p>Click a session on the left to view and assign matching staff members.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <h3 className="section-title" style={{ marginBottom: '4px', fontSize: '20px' }}>Assign Staff: {selectedSession.eventName}</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <strong>{selectedSession.date}</strong> | {selectedSession.startTime} - {selectedSession.endTime} ({selectedSession.sessionTime})
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {validationErrors.map(err => (
                        <span key={err} style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px' }}>
                          🔴 {err}
                        </span>
                      ))}
                      {rulesPassed && (
                        <span style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '6px' }}>
                          🟢 Staffing Rules Met
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleSaveAssignments} className="btn-primary" disabled={savingAssignment || (!rulesPassed && !adminOverride) || selectedSession.isManuallyCompleted}>
                        {selectedSession.isManuallyCompleted ? 'Session Completed' : (savingAssignment ? 'Saving...' : 'Save Assignments')}
                      </button>
                      {selectedSession.isManuallyCompleted && (
                        <button onClick={handleUnlockSession} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                    {!rulesPassed && !selectedSession.isManuallyCompleted && (
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-error)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={adminOverride} onChange={e => setAdminOverride(e.target.checked)} />
                        Override Strict Constraints
                      </label>
                    )}
                  </div>
                </div>

                {/* Split eligible staff into two tables */}
                {(() => {
                  const specialistStaff = matchingStaff.filter((u: any) => u.roleType !== 'Session Support');
                  const supportStaff = matchingStaff.filter((u: any) => u.roleType === 'Session Support');

                  const renderRow = (u: any) => {
                    const isChecked = assignmentDraft.includes(u._id);
                    const currentHours = userHoursMap[u._id] || 0;
                    const dateConfig = (u.specificAvailability || []).find((a: any) => a.date === selectedSession.date);
                    return (
                      <tr key={u._id} style={{ background: isChecked ? 'rgba(99,102,241,0.05)' : '' }}>
                        <td>
                          <input type="checkbox" checked={isChecked}
                            disabled={selectedSession.isManuallyCompleted}
                            onChange={(e) => {
                              if (e.target.checked) setAssignmentDraft([...assignmentDraft, u._id]);
                              else setAssignmentDraft(assignmentDraft.filter(id => id !== u._id));
                            }}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: selectedSession.isManuallyCompleted ? 'not-allowed' : 'pointer', opacity: selectedSession.isManuallyCompleted ? 0.5 : 1 }}
                          />
                        </td>
                        <td><strong style={{ color: 'var(--text-primary)' }}>{u.firstName} {u.lastName}</strong></td>
                        <td>{u.roleType}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(u.skills || []).map((s: string) => (
                              <span key={s} style={{ fontSize: '11px', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {dateConfig && dateConfig.isWorking
                            ? <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dateConfig.startTime} - {dateConfig.endTime}</span>
                            : <span style={{ color: 'var(--text-secondary)' }}>No slot set</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: currentHours >= 30 ? 'var(--error)' : 'var(--text-secondary)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            {currentHours.toFixed(1)}h
                          </span>
                        </td>
                      </tr>
                    );
                  };

                  return (
                    <>
                      {/* Section 1: Specialist Staff */}
                      <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{specialistStaff.length}</span>
                        Eligible Staff Matches
                      </h4>
                      <div className="table-wrapper" style={{ marginBottom: '24px' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}>Select</th>
                              <th>Name</th>
                              <th>Role Type</th>
                              <th>Skills</th>
                              <th>Availability Slot</th>
                              <th>Wk Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {specialistStaff.length > 0 ? specialistStaff.map(renderRow) : (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                  No specialist staff eligible for this session.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Section 2: Support Workers */}
                      <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'rgba(234,179,8,0.15)', color: '#ca8a04', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{supportStaff.length}</span>
                        Support Workers
                      </h4>
                      <div className="table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}>Select</th>
                              <th>Name</th>
                              <th>Role Type</th>
                              <th>Skills</th>
                              <th>Availability Slot</th>
                              <th>Wk Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {supportStaff.length > 0 ? supportStaff.map(renderRow) : (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                  No Session Support workers eligible for this session.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

      ) : (
        /* DIRECTORY & APPROVALS TAB */
        <div className="admin-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>👥 Staff Info &amp; Approvals</h3>
          </div>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Skills</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.emailId}</td>
                    <td>{u.roleType || '—'}</td>
                    <td>{(u.skills && u.skills.length > 0) ? u.skills.join(', ') : 'None'}</td>
                    <td>
                      <span className={`status-badge ${u.status.toLowerCase()}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => setViewingStaff(u)}
                          title="View staff details"
                          style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}
                        >
                          👁 View
                        </button>
                        <button
                          onClick={() => setEditingStaff(u)}
                          style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✏️ Edit
                        </button>
                        {u.status === 'PENDING' ? (
                          <>
                            <button className="btn-approve" onClick={() => handleStatusUpdate(u._id, 'APPROVED')} style={{ fontSize: '13px' }}>Approve</button>
                            <button className="btn-reject" onClick={() => handleStatusUpdate(u._id, 'REJECTED')} style={{ fontSize: '13px' }}>Reject</button>
                          </>
                        ) : (
                          <button
                            className="btn-reject"
                            onClick={() => handleStatusUpdate(u._id, u.status === 'APPROVED' ? 'REJECTED' : 'APPROVED')}
                            style={{ fontSize: '13px' }}
                          >
                            {u.status === 'APPROVED' ? 'Revoke' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No staff users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffManagement;