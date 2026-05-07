import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS = ['Guardian', 'Child Details', 'Support & Access', 'Participation', 'Consent & Submit'];
const DIETARY_OPTIONS = ['Nut-free', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Dairy-free'];

// ── Module-level sub-components (MUST be outside main component to avoid focus loss) ──
const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const Field = ({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid var(--border)',
  }}>
    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{label}</span>
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider" />
    </label>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const StudentRegistration = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [guardian, setGuardian] = useState({
    name: '', relationshipToChild: '', preferredContactMethod: 'Phone',
    phoneNumber: '', email: '', preferredLanguage: 'English', notesForStaff: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [extraGuardian, setExtraGuardian] = useState({
    enabled: false, name: '', relationshipToChild: '',
    phoneNumber: '', email: '', emergencyContact: true,
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
  const [consent, setConsent] = useState({
    dataConsentAccepted: false, safeguardingConsentAccepted: false,
    photoConsent: false, emergencyMedicalConsent: false,
  });
  const [referralSource, setReferralSource] = useState('Self-Registration');

  // Helpers
  const toggleDiet = (item: string) => {
    setSupport(p => ({
      ...p,
      dietaryRequirements: p.dietaryRequirements.includes(item)
        ? p.dietaryRequirements.filter(d => d !== item)
        : [...p.dietaryRequirements, item],
    }));
  };

  const validateStep = (): boolean => {
    if (step === 0 && (!guardian.name || !guardian.relationshipToChild || !guardian.phoneNumber)) {
      setError('Name, relationship, and phone number are required for the primary guardian.');
      return false;
    }
    if (step === 0 && !guardian.email) {
      setError('Primary guardian email address is required — we will send a confirmation email.');
      return false;
    }
    if (step === 0 && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (step === 0 && password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (step === 1 && (!child.firstName || !child.lastName || !child.dateOfBirth)) {
      setError('First name, last name, and date of birth are required.');
      return false;
    }
    if (step === 4 && (!consent.dataConsentAccepted || !consent.safeguardingConsentAccepted)) {
      setError('You must accept the data and safeguarding consent to register.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        primaryGuardian: { ...guardian },
        password,
        additionalGuardians: extraGuardian.enabled
          ? [{
              name: extraGuardian.name,
              relationshipToChild: extraGuardian.relationshipToChild,
              phoneNumber: extraGuardian.phoneNumber,
              email: extraGuardian.email,
              emergencyContact: extraGuardian.emergencyContact,
            }]
          : [],
        child,
        support,
        participation,
        consent: {
          dataConsentAccepted: consent.dataConsentAccepted,
          safeguardingConsentAccepted: consent.safeguardingConsentAccepted,
          photoConsent: consent.photoConsent,
          emergencyMedicalConsent: consent.emergencyMedicalConsent,
          confidentialityRenewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2)
            .toISOString().split('T')[0],
        },
        referralSource,
      };
      const { data } = await API.post('/students', payload);
      // Store family details from registration response
    localStorage.setItem('familyToken', data.token);
    localStorage.setItem('family', JSON.stringify(data.family));
    setSuccess(`Registration successful! Your Family ID is: ${data.familyId}. Check your email for details.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="admin-table-card" style={{ maxWidth: '520px', textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 12px', fontSize: '26px', fontWeight: 800 }}>
            Registration Complete!
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px', margin: '0 0 24px' }}>
            {success}
          </p>
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/family/dashboard')} className="btn-primary" style={{ width: '100%' }}>
              🏠 Go to Family Portal
            </button>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', transition: 'background 0.3s' }}>
      {/* Top bar matching DashboardLayout */}
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px',
            borderRadius: '8px',
          }}>
            ← Back to Home
          </button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            🧒 Child Registration
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Youth Ochilis Community Program</span>
          <button
            onClick={toggleTheme}
            className="theme-toggle header-theme-toggle"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Page body */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', overflowX: 'auto', gap: 0 }}>
          {STEPS.map((label, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: idx < step ? '15px' : '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  background: idx < step ? '#22c55e' : idx === step ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg-input)',
                  border: idx < step || idx === step ? 'none' : '1px solid var(--border)',
                  boxShadow: idx === step ? '0 0 0 3px rgba(99,102,241,0.25)' : 'none',
                }}>
                  {idx < step ? '✓' : <span style={{ color: idx < step || idx === step ? '#fff' : 'var(--text-secondary)' }}>{idx + 1}</span>}
                </div>
                <span style={{
                  fontSize: '10px', whiteSpace: 'nowrap', fontWeight: idx === step ? 700 : 400,
                  color: idx === step ? 'var(--accent)' : idx < step ? '#22c55e' : 'var(--text-secondary)',
                }}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{
                  height: '2px', flex: 1,
                  background: idx < step ? '#22c55e' : 'var(--border)',
                  margin: '0 4px', marginBottom: '22px',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="admin-table-card" style={{ padding: '32px 28px' }}>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>⚠️ {error}</div>
          )}

          {/* ── STEP 0: Guardian ───────────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h3 className="section-title" style={{ marginBottom: '4px' }}>Primary Guardian Details</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Tell us about the main contact for this child.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Full Name" required>
                  <input style={inputStyle} value={guardian.name}
                    onChange={e => setGuardian(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Jane Smith" />
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
                    onChange={e => setGuardian(p => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="+44 7700 000000" />
                </Field>
                <Field label="Email Address" required>
                  <input style={inputStyle} type="email" value={guardian.email}
                    onChange={e => setGuardian(p => ({ ...p, email: e.target.value }))}
                    placeholder="guardian@email.com" />
                </Field>
                <Field label="Preferred Contact Method">
                  <select style={inputStyle} value={guardian.preferredContactMethod}
                    onChange={e => setGuardian(p => ({ ...p, preferredContactMethod: e.target.value }))}>
                    {['Phone', 'SMS', 'Email', 'WhatsApp'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Preferred Language">
                  <input style={inputStyle} value={guardian.preferredLanguage}
                    onChange={e => setGuardian(p => ({ ...p, preferredLanguage: e.target.value }))}
                    placeholder="e.g. English" />
                </Field>
              </div>
              <Field label="Notes for Staff (optional)">
                <textarea
                  style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                  value={guardian.notesForStaff}
                  onChange={e => setGuardian(p => ({ ...p, notesForStaff: e.target.value }))}
                  placeholder="Any relevant context for our staff…" />
              </Field>

              {/* Password fields */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Create a password to access the Family Portal after registration.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Field label="Password" required>
                    <input style={inputStyle} type="password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" />
                  </Field>
                  <Field label="Confirm Password" required>
                    <input style={inputStyle} type="password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password" />
                  </Field>
                </div>
              </div>

              <div>
                <Toggle
                  label="Add an additional guardian / emergency contact?"
                  checked={extraGuardian.enabled}
                  onChange={() => setExtraGuardian(p => ({ ...p, enabled: !p.enabled }))}
                />
                {extraGuardian.enabled && (
                  <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <Field label="Name">
                      <input style={inputStyle} value={extraGuardian.name}
                        onChange={e => setExtraGuardian(p => ({ ...p, name: e.target.value }))} />
                    </Field>
                    <Field label="Relationship">
                      <input style={inputStyle} value={extraGuardian.relationshipToChild}
                        onChange={e => setExtraGuardian(p => ({ ...p, relationshipToChild: e.target.value }))} />
                    </Field>
                    <Field label="Phone">
                      <input style={inputStyle} type="tel" value={extraGuardian.phoneNumber}
                        onChange={e => setExtraGuardian(p => ({ ...p, phoneNumber: e.target.value }))} />
                    </Field>
                    <Field label="Email">
                      <input style={inputStyle} type="email" value={extraGuardian.email}
                        onChange={e => setExtraGuardian(p => ({ ...p, email: e.target.value }))} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 1: Child Details ──────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="section-title">Child Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                <Field label="School (optional)">
                  <input style={inputStyle} value={child.school}
                    onChange={e => setChild(p => ({ ...p, school: e.target.value }))}
                    placeholder="School name" />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 2: Support & Accessibility ───────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h3 className="section-title">Support & Accessibility</h3>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Help us understand how to best support your child.
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
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Medical Needs">
                  <input style={inputStyle} value={support.medicalNeeds}
                    onChange={e => setSupport(p => ({ ...p, medicalNeeds: e.target.value }))}
                    placeholder="e.g. Asthma – inhaler" />
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
              <div style={{ marginTop: '8px' }}>
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

          {/* ── STEP 3: Participation ──────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h3 className="section-title">Participation Preferences</h3>
              {[
                { label: 'Regular Attendee', key: 'regularAttendee' },
                { label: 'Can Attend Without Pre-booking', key: 'canAttendWithoutPrebooking' },
                { label: 'Transport Support Needed', key: 'transportSupportNeeded' },
              ].map(({ label, key }) => (
                <Toggle key={key} label={label}
                  checked={(participation as any)[key]}
                  onChange={() => setParticipation(p => ({ ...p, [key]: !(p as any)[key] }))} />
              ))}
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Typical Availability">
                  <select style={inputStyle} value={participation.typicalAvailability}
                    onChange={e => setParticipation(p => ({ ...p, typicalAvailability: e.target.value }))}>
                    <option value="">Select…</option>
                    {['Weekday mornings', 'Weekday afternoons', 'Evenings', 'Weekends', 'Flexible'].map(a => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <Field label="How did you hear about us?">
                  <select style={inputStyle} value={referralSource}
                    onChange={e => setReferralSource(e.target.value)}>
                    {['School', 'Social Media', 'Word of Mouth', 'NHS / GP Referral', 'Social Worker', 'Self-Registration', 'Other'].map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 4: Consent ────────────────────────────────────────────── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 className="section-title">Consent & Safeguarding</h3>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Please review and confirm your consent below. Items marked <span style={{ color: '#ef4444' }}>*</span> are required.
              </p>
              {[
                { label: '* I consent to my data being stored and processed for program purposes.', key: 'dataConsentAccepted' },
                { label: '* I agree to the safeguarding policy and consent to staff acting in the best interest of the child.', key: 'safeguardingConsentAccepted' },
                { label: 'I consent for my child to be photographed or filmed at program events.', key: 'photoConsent' },
                { label: 'I consent to staff seeking emergency medical treatment if needed.', key: 'emergencyMedicalConsent' },
              ].map(({ label, key }) => (
                <label key={key} style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px 16px',
                  background: (consent as any)[key] ? 'rgba(34,197,94,0.08)' : 'var(--bg-input)',
                  border: `1px solid ${(consent as any)[key] ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                  borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <input type="checkbox" checked={(consent as any)[key]}
                    onChange={() => setConsent(p => ({ ...p, [key]: !(p as any)[key] }))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', flexShrink: 0, marginTop: '2px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{label}</span>
                </label>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={step === 0 ? () => navigate('/') : handleBack}
              className="btn-secondary"
              style={{ padding: '10px 24px' }}
            >
              {step === 0 ? 'Cancel' : '← Back'}
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} className="btn-primary" style={{ padding: '10px 28px' }}>
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-approve"
                style={{ padding: '10px 28px', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'Registering…' : '✓ Complete Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;
