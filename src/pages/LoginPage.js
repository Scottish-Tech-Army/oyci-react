import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/api';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data);
      const role = res.data.role;
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'STAFF') navigate('/staff');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div className="auth-logo">Ochil Youths</div>
        <div className="auth-sub">Sign in to your account</div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              name="username"
              value={form.username}
              onChange={handle}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handle}
              placeholder="Enter your password"
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          New student?{' '}
          <span onClick={() => navigate('/register')}>Create an account</span>
        </div>

        {/* < div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--ink-mid)' }}>Demo accounts</strong><br />
          Admin: <code>admin</code> / <code>admin123</code><br />
          Staff: <code>sarah.m</code> / <code>staff123</code><br />
          Student: <code>alex.young</code> / <code>student123</code>
        </div> */}
      </div>
    </div>
  );
}
