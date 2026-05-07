import { useState, useEffect } from 'react';
import API from '../../services/api';
import AdminStudentOnboardingModal from './AdminStudentOnboardingModal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StudentRecord {
  _id: string;
  familyId: string;
  studentStatus: 'Active' | 'Inactive';
  primaryGuardian: {
    name: string;
    relationshipToChild: string;
    phoneNumber: string;
    email: string;
    preferredContactMethod: string;
    preferredLanguage: string;
    notesForStaff?: string;
  };
  additionalGuardians?: {
    name: string;
    relationshipToChild: string;
    phoneNumber?: string;
    email?: string;
    emergencyContact?: boolean;
  }[];
  child: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    dateOfBirth?: string;
    ageGroup?: string;
    gender?: string;
    school?: string;
  };
  support?: {
    mobilitySupportRequired?: boolean;
    visualImpairment?: boolean;
    hearingImpairment?: boolean;
    neurodivergentSupport?: boolean;
    requiresOneToOneSupport?: boolean;
    prefersQuietSpaces?: boolean;
    strugglesWithLargeGroups?: boolean;
    medicalNeeds?: string;
    dietaryRequirements?: string[];
    communicationPreference?: string;
    triggersOrThingsToAvoid?: string;
  };
  participation?: {
    regularAttendee?: boolean;
    canAttendWithoutPrebooking?: boolean;
    transportSupportNeeded?: boolean;
    typicalAvailability?: string;
  };
  referralSource?: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const Badge = ({ label, color }: { label: string; color: string }) => (
  <span style={{
    padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
    background: `${color}22`, color, border: `1px solid ${color}44`, whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

const InfoRow = ({ label, value }: { label: string; value?: string | boolean | null }) => {
  if (value === undefined || value === null || value === '' || value === false) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '160px', paddingTop: '1px' }}>
        {label}
      </span>
      <span style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {value === true ? '✅ Yes' : String(value)}
      </span>
    </div>
  );
};

