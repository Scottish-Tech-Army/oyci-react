import React, { useState } from 'react';
import API from '../../services/api';

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</span>
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider" />
    </label>
  </div>
);

const DIETARY_OPTIONS = ['Nut-free', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Dairy-free'];

const AdminStudentOnboardingModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [activeTab, setActiveTab] = useState<'Guardian' | 'Child' | 'Support' | 'Participation'>('Guardian');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [guardian, setGuardian] = useState({
    name: '', relationshipToChild: '', preferredContactMethod: 'Phone',
    phoneNumber: '', email: '', preferredLanguage: 'English', notesForStaff: '',
  });
  const [password, setPassword] = useState('');
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

  const toggleDiet = (item: string) => {
    setSupport(p => ({
      ...p,
      dietaryRequirements: p.dietaryRequirements.includes(item)
        ? p.dietaryRequirements.filter(d => d !== item)
        : [...p.dietaryRequirements, item],
    }));
  };

  const validate = () => {
    if (!guardian.name || !guardian.phoneNumber || !guardian.email) return 'Guardian Name, Phone, and Email are required.';
    if (!password || password.length < 6) return 'Password must be at least 6 characters.';
    if (!child.firstName || !child.lastName || !child.dateOfBirth) return 'Child First Name, Last Name, and DOB are required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        primaryGuardian: guardian,
        password,
        child,
        support,
        participation,
        consent: { dataConsentAccepted: true, safeguardingConsentAccepted: true },
        referralSource: 'Admin Onboarding'
      };
      await API.post('/students', payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to onboard student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>🧒 Onboard New Student</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
          {['Guardian', 'Child', 'Support', 'Participation'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: activeTab === tab ? 'var(--accent)' : 'var(--bg-card)',
              color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
              border: activeTab === tab ? 'none' : '1px solid var(--border)',
              cursor: 'pointer'
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}
          
          <form id="onboard-form" onSubmit={handleSubmit}>
            {activeTab === 'Guardian' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Full Name" required>
                  <input style={inputStyle} value={guardian.name} onChange={e => setGuardian({ ...guardian, name: e.target.value })} placeholder="Jane Doe" />
                </Field>
                <Field label="Relationship to Child" required>
                  <select style={inputStyle} value={guardian.relationshipToChild} onChange={e => setGuardian({ ...guardian, relationshipToChild: e.target.value })}>
                    <option value="">Select...</option>
                    {['Parent', 'Guardian', 'Foster Carer', 'Grandparent', 'Sibling', 'Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Phone Number" required>
                  <input style={inputStyle} type="tel" value={guardian.phoneNumber} onChange={e => setGuardian({ ...guardian, phoneNumber: e.target.value })} placeholder="07000 000000" />
                </Field>
                <Field label="Email Address" required>
                  <input style={inputStyle} type="email" value={guardian.email} onChange={e => setGuardian({ ...guardian, email: e.target.value })} placeholder="jane@example.com" />
                </Field>
                <Field label="Preferred Contact Method">
                  <select style={inputStyle} value={guardian.preferredContactMethod} onChange={e => setGuardian({ ...guardian, preferredContactMethod: e.target.value })}>
                    {['Phone', 'SMS', 'Email', 'WhatsApp'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Preferred Language">
                  <input style={inputStyle} value={guardian.preferredLanguage} onChange={e => setGuardian({ ...guardian, preferredLanguage: e.target.value })} placeholder="e.g. English" />
                </Field>
                <div style={{ gridColumn: 'span 2' }}>
                  <Field label="Notes for Staff">
                    <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={guardian.notesForStaff} onChange={e => setGuardian({ ...guardian, notesForStaff: e.target.value })} placeholder="Any relevant context for our staff..." />
                  </Field>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '12px', padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Initial Family Portal Password (Required)</p>
                  <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
                </div>
              </div>
            )}

            {activeTab === 'Child' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="First Name" required>
                  <input style={inputStyle} value={child.firstName} onChange={e => setChild({ ...child, firstName: e.target.value })} />
                </Field>
                <Field label="Last Name" required>
                  <input style={inputStyle} value={child.lastName} onChange={e => setChild({ ...child, lastName: e.target.value })} />
                </Field>
                <Field label="Preferred Name">
                  <input style={inputStyle} value={child.preferredName} onChange={e => setChild({ ...child, preferredName: e.target.value })} placeholder="What they like to be called" />
                </Field>
                <Field label="Date of Birth" required>
                  <input style={inputStyle} type="date" value={child.dateOfBirth} onChange={e => setChild({ ...child, dateOfBirth: e.target.value })} />
                </Field>
                <Field label="Age Group">
                  <select style={inputStyle} value={child.ageGroup} onChange={e => setChild({ ...child, ageGroup: e.target.value })}>
                    <option value="">Select...</option>
                    {['Under 5', '5-7', '8-10', '10-12', '12-14', '14-16', '16+'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Gender">
                  <select style={inputStyle} value={child.gender} onChange={e => setChild({ ...child, gender: e.target.value })}>
                    <option value="">Select...</option>
                    {['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="School">
                  <input style={inputStyle} value={child.school} onChange={e => setChild({ ...child, school: e.target.value })} placeholder="School name" />
                </Field>
              </div>
            )}

            {activeTab === 'Support' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>Keeping these up-to-date helps our staff provide the right support.</p>
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

                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Medical Needs">
                    <input style={inputStyle} value={support.medicalNeeds} onChange={e => setSupport({ ...support, medicalNeeds: e.target.value })} placeholder="e.g. Asthma - inhaler" />
                  </Field>
                  <Field label="Communication Preference">
                    <select style={inputStyle} value={support.communicationPreference} onChange={e => setSupport({ ...support, communicationPreference: e.target.value })}>
                      <option value="">Select...</option>
                      {['Visual', 'Verbal', 'Written', 'Makaton', 'AAC Device'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Triggers / Things to Avoid">
                      <input style={inputStyle} value={support.triggersOrThingsToAvoid} onChange={e => setSupport({ ...support, triggersOrThingsToAvoid: e.target.value })} placeholder="e.g. Loud sudden noises" />
                    </Field>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Dietary Requirements">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {DIETARY_OPTIONS.map(d => (
                          <button key={d} type="button" onClick={() => toggleDiet(d)}
                            style={{
                              padding: '6px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer',
                              background: support.dietaryRequirements.includes(d) ? 'var(--accent)' : 'var(--bg-input)',
                              color: support.dietaryRequirements.includes(d) ? '#fff' : 'var(--text-secondary)'
                            }}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Participation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>Typical attendance availability and transport support.</p>
                {[
                  { label: 'Regular Attendee', key: 'regularAttendee' },
                  { label: 'Can Attend Without Pre-booking', key: 'canAttendWithoutPrebooking' },
                  { label: 'Transport Support Needed', key: 'transportSupportNeeded' },
                ].map(({ label, key }) => (
                  <Toggle key={key} label={label}
                    checked={(participation as any)[key]}
                    onChange={() => setParticipation(p => ({ ...p, [key]: !(p as any)[key] }))} />
                ))}
                
                <div style={{ marginTop: '16px' }}>
                  <Field label="Typical Availability">
                    <select style={inputStyle} value={participation.typicalAvailability} onChange={e => setParticipation(p => ({ ...p, typicalAvailability: e.target.value }))}>
                      <option value="">Select...</option>
                      {['Weekday mornings', 'Weekday afternoons', 'Evenings', 'Weekends', 'Flexible'].map(a => <option key={a}>{a}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button type="submit" form="onboard-form" disabled={isSubmitting} style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Saving...' : '💾 Save Student'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminStudentOnboardingModal;