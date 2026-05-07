import React, { useState } from 'react';
import API from '../../services/api';
import axios from 'axios';

// ── Custom Time Picker (12-hour AM/PM) ────────────────────────────────────────
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01–12
const MINUTES  = ['00', '15', '30', '45'];

// Convert 24h "HH:mm" → { h12, mm, ampm }
const to12h = (val: string) => {
  if (!val) return { h12: '09', mm: '00', ampm: 'AM' };
  const [hhStr, mmStr] = val.split(':');
  let hh = parseInt(hhStr, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return { h12: String(hh).padStart(2, '0'), mm: mmStr || '00', ampm };
};

// Convert { h12, mm, ampm } → 24h "HH:mm"
const to24h = (h12: string, mm: string, ampm: string) => {
  let hh = parseInt(h12, 10);
  if (ampm === 'AM' && hh === 12) hh = 0;
  else if (ampm === 'PM' && hh !== 12) hh += 12;
  return `${String(hh).padStart(2, '0')}:${mm}`;
};

const TimePicker: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const { h12, mm, ampm } = to12h(value);

  const update = (field: 'h' | 'm' | 'p', v: string) => {
    const newH = field === 'h' ? v : h12;
    const newM = field === 'm' ? v : mm;
    const newP = field === 'p' ? v : ampm;
    onChange(to24h(newH, newM, newP));
  };

  const selStyle: React.CSSProperties = {
    padding: '5px 6px',
    borderRadius: '7px',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    minWidth: '48px',
    textAlign: 'center',
    appearance: 'none' as any,
    WebkitAppearance: 'none' as any,
  };

  const ampmStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    background: active ? '#6366f1' : 'var(--bg-input)',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '4px 10px',
      opacity: disabled ? 0.4 : 1,
    }}>
      <span style={{ fontSize: '13px' }}>🕐</span>
      <select disabled={disabled} value={h12} onChange={e => update('h', e.target.value)} style={selStyle}>
        {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span style={{ fontWeight: 900, color: 'var(--text-secondary)', fontSize: '14px' }}>:</span>
      <select disabled={disabled} value={mm} onChange={e => update('m', e.target.value)} style={selStyle}>
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '2px' }}>
        <button type="button" disabled={disabled} onClick={() => update('p', 'AM')} style={ampmStyle(ampm === 'AM')}>AM</button>
        <button type="button" disabled={disabled} onClick={() => update('p', 'PM')} style={ampmStyle(ampm === 'PM')}>PM</button>
      </div>
    </div>
  );
};

interface CreateStaffForm {
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  gender: string;
  roleType: string;
  skills: string[];
  specificAvailability: { date: string; startTime: string; endTime: string; isWorking: boolean }[];
  holidayDates: string[];
  willingToVolunteer: boolean;
  employmentType: 'salaried' | 'contractual' | '';
  fixedSalary: number | '';
  hourlyRate: number | '';
}

const ROLE_OPTIONS = ['Youth Worker', 'Session Support', 'ASC Staff', 'Drama Staff'];
const SKILL_OPTIONS = ['Drama', 'ASC', 'Youth Work'];