const CollapsibleCard = ({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="admin-table-card" style={{ overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '16px 20px', background: isOpen ? 'var(--bg-input)' : 'var(--bg-card)', 
          border: 'none', borderBottom: isOpen ? '1px solid var(--border)' : 'none', 
          cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s'
        }}
      >
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </h4>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: '20px 24px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const AdminStudentManagement = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [eventFilterMode, setEventFilterMode] = useState<'All' | 'Previous Week' | 'This Week' | 'Upcoming Week' | 'Custom'>('This Week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [onboardingEventId, setOnboardingEventId] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const fetchAll = async () => {
    try {
      const [studentsRes, eventsRes] = await Promise.all([
        API.get('/students'),
        API.get('/events')
      ]);
      setStudents(studentsRes.data);
      setEvents(eventsRes.data);
      const sorted = studentsRes.data.sort((a: any, b: any) => 
        a.child.firstName.localeCompare(b.child.firstName)
      );
      setFiltered(sorted);
      if (sorted.length > 0) setSelected(sorted[0]);
    } catch {
      setError('Failed to load data. Make sure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  };

  const isStudentOnboarded = (event: any): boolean => {
    if (!selected) return false;
    return (event.registeredFamilies || []).some(
      (id: any) => id.toString() === selected.familyId || id.toString() === selected._id
    );
  };

  const handleOnboard = async (eventId: string) => {
    if (!selected) return;
    setOnboardingEventId(eventId);
    try {
      await API.post(`/events/${eventId}/onboard`, { familyId: selected.familyId });
      const { data } = await API.get('/events');
      setEvents(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to onboard student');
    } finally {
      setOnboardingEventId(null);
    }
  };

  const handleRemoveOnboard = async (eventId: string) => {
    if (!selected) return;
    setOnboardingEventId(eventId);
    try {
      await API.delete(`/events/${eventId}/onboard`, { data: { familyId: selected.familyId } });
      const { data } = await API.get('/events');
      setEvents(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove student');
    } finally {
      setOnboardingEventId(null);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    const results = students.filter(s => {
      const name = `${s.child.firstName} ${s.child.lastName}`.toLowerCase();
      const guardian = s.primaryGuardian.name.toLowerCase();
      const fid = s.familyId.toLowerCase();
      const matchesSearch = !q || name.includes(q) || guardian.includes(q) || fid.includes(q);
      const matchesStatus = statusFilter === 'All' || s.studentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a: any, b: any) => a.child.firstName.localeCompare(b.child.firstName));
    setFiltered(results);
  }, [search, statusFilter, students]);

  const supportFlags = (s: StudentRecord) => {
    const flags: string[] = [];
    if (s.support?.mobilitySupportRequired) flags.push('Mobility');
    if (s.support?.visualImpairment) flags.push('Visual');
    if (s.support?.hearingImpairment) flags.push('Hearing');
    if (s.support?.neurodivergentSupport) flags.push('Neurodivergent');
    if (s.support?.requiresOneToOneSupport) flags.push('1-to-1');
    if (s.support?.prefersQuietSpaces) flags.push('Quiet Spaces');
    if (s.support?.strugglesWithLargeGroups) flags.push('Large Groups');
    return flags;
  };

  const age = (dob?: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365))} yrs`;
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>

      {/* ── Left: List panel ────────────────────────────────────────────────── */}
      <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Header Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Student Directory</h3>
          <button onClick={() => setShowOnboardingModal(true)} style={{
            background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px',
            borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(99,102,241,0.3)'
          }}>
            + New Student
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Total', value: students.length, color: 'var(--accent)' },
            { label: 'Active', value: students.filter(s => s.studentStatus === 'Active').length, color: '#22c55e' },
            { label: 'Inactive', value: students.filter(s => s.studentStatus === 'Inactive').length, color: '#6b7280' },
          ].map(s => (
            <div key={s.label} className="admin-table-card" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, guardian, ID…"
            style={{
              flex: 1, padding: '9px 14px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-input)',
              color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
            }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            style={{
              padding: '9px 12px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-input)',
              color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
            }}
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Student cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: 'calc(100vh - 310px)' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>Loading students…</p>
          ) : filtered.length === 0 ? (
            <div className="admin-table-card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '32px' }}>🔍</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>No students found</p>
            </div>
          ) : filtered.map(s => {
            const flags = supportFlags(s);
            const isSelected = selected?._id === s._id;
            return (
              <div
                key={s._id}
                onClick={() => setSelected(isSelected ? null : s)}
                className="admin-table-card"
                style={{
                  padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                      {s.child.firstName} {s.child.lastName}
                      {s.child.preferredName && (
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '13px' }}> "{s.child.preferredName}"</span>
                      )}
                    </p>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {s.child.ageGroup && <span>{s.child.ageGroup}</span>}
                      {s.child.dateOfBirth && <span> · {age(s.child.dateOfBirth)}</span>}
                      {s.child.school && <span> · {s.child.school}</span>}
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      👤 {s.primaryGuardian.name} · {s.primaryGuardian.phoneNumber}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <Badge label={s.studentStatus} color={s.studentStatus === 'Active' ? '#22c55e' : '#6b7280'} />
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{s.familyId}</span>
                  </div>
                </div>
                {flags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {flags.map(f => <Badge key={f} label={f} color="#f59e0b" />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Detail panel ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        {!selected ? (
          <div className="admin-table-card" style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
            <span style={{ fontSize: '56px' }}>🧒</span>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Select a Student</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '280px', lineHeight: 1.6 }}>
              Click any student from the list on the left to view their full details here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Top bar */}
            <div className="admin-table-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selected.child.firstName} {selected.child.lastName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>{selected.familyId}</span>
                  <Badge label={selected.studentStatus} color={selected.studentStatus === 'Active' ? '#22c55e' : '#6b7280'} />
                  {selected.referralSource && <Badge label={selected.referralSource} color="#6366f1" />}
                </div>
              </div>

            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Merged Student Profile Section */}
              <CollapsibleCard title="Student Profile Details" defaultOpen>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                  
                  {/* Child Details */}
                  <div>
                    <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Child Details</h5>
                    <InfoRow label="First Name" value={selected.child.firstName} />
                    <InfoRow label="Last Name" value={selected.child.lastName} />
                    <InfoRow label="Preferred Name" value={selected.child.preferredName} />
                    <InfoRow label="Date of Birth" value={selected.child.dateOfBirth ? new Date(selected.child.dateOfBirth).toLocaleDateString('en-GB') : undefined} />
                    <InfoRow label="Age" value={age(selected.child.dateOfBirth) ?? undefined} />
                    <InfoRow label="Age Group" value={selected.child.ageGroup} />
                    <InfoRow label="Gender" value={selected.child.gender} />
                    <InfoRow label="School" value={selected.child.school} />
                  </div>

                  {/* Primary Guardian */}
                  <div>
                    <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Primary Guardian</h5>
                    <InfoRow label="Full Name" value={selected.primaryGuardian.name} />
                    <InfoRow label="Relationship" value={selected.primaryGuardian.relationshipToChild} />
                    <InfoRow label="Phone" value={selected.primaryGuardian.phoneNumber} />
                    <InfoRow label="Email" value={selected.primaryGuardian.email} />
                    <InfoRow label="Contact Method" value={selected.primaryGuardian.preferredContactMethod} />
                    <InfoRow label="Language" value={selected.primaryGuardian.preferredLanguage} />
                    <InfoRow label="Staff Notes" value={selected.primaryGuardian.notesForStaff} />
                  </div>

                  {/* Support & Accessibility */}
                  <div>
                    <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Support & Accessibility</h5>
                    <InfoRow label="Mobility Support" value={selected.support?.mobilitySupportRequired} />
                    <InfoRow label="Visual Impairment" value={selected.support?.visualImpairment} />
                    <InfoRow label="Hearing Impairment" value={selected.support?.hearingImpairment} />
                    <InfoRow label="Neurodivergent" value={selected.support?.neurodivergentSupport} />
                    <InfoRow label="1-to-1 Support" value={selected.support?.requiresOneToOneSupport} />
                    <InfoRow label="Prefers Quiet Spaces" value={selected.support?.prefersQuietSpaces} />
                    <InfoRow label="Struggles w/ Large Groups" value={selected.support?.strugglesWithLargeGroups} />
                    <InfoRow label="Medical Needs" value={selected.support?.medicalNeeds} />
                    <InfoRow label="Communication Pref." value={selected.support?.communicationPreference} />
                    <InfoRow label="Triggers / Avoid" value={selected.support?.triggersOrThingsToAvoid} />
                    {selected.support?.dietaryRequirements && selected.support.dietaryRequirements.length > 0 && (
                      <div style={{ padding: '12px 0 0', marginTop: '12px', borderTop: '1px dashed var(--border)' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dietary Requirements</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {selected.support.dietaryRequirements.map(d => <Badge key={d} label={d} color="#8b5cf6" />)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Participation & Registration */}
                  <div>
                    <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Participation & Registration</h5>
                    <InfoRow label="Regular Attendee" value={selected.participation?.regularAttendee} />
                    <InfoRow label="No Pre-booking Needed" value={selected.participation?.canAttendWithoutPrebooking} />
                    <InfoRow label="Transport Support" value={selected.participation?.transportSupportNeeded} />
                    <InfoRow label="Typical Availability" value={selected.participation?.typicalAvailability} />
                    <InfoRow label="Referral Source" value={selected.referralSource} />
                    <InfoRow label="Registered On" value={selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-GB') : undefined} />
                  </div>

                </div>
              </CollapsibleCard>

              {/* Additional Guardian Section if applicable */}
              {selected.additionalGuardians && selected.additionalGuardians.length > 0 && (
                <CollapsibleCard title="Additional Guardian / Emergency Contact" defaultOpen>
                  {selected.additionalGuardians.map((ag, i) => (
                    <div key={i} style={{ marginBottom: i > 0 ? '16px' : '0', paddingTop: i > 0 ? '16px' : '0', borderTop: i > 0 ? '1px dashed var(--border)' : 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                      <InfoRow label="Name" value={ag.name} />
                      <InfoRow label="Relationship" value={ag.relationshipToChild} />
                      <InfoRow label="Phone" value={ag.phoneNumber} />
                      <InfoRow label="Email" value={ag.email} />
                      <div style={{ gridColumn: 'span 2' }}>
                        <InfoRow label="Emergency Contact" value={ag.emergencyContact} />
                      </div>
                    </div>
                  ))}
                </CollapsibleCard>
              )}

              {/* All Events Section */}
              <CollapsibleCard title="All Events" defaultOpen>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['All', 'Previous Week', 'This Week', 'Upcoming Week', 'Custom'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setEventFilterMode(mode as any)}
                          style={{
                            padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                            background: eventFilterMode === mode ? 'var(--accent)' : 'var(--bg-input)',
                            color: eventFilterMode === mode ? '#fff' : 'var(--text-secondary)',
                            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    {eventFilterMode === 'Custom' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-input)', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>From:</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '10px' }}>
                  {(() => {
                    // Date boundaries configuration
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    const startThisWeek = new Date();
                    const day = startThisWeek.getDay();
                    const diff = startThisWeek.getDate() - day + (day === 0 ? -6 : 1);
                    startThisWeek.setDate(diff);
                    startThisWeek.setHours(0, 0, 0, 0);

                    const endThisWeek = new Date(startThisWeek);
                    endThisWeek.setDate(startThisWeek.getDate() + 6);
                    endThisWeek.setHours(23, 59, 59, 999);

                    const startNextWeek = new Date(endThisWeek);
                    startNextWeek.setDate(startNextWeek.getDate() + 1);
                    startNextWeek.setHours(0, 0, 0, 0);
                    const endNextWeek = new Date(startNextWeek);
                    endNextWeek.setDate(startNextWeek.getDate() + 6);
                    endNextWeek.setHours(23, 59, 59, 999);

                    const startLastWeek = new Date(startThisWeek);
                    startLastWeek.setDate(startLastWeek.getDate() - 7);
                    startLastWeek.setHours(0, 0, 0, 0);
                    const endLastWeek = new Date(startLastWeek);
                    endLastWeek.setDate(startLastWeek.getDate() + 6);
                    endLastWeek.setHours(23, 59, 59, 999);

                    // Filter logic
                    const filteredEvents = events.filter(e => {
                      const dateStr = e.date || e.startDate;
                      if (!dateStr) return false;
                      const d = new Date(`${dateStr}T12:00:00`);

                      if (eventFilterMode === 'All') return true;
                      if (eventFilterMode === 'Previous Week') return d >= startLastWeek && d <= endLastWeek;
                      if (eventFilterMode === 'This Week') return d >= startThisWeek && d <= endThisWeek;
                      if (eventFilterMode === 'Upcoming Week') return d >= startNextWeek && d <= endNextWeek;
                      if (eventFilterMode === 'Custom') {
                        if (!customStartDate && !customEndDate) return true;
                        if (customStartDate && customEndDate) {
                          const cStart = new Date(`${customStartDate}T00:00:00`);
                          const cEnd = new Date(`${customEndDate}T23:59:59`);
                          return d >= cStart && d <= cEnd;
                        }
                        if (customStartDate) return d >= new Date(`${customStartDate}T00:00:00`);
                        if (customEndDate) return d <= new Date(`${customEndDate}T23:59:59`);
                      }
                      return true;
                    }).sort((a,b) => {
                      const d1 = new Date(`${b.date || b.startDate}T12:00:00`).getTime();
                      const d2 = new Date(`${a.date || a.startDate}T12:00:00`).getTime();
                      return d1 - d2;
                    });

                    if (filteredEvents.length === 0) {
                      return <p style={{ margin: 0, padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px dashed var(--border)' }}>
                        No events found matching this timeframe.
                      </p>;
                    }

                    return filteredEvents.map(e => {
                      const onboarded = isStudentOnboarded(e);
                      const isWorking = onboardingEventId === e._id;
                      return (
                        <div key={e._id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px',
                          background: onboarded ? 'rgba(34,197,94,0.05)' : 'var(--bg-input)',
                          border: `1px solid ${onboarded ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                          borderRadius: '10px',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{e.eventName}</h4>
                              {onboarded && (
                                <span style={{
                                  padding: '2px 8px', borderRadius: '99px', fontSize: '10px',
                                  fontWeight: 700, background: 'rgba(34,197,94,0.15)',
                                  color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)',
                                  whiteSpace: 'nowrap',
                                }}>
                                  ✓ Onboarded
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                              📍 {e.location} · {e.date} · {e.startTime} – {e.endTime}
                            </p>
                          </div>
                          <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                            {onboarded ? (
                              <button
                                onClick={() => handleRemoveOnboard(e._id)}
                                disabled={isWorking}
                                style={{
                                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                  border: '1px solid rgba(239,68,68,0.4)',
                                  background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                                  cursor: isWorking ? 'not-allowed' : 'pointer',
                                  opacity: isWorking ? 0.6 : 1,
                                }}
                              >
                                {isWorking ? '…' : '✕ Remove'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOnboard(e._id)}
                                disabled={isWorking}
                                style={{
                                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                  color: '#fff',
                                  cursor: isWorking ? 'not-allowed' : 'pointer',
                                  opacity: isWorking ? 0.6 : 1,
                                  boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                                }}
                              >
                                {isWorking ? '…' : '+ Onboard'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CollapsibleCard>

            </div>
          </div>
        )}
      </div>
      {/* Modals */}
      {showOnboardingModal && (
        <AdminStudentOnboardingModal
          onClose={() => setShowOnboardingModal(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
};

export default AdminStudentManagement;