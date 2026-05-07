import { useState, useEffect } from 'react';
import { familyApi } from '../services/api';

// ── Module-level helpers (outside component to prevent focus loss) ─────────────
const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)',
  background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '14px',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

const Field = ({
  label, children, required = false, half = false,
}: {
  label: string; children: React.ReactNode; required?: boolean; half?: boolean;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: half ? 'span 1' : undefined }}>
    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{label}</span>
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider" />
    </label>
  </div>
);

const DIETARY_OPTIONS = ['Nut-free', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Dairy-free'];

// ── Main Component ─────────────────────────────────────────────────────────────
const FamilyEditProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState(0);

  // Form state
  const [guardian, setGuardian] = useState({
    name: '', relationshipToChild: '', preferredContactMethod: 'Phone',
    phoneNumber: '', email: '', preferredLanguage: 'English', notesForStaff: '',
  });
  const [child, setChild] = useState({
    firstName: '', lastName: '', preferredName: '',
    dateOfBirth: '', ageGroup: '', gender: '', school: '',
  });
  const [support, setSupport] = useState({
    mobilitySupportRequired: false, visualImpairment: false,
    hearingImpairment: false, neurodivergentSupport: false,
    medicalNeeds: '', dietaryRequirements: [] as string[],
    requiresOneToOneSupport: false, prefersQuietSpaces: false,
    strugglesWithLargeGroups: false, communicationPreference: '',
    triggersOrThingsToAvoid: '',
  });
  const [participation, setParticipation] = useState({
    regularAttendee: false, canAttendWithoutPrebooking: false,
    typicalAvailability: '', transportSupportNeeded: false,
  });
  const [familyId, setFamilyId] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await familyApi.get('/students/me');
        setFamilyId(data.familyId || '');
        if (data.primaryGuardian) setGuardian({ ...guardian, ...data.primaryGuardian });
        if (data.child) setChild({ ...child, ...data.child });
        if (data.support) setSupport({ ...support, ...data.support });
        if (data.participation) setParticipation({ ...participation, ...data.participation });
      } catch {
        setError('Failed to load your profile. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDiet = (item: string) => {
    setSupport(p => ({
      ...p,
      dietaryRequirements: p.dietaryRequirements.includes(item)
        ? p.dietaryRequirements.filter(d => d !== item)
        : [...p.dietaryRequirements, item],
    }));
  };

  const handleSave = async () => {
    if (!guardian.name || !guardian.phoneNumber || !guardian.email) {
      setError('Guardian name, phone, and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await familyApi.put('/students/me', { primaryGuardian: guardian, child, support, participation });
      setSuccess('Profile updated successfully!');
      // Refresh localStorage display name
      const stored = localStorage.getItem('family');
      if (stored) {
        const f = JSON.parse(stored);
        localStorage.setItem('family', JSON.stringify({ ...f, guardianName: guardian.name }));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SECTIONS = [
    { label: '👤 Guardian', icon: '👤' },
    { label: '🧒 Child', icon: '🧒' },
    { label: '♿ Support', icon: '♿' },
    { label: '📋 Participation', icon: '📋' },
  ];

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading your profile…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 className="section-title" style={{ fontSize: '20px', marginBottom: '4px' }}>Edit Profile</h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          Family ID: <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{familyId}</span>
        </p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {SECTIONS.map((s, idx) => (
          <button key={idx} onClick={() => setActiveSection(idx)} style={{
            padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            border: `1px solid ${activeSection === idx ? 'var(--accent)' : 'var(--border)'}`,
            background: activeSection === idx ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
            color: activeSection === idx ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── SECTION 0: Guardian ─────────────────────────────────────────────── */}
      {activeSection === 0 && (
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Primary Guardian Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Full Name" required>
              <input style={inputStyle} value={guardian.name}
                onChange={e => setGuardian(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jane Smith" />
            </Field>
            <Field label="Relationship to Child" required>
              <select style={inputStyle} value={guardian.relationshipToChild}
                onChange={e => setGuardian(p => ({ ...p, relationshipToChild: e.target.value }))}>
                <option value="">Select…</option>
                {['Parent', 'Guardian', 'Foster Carer', 'Grandparent', 'Sibling', 'Other'].map(r => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone Number" required>
              <input style={inputStyle} type="tel" value={guardian.phoneNumber}
                onChange={e => setGuardian(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+44 7700 000000" />
            </Field>
            <Field label="Email Address" required>
              <input style={inputStyle} type="email" value={guardian.email}
                onChange={e => setGuardian(p => ({ ...p, email: e.target.value }))} placeholder="guardian@email.com" />
            </Field>
            <Field label="Preferred Contact Method">
              <select style={inputStyle} value={guardian.preferredContactMethod}
                onChange={e => setGuardian(p => ({ ...p, preferredContactMethod: e.target.value }))}>
                {['Phone', 'SMS', 'Email', 'WhatsApp'].map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Preferred Language">
              <input style={inputStyle} value={guardian.preferredLanguage}
                onChange={e => setGuardian(p => ({ ...p, preferredLanguage: e.target.value }))} placeholder="e.g. English" />
            </Field>
          </div>
          <div style={{ marginTop: '16px' }}>
            <Field label="Notes for Staff">
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                value={guardian.notesForStaff}
                onChange={e => setGuardian(p => ({ ...p, notesForStaff: e.target.value }))}
                placeholder="Any context for our team…" />
            </Field>
          </div>
        </div>
      )}

      {/* ── SECTION 1: Child ─────────────────────────────────────────────────── */}
      {activeSection === 1 && (
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Child Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="First Name" required>
              <input style={inputStyle} value={child.firstName}
                onChange={e => setChild(p => ({ ...p, firstName: e.target.value }))} placeholder="Alex" />
            </Field>
            <Field label="Last Name" required>
              <input style={inputStyle} value={child.lastName}
                onChange={e => setChild(p => ({ ...p, lastName: e.target.value }))} placeholder="Smith" />
            </Field>
            <Field label="Preferred Name">
              <input style={inputStyle} value={child.preferredName}
                onChange={e => setChild(p => ({ ...p, preferredName: e.target.value }))}
                placeholder="What they like to be called" />
            </Field>
            <Field label="Date of Birth" required>
              <input style={inputStyle} type="date" value={child.dateOfBirth}
                onChange={e => setChild(p => ({ ...p, dateOfBirth: e.target.value }))} />
            </Field>
            <Field label="Age Group">
              <select style={inputStyle} value={child.ageGroup}
                onChange={e => setChild(p => ({ ...p, ageGroup: e.target.value }))}>
                <option value="">Select…</option>
                {['Under 5', '5-7', '8-10', '10-12', '12-14', '14-16', '16+'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Gender">
              <select style={inputStyle} value={child.gender}
                onChange={e => setChild(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Select…</option>
                {['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="School">
              <input style={inputStyle} value={child.school}
                onChange={e => setChild(p => ({ ...p, school: e.target.value }))} placeholder="School name" />
            </Field>
          </div>
        </div>
      )}

      {/* ── SECTION 2: Support & Accessibility ───────────────────────────────── */}
      {activeSection === 2 && (
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h3 className="section-title" style={{ marginBottom: '4px' }}>Support & Accessibility</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Keeping these up-to-date helps our staff provide the right support.
          </p>

          {[
            { label: 'Mobility Support Required', key: 'mobilitySupportRequired' },
            { label: 'Visual Impairment', key: 'visualImpairment' },
            { label: 'Hearing Impairment', key: 'hearingImpairment' },
            { label: 'Neurodivergent Support Needed', key: 'neurodivergentSupport' },
            { label: 'Requires 1-to-1 Support', key: 'requiresOneToOneSupport' },
            { label: 'Prefers Quiet Spaces', key: 'prefersQuietSpaces' },
            { label: 'Struggles With Large Groups', key: 'strugglesWithLargeGroups' },
          ].map(({ label, key }) => (
            <Toggle key={key} label={label}
              checked={(support as any)[key]}
              onChange={() => setSupport(p => ({ ...p, [key]: !(p as any)[key] }))} />
          ))}

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Medical Needs">
              <input style={inputStyle} value={support.medicalNeeds}
                onChange={e => setSupport(p => ({ ...p, medicalNeeds: e.target.value }))}
                placeholder="e.g. Asthma – carries inhaler" />
            </Field>
            <Field label="Communication Preference">
              <select style={inputStyle} value={support.communicationPreference}
                onChange={e => setSupport(p => ({ ...p, communicationPreference: e.target.value }))}>
                <option value="">Select…</option>
                {['Visual', 'Verbal', 'Written', 'Makaton', 'AAC Device'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Triggers / Things to Avoid">
              <input style={inputStyle} value={support.triggersOrThingsToAvoid}
                onChange={e => setSupport(p => ({ ...p, triggersOrThingsToAvoid: e.target.value }))}
                placeholder="e.g. Loud sudden noises" />
            </Field>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Field label="Dietary Requirements">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {DIETARY_OPTIONS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDiet(d)}
                    className={`pill-btn ${support.dietaryRequirements.includes(d) ? 'selected' : ''}`}>
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Participation ──────────────────────────────────────────── */}
      {activeSection === 3 && (
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Participation Preferences</h3>
          {[
            { label: 'Regular Attendee', key: 'regularAttendee' },
            { label: 'Can Attend Without Pre-booking', key: 'canAttendWithoutPrebooking' },
            { label: 'Transport Support Needed', key: 'transportSupportNeeded' },
          ].map(({ label, key }) => (
            <Toggle key={key} label={label}
              checked={(participation as any)[key]}
              onChange={() => setParticipation(p => ({ ...p, [key]: !(p as any)[key] }))} />
          ))}
          <div style={{ marginTop: '20px' }}>
            <Field label="Typical Availability">
              <select style={inputStyle} value={participation.typicalAvailability}
                onChange={e => setParticipation(p => ({ ...p, typicalAvailability: e.target.value }))}>
                <option value="">Select…</option>
                {['Weekday mornings', 'Weekday afternoons', 'Evenings', 'Weekends', 'Flexible'].map(a => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          onClick={() => { setActiveSection(prev => Math.max(0, prev - 1)); }}
          disabled={activeSection === 0}
          style={{
            padding: '10px 24px', borderRadius: '10px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: activeSection === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '14px', opacity: activeSection === 0 ? 0.4 : 1,
          }}
        >
          ← Previous
        </button>
        {activeSection < 3 ? (
          <button onClick={() => setActiveSection(prev => prev + 1)} className="btn-primary" style={{ padding: '10px 24px' }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-approve"
            style={{ padding: '10px 28px', opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : '✓ Save All Changes'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FamilyEditProfile;