// Helper to generate dates between two YYYY-MM-DD strings
const getDatesBetween = (startStr: string, endStr: string) => {
  const dates = [];
  let curr = new Date(startStr);
  const end = new Date(endStr);
  while (curr <= end) {
    const dStr = curr.getFullYear() + '-' + String(curr.getMonth() + 1).padStart(2, '0') + '-' + String(curr.getDate()).padStart(2, '0');
    dates.push({
      dateString: dStr,
      displayDay: curr.toLocaleDateString('en-GB', { weekday: 'long' }),
      displayDate: curr.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    });
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const getDefaultForm = (): CreateStaffForm => ({ 
  firstName: '',
  lastName: '',
  emailId: '',
  phoneNumber: '',
  gender: 'other',
  roleType: '',
  skills: [], 
  specificAvailability: [],
  holidayDates: [],
  willingToVolunteer: false,
  employmentType: '',
  fixedSalary: '',
  hourlyRate: ''
});

const AdminStaffOnboardingPage: React.FC = () => {
  const [form, setForm] = useState<CreateStaffForm>(getDefaultForm());
  
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');

  // Date Range State (Default: Today to +7 Days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const formatISO = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  const [rangeStart, setRangeStart] = useState<string>(formatISO(today));
  const [rangeEnd, setRangeEnd] = useState<string>(formatISO(nextWeek));

  const toggleSkill = (val: string) => {
    setForm((prev) => {
      const exists = prev.skills.includes(val);
      if (exists) return { ...prev, skills: prev.skills.filter((s) => s !== val) };
      return { ...prev, skills: [...prev.skills, val] };
    });
  };

  // Generate array based on selected range
  const currentDates = getDatesBetween(rangeStart, rangeEnd);

  const handleAvailabilityChange = (dateString: string, field: 'startTime' | 'endTime' | 'isWorking', value: any) => {
    setForm(prev => {
      const existing = prev.specificAvailability.map(a => ({...a}));
      const idx = existing.findIndex(a => a.date === dateString);
      
      if (idx !== -1) {
        (existing[idx] as any)[field] = value;
      } else {
        existing.push({ 
          date: dateString, 
          startTime: field === 'startTime' ? value : '', 
          endTime: field === 'endTime' ? value : '', 
          isWorking: field === 'isWorking' ? value : false 
        });
      }
      return { ...prev, specificAvailability: existing };
    });
  };

  const getDayConfig = (dateString: string) => {
    const found = form.specificAvailability.find(a => a.date === dateString);
    return found || { date: dateString, startTime: '', endTime: '', isWorking: false };
  };

  const toggleHoliday = (dateString: string) => {
    setForm(prev => {
      const isHoliday = prev.holidayDates.includes(dateString);
      return {
        ...prev,
        holidayDates: isHoliday ? prev.holidayDates.filter(d => d !== dateString) : [...prev.holidayDates, dateString]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    setSuccess('');

    try {
      await API.post(`/users`, {
        firstName: form.firstName,
        lastName: form.lastName,
        emailId: form.emailId,
        phoneNumber: form.phoneNumber,
        gender: form.gender,
        roleType: form.roleType,
        skills: form.skills,
        specificAvailability: form.specificAvailability,
        holidayDates: form.holidayDates,
        willingToVolunteer: form.willingToVolunteer,
        employmentType: form.employmentType || undefined,
        fixedSalary: form.employmentType === 'salaried' ? form.fixedSalary : undefined,
        hourlyRate: form.employmentType === 'contractual' ? form.hourlyRate : undefined,
      });

      setSuccess(`Staff account for ${form.firstName} ${form.lastName} has been securely created and approved!`);
      // Reset form on success
      setForm(getDefaultForm());
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? 'Failed to create staff account.');
      } else {
        setApiError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Register & Onboard New Staff</h2>
      </div>

      {apiError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {apiError}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '16px' }}>✅ {success}</div>}

      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* Left Column: Personal Details & Config */}
            <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                   1. Personal Details
                </h3>

                <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="firstName">First Name <span className="required">*</span></label>
              <input type="text" id="firstName" required className="form-input" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} placeholder="e.g. Jane" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="lastName">Last Name <span className="required">*</span></label>
              <input type="text" id="lastName" required className="form-input" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} placeholder="e.g. Doe" />
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="emailId">Email Address <span className="required">*</span></label>
              <input type="email" id="emailId" required className="form-input" value={form.emailId} onChange={(e) => setForm({...form, emailId: e.target.value})} placeholder="staff@oyci.org" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="phoneNumber">Phone Number</label>
              <input type="tel" id="phoneNumber" className="form-input" value={form.phoneNumber} onChange={(e) => setForm({...form, phoneNumber: e.target.value})} placeholder="Mobile Number" />
            </div>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="gender">Gender <span className="required">*</span></label>
              <select id="gender" required className="form-input" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Position Type</label>
              <select className="form-input" value={form.employmentType} onChange={e => setForm({...form, employmentType: e.target.value as any, fixedSalary: '', hourlyRate: ''})} style={{ maxWidth: '100%' }}>
                <option value="">-- Unspecified / Volunteer --</option>
                <option value="salaried">Salaried (Fixed Rate)</option>
                <option value="contractual">Contractual (Hourly)</option>
              </select>
            </div>
          </div>

          {(form.employmentType === 'salaried' || form.employmentType === 'contractual') && (
            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">{form.employmentType === 'salaried' ? 'Fixed Salary (EUR/mo)' : 'Hourly Rate (EUR/hr)'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>€</span>
                  <input type="number" step="0.01" min="0" required className="form-input" value={form.employmentType === 'salaried' ? form.fixedSalary : form.hourlyRate} onChange={e => {
                    if (form.employmentType === 'salaried') setForm({...form, fixedSalary: e.target.value ? Number(e.target.value) : ''});
                    else setForm({...form, hourlyRate: e.target.value ? Number(e.target.value) : ''});
                  }} placeholder={form.employmentType === 'salaried' ? 'e.g. 2000' : 'e.g. 15.50'} style={{ maxWidth: '150px' }} />
                </div>
              </div>
            </div>
          )}
        </div>

              <div>
                <h3 style={{ margin: '16px 0 12px', fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                   2. Role & Certifications
                </h3>
                
                <div className="form-group">
                  <label className="form-label">Primary Role Type</label>
                  <select className="form-input" value={form.roleType} onChange={e => {
                    const role = e.target.value;
                    // Auto-populate default skill based on role
                    const roleSkillMap: Record<string, string> = {
                      'Drama Staff': 'Drama',
                      'ASC Staff': 'ASC',
                    };
                    const defaultSkill = roleSkillMap[role];
                    let updatedSkills = form.skills.filter(s => !['Drama', 'ASC'].includes(s)); // remove previous auto-skills
                    if (defaultSkill) updatedSkills = [...updatedSkills, defaultSkill];
                    setForm({ ...form, roleType: role, skills: updatedSkills });
                  }} style={{ maxWidth: '100%' }}>
                    <option value="">-- Select Role --</option>
                    {ROLE_OPTIONS.map(role => (
                       <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Active Skills</label>
                  <div className="pill-group" style={{ flexWrap: 'wrap' }}>
                    {SKILL_OPTIONS.map((skill) => {
                      const isSelected = form.skills.includes(skill);
                      return (
                        <button type="button" key={skill} className={`pill-btn ${isSelected ? 'selected' : ''}`} onClick={() => toggleSkill(skill)} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}>
                          {isSelected ? '✓ ' : '+ '} {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '8px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
                  {loading ? 'Processing...' : 'Save & Register Staff Config'}
                </button>
              </div>
            </div>

            {/* Right Column: Date Range Timesheet */}
            <div className="right-column" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>Generate Timesheet Range</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="date" className="form-input" value={rangeStart} onChange={e => setRangeStart(e.target.value)} style={{ padding: '6px 10px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>to</span>
                    <input type="date" className="form-input" value={rangeEnd} min={rangeStart} onChange={e => setRangeEnd(e.target.value)} style={{ padding: '6px 10px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
                 {currentDates.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Please select a valid date range.</p>}
                 {currentDates.map(({ dateString, displayDay, displayDate }) => {
                   const config = getDayConfig(dateString);
                   const isHoliday = form.holidayDates.includes(dateString);

                   return (
                      <div key={dateString} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: isHoliday ? 'rgba(239,68,68,0.05)' : config.isWorking ? 'rgba(34,197,94,0.04)' : 'var(--bg-card)',
                        padding: '12px 16px', borderRadius: '10px',
                        border: `1px solid ${isHoliday ? 'rgba(239,68,68,0.25)' : config.isWorking ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
                        transition: 'all 0.15s',
                      }}>
                        {/* Day label */}
                        <div style={{ width: '95px', flexShrink: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: isHoliday ? '#ef4444' : 'var(--text-primary)' }}>{displayDay}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>{displayDate}</p>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* Checkboxes */}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              <input type="checkbox" checked={config.isWorking && !isHoliday} disabled={isHoliday}
                                onChange={e => handleAvailabilityChange(dateString, 'isWorking', e.target.checked)}
                                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }} />
                              Working
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: isHoliday ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600 }}>
                              <input type="checkbox" checked={isHoliday} onChange={() => toggleHoliday(dateString)}
                                style={{ accentColor: '#ef4444', width: '14px', height: '14px' }} />
                              Holiday
                            </label>
                          </div>

                          {/* Time pickers */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: (config.isWorking && !isHoliday) ? 1 : 0.3, pointerEvents: (config.isWorking && !isHoliday) ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
                            <TimePicker
                              value={config.startTime}
                              onChange={v => handleAvailabilityChange(dateString, 'startTime', v)}
                              disabled={!config.isWorking || isHoliday}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>→</span>
                            <TimePicker
                              value={config.endTime}
                              onChange={v => handleAvailabilityChange(dateString, 'endTime', v)}
                              disabled={!config.isWorking || isHoliday}
                            />
                          </div>
                        </div>
                      </div>
                   );
                 })}
              </div>
            </div>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
};

export default AdminStaffOnboardingPage;
