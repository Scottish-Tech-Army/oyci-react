import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import axios from 'axios';

const AdminLogin = () => {
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await API.post('/auth/login', { emailId, password });

      if (data.role !== 'admin') {
        setError('Unauthorized: Contact an administrator to upgrade your account.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Admin Login Failed.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--bg-main)',
      overflow: 'hidden',
    }}>
      {/* ── Left: Branding Panel ─────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '64px 72px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        {/* OYCI Logo */}
        <img
          src="/oyci-logo.png"
          alt="OYCI"
          style={{
            height: '110px',
            width: 'auto',
            objectFit: 'contain',
            marginBottom: '40px',
            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.35)) brightness(1.08)',
          }}
        />

        <h1 style={{
          color: '#fff',
          fontSize: 'clamp(28px, 3vw, 42px)',
          fontWeight: 900,
          margin: '0 0 16px',
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
          maxWidth: '480px',
        }}>
          OYCI Admin<br />
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>Management Portal</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '16px',
          lineHeight: 1.7,
          maxWidth: '420px',
          margin: '0 0 48px',
        }}>
          A centralized platform for managing staff, children, sessions, and operations across the Youth Ochilis organization.
        </p>

        {/* Feature pills */}
        {[
          { icon: '👥', text: 'Staff & Volunteer Management' },
          { icon: '🧒', text: 'Student & Family Profiles' },
          { icon: '📅', text: 'Session Scheduling & Attendance' },
          { icon: '💸', text: 'Integrated Payroll Tracking' },
        ].map(item => (
          <div key={item.text} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '14px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '14px', fontWeight: 600,
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
            }}>{item.icon}</span>
            {item.text}
          </div>
        ))}

        {/* Bottom note */}
        <div style={{
          position: 'absolute', bottom: '32px', left: '72px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em' }}>
            RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
          </span>
        </div>
      </div>

      {/* ── Right: Login Form ─────────────────────────────────────── */}
      <div style={{
        width: '480px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 56px',
        background: 'var(--bg-main)',
        position: 'relative',
      }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: '28px', left: '28px',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
          }}
        >
          ← Back
        </button>

        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Shield icon */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
          }}>
            🛡️
          </div>

          <h2 style={{
            margin: '0 0 6px',
            fontSize: '26px', fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
          }}>
            Admin Sign In
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Enter your credentials to access the admin portal.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="emailId">Admin Email</label>
              <input
                id="emailId"
                type="email"
                className="form-input"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                placeholder="admin@wishaw.com"
                required
                style={{ fontSize: '14px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Security Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ fontSize: '14px' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 700,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Authenticating...' : '🔓 Gain Access'}
            </button>
          </form>

          <p style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            fontSize: '12px', color: 'var(--text-secondary)',
            textAlign: 'center', lineHeight: 1.6,
          }}>
            This portal is restricted to authorized admins only.<br />
            If you're having trouble, contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
