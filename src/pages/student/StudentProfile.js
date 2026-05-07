import React, { useEffect, useState, useCallback } from 'react';
import { getMyStudentProfile, updateMySkills } from '../../services/api';

const ALL_SKILLS = [
  'Youth Work','First Aid','Sports Coaching','Music','Arts & Crafts',
  'Mentoring','Leadership','STEM','Outdoor Education','Drama','Cooking','Photography'
];

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getMyStudentProfile();
    setProfile(r.data);
    setSkills(r.data.skills || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSkill = sk => setSkills(s => s.includes(sk) ? s.filter(x => x !== sk) : [...s, sk]);

  const save = async () => {
    setSaving(true);
    try {
      await updateMySkills({ skills });
      setMsg('Skills updated!');
      setEditing(false);
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <div className="card-header">
          <span className="card-title">My Profile</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Username:</strong> {profile.username}</div>
            {profile.name && <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Name:</strong> {profile.name}</div>}
            {profile.email && <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Email:</strong> {profile.email}</div>}
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>Special Needs:</strong>{' '}
              {profile.specialNeeds ? <span style={{ color: 'var(--info)' }}>♿ Yes — dedicated support assigned</span> : 'No'}
            </div>
            <div style={{ fontSize: 13, marginBottom: 8 }}><strong>Completed events:</strong> {profile.completedEventIds?.length || 0}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--forest)' }}>Skills & Interests</div>
            {!editing ? (
              <>
                <div className="skills-list" style={{ marginBottom: 12 }}>
                  {profile.skills?.length > 0
                    ? profile.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>)
                    : <span style={{ color: 'var(--ink-ghost)', fontSize: 13 }}>No skills added yet</span>}
                </div>
                <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit skills</button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {ALL_SKILLS.map(sk => (
                    <button key={sk} type="button" onClick={() => toggleSkill(sk)} className="badge"
                      style={{ cursor: 'pointer', border: 'none', background: skills.includes(sk) ? 'var(--forest)' : 'var(--cream-dark)', color: skills.includes(sk) ? 'white' : 'var(--ink-soft)', padding: '5px 12px', fontSize: 12, transition: 'all 0.12s' }}>
                      {sk}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save skills'}</button>
                  <button className="btn" onClick={() => { setEditing(false); setSkills(profile.skills || []); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
