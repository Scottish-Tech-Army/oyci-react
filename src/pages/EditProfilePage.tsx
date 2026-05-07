import { useState, useEffect } from 'react';
import API from '../services/api';

interface ProfileForm {
  roleType: string;
  skills: string[];
  specificAvailability: { date: string; startTime: string; endTime: string; isWorking: boolean }[];
  holidayDates: string[];
  willingToVolunteer: boolean;
}



const ROLE_OPTIONS = ['Youth Worker', 'Session Support', 'ASC Staff', 'Drama Staff'];
const SKILL_OPTIONS = ['Drama', 'ASC', 'Youth Work'];

// ── Date Helpers ─────────────────────────────────────────────────────────────
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const EditProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<ProfileForm>({ 
    roleType: '',
    skills: [], 
    specificAvailability: [],
    holidayDates: [],
    willingToVolunteer: false 
  });

  // Week Picker State
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('/users/profile');
        setUser(data);
        setForm({
          roleType: data.roleType || '',
          skills: data.skills || [],
          specificAvailability: data.specificAvailability || [],
          holidayDates: data.holidayDates || [],
          willingToVolunteer: data.willingToVolunteer || false,
        });

        const token = localStorage.getItem('token');
        if (token) {
          localStorage.setItem('user', JSON.stringify({ ...data, token }));
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          setForm({
            roleType: parsedUser.roleType || '',
            skills: parsedUser.skills || [],
            specificAvailability: parsedUser.specificAvailability || [],
            holidayDates: parsedUser.holidayDates || [],
            willingToVolunteer: parsedUser.willingToVolunteer || false,
          });
        }
      }
    };
    fetchProfile();
  }, []);

  const currentDates = Array.from({length: 7}).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return {
      dateString: dateStr,
      displayDay: d.toLocaleDateString('en-GB', { weekday: 'long' }),
      displayDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    };
  });

  const getDayConfig = (dateString: string) => {
    const found = form.specificAvailability.find(a => a.date === dateString);
    return found || { date: dateString, startTime: '', endTime: '', isWorking: false };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (!user) return <div className="loading-state">Loading schedule data…</div>;

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <h3 className="section-title">Personal Details</h3>
        <p className="read-only-text">
          Name: <strong>{user.firstName} {user.lastName}</strong>
        </p>
        <p className="read-only-text">
          Email: <strong>{user.emailId}</strong>
        </p>
        <p className="read-only-text">
          Gender: <strong style={{ textTransform: 'capitalize' }}>{user.gender}</strong>
        </p>
        <p className="read-only-text">
          Account Status: <strong style={{ color: user.status === 'APPROVED' ? 'var(--success)' : user.status === 'REJECTED' ? 'var(--error)' : 'inherit' }}>{user.status || 'PENDING'}</strong>
        </p>

        <div className="form-divider" style={{ margin: '24px 0' }} />
        
        <h3 className="section-title">My Assigned Schedule & Profile</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          This page is strictly read-only. Your profile configuration and week-specific availability are administered by the OYCI Management Team. 
          If you need to change your availability, please contact an administrator.
        </p>

        <form onSubmit={handleSubmit} className="profile-form">
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Primary Role</label>
              <select 
                 className="form-input" 
                 value={form.roleType} 
                 disabled={true}
                 onChange={e => setForm({...form, roleType: e.target.value})}
                 style={{ maxWidth: '300px', opacity: 0.8, cursor: 'not-allowed' }}
              >
                <option value="">-- Select Role --</option>
                {ROLE_OPTIONS.map(role => (
                   <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: '20px' }}>
            <label className="form-label">Active Skills & Certifications (Multi-select)</label>
            <div className="pill-group">
              {SKILL_OPTIONS.map((skill) => {
                const isSelected = form.skills.includes(skill);
                return (
                  <button
                    type="button"
                    key={skill}
                    className={`pill-btn ${isSelected ? 'selected' : ''}`}
                    disabled={true}
                    style={{ padding: '6px 16px', borderRadius: '4px', opacity: 0.8, cursor: 'not-allowed' }}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week-Specific Availability Calendar */}
          <div className="form-group full-width" style={{ marginTop: '36px' }}>
            <label className="form-label" style={{ marginBottom: '8px', fontSize: '15px' }}>Week-Specific Availability (Read-Only)</label>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Navigate between weeks to see how your managers have scheduled your availability blockouts.
            </p>

            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              
              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    const prev = new Date(weekStart);
                    prev.setDate(prev.getDate() - 7);
                    setWeekStart(prev);
                  }}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  ← Prev Week
                </button>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>
                    Week of {currentDates[0].displayDate}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {currentDates[0].displayDate} - {currentDates[6].displayDate}
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    const next = new Date(weekStart);
                    next.setDate(next.getDate() + 7);
                    setWeekStart(next);
                  }}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Next Week →
                </button>
              </div>

              {/* Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {currentDates.map(({ dateString, displayDay, displayDate }) => {
                   const config = getDayConfig(dateString);
                   return (
                     <div key={dateString} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                       <div style={{ width: '140px' }}>
                         <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{displayDay}</p>
                         <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{displayDate}</p>
                       </div>
                       
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'not-allowed', fontSize: '13px', color: 'var(--text-secondary)' }}>
                           <input type="checkbox" checked={config.isWorking} disabled style={{ accentColor: 'var(--accent)' }} />
                           Working Day?
                         </label>

                         <div style={{ display: 'flex', gap: '8px', opacity: config.isWorking ? 1 : 0.4, pointerEvents: 'none' }}>
                           <input type="time" className="form-input" disabled value={config.startTime} style={{ padding: '6px 10px', width: '110px' }} />
                           <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>to</span>
                           <input type="time" className="form-input" disabled value={config.endTime} style={{ padding: '6px 10px', width: '110px' }} />
                         </div>
                       </div>
                     </div>
                   );
                 })}
              </div>
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: '36px' }}>
            <label className="form-label">Single-Day Holidays / Unavailable Dates Override (Legacy)</label>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              These are specific single-day holidays recorded by administration.
            </p>
            {form.holidayDates.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {form.holidayDates.map(date => (
                  <span key={date} style={{ background: '#fef2f2', color: '#ef4444', padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {date}
                  </span>
                ))}
              </div>
            ) : (
               <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>No standalone holidays recorded.</p>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed', opacity: 0.8 }}>
              <input
                type="checkbox"
                checked={form.willingToVolunteer}
                disabled={true}
                onChange={(e) => setForm({ ...form, willingToVolunteer: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'not-allowed' }}
              />
              Activate profile for volunteering assignments (Checking this will flag account as PENDING until Admin review)
            </label>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;

