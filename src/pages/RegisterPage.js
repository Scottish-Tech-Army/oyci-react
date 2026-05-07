import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerStudent } from '../services/api';

const ALL_SKILLS = [
  'Youth Work', 'First Aid', 'Sports Coaching', 'Music',
  'Arts & Crafts', 'Mentoring', 'Leadership', 'STEM',
  'Outdoor Education', 'Drama', 'Cooking', 'Photography'
];

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', skills: [], specialNeeds: false, name: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const toggleSkill = (skill) => setForm(f => ({
    ...f, skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill]
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await registerStudent({
        username: form.username, password: form.password,
        skills: form.skills, specialNeeds: form.specialNeeds,
        name: form.name, email: form.email
      });
      loginUser(res.data);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-up" style={{ maxWidth: 500 }}>
        <div className="auth-logo">Join OYCI</div>
        <div className="auth-sub">Create your student account</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="name" value={form.name} onChange={handle} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handle} placeholder="your@email.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="form-input" name="username" value={form.username} onChange={handle} placeholder="Choose a username" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" name="password" value={form.password} onChange={handle} placeholder="Password" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password *</label>
              <input className="form-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} placeholder="Confirm" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Your interests / skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {ALL_SKILLS.map(skill => (
                <button key={skill} type="button" onClick={() => toggleSkill(skill)} className="badge"
                  style={{ cursor: 'pointer', background: form.skills.includes(skill) ? 'var(--forest)' : 'var(--cream-dark)', color: form.skills.includes(skill) ? 'white' : 'var(--ink-soft)', padding: '5px 12px', fontSize: 12, border: 'none', transition: 'all 0.12s' }}>
                  {skill}
                </button>
              ))}
            </div>
            {form.skills.length > 0 && <div style={{ fontSize: 12, color: 'var(--good)', marginTop: 6 }}>{form.skills.length} skill{form.skills.length > 1 ? 's' : ''} selected</div>}
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.specialNeeds} onChange={e => setForm(f => ({ ...f, specialNeeds: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--forest)' }} />
              <span>
                <strong>I have Special Needs</strong>
                <span style={{ color: 'var(--ink-ghost)', marginLeft: 6, fontSize: 12 }}>— a dedicated support staff member will be assigned to help you</span>
              </span>
            </label>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account?{' '}<span onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
