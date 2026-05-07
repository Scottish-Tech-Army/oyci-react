import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const FamilyLoginPage = () => {
  const navigate = useNavigate();
  const [familyId, setFamilyId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !password) {
      setError('Please enter your Family ID and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/students/login', {
        familyId: familyId.toUpperCase(),
        password,
      });
      localStorage.setItem('familyToken', data.token);
      localStorage.setItem('family', JSON.stringify(data.family));
      navigate('/family/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
        background: 'linear-gradient(145deg, #be185d 0%, #9333ea 50%, #7c3aed 100%)',
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
          OYCI<br />
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>Family Portal</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '16px',
          lineHeight: 1.7,
          maxWidth: '420px',
          margin: '0 0 48px',
        }}>
          Stay connected with your child's participation in the Youth Ochilis Community Program. View profiles, upcoming sessions, and important details — all in one place.
        </p>

        {/* Feature pills */}
        {[
          { icon: '🧒', text: "View Your Child's Full Profile" },
          { icon: '📅', text: 'Browse Upcoming Sessions & Events' },
          { icon: '✏️', text: 'Update Medical & Contact Details' },
          { icon: '🔔', text: 'Stay Informed on Program Activities' },
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
            SECURE FAMILY ACCESS — YOUTH OCHILIS COMMUNITY PROGRAM
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
          {/* Family icon */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', marginBottom: '28px',
            boxShadow: '0 8px 24px rgba(236,72,153,0.3)',
          }}>
            👨‍👩‍👧
          </div>

          <h2 style={{
            margin: '0 0 6px',
            fontSize: '26px', fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
          }}>
            Guardian Sign In
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Enter your Family ID and password to access your family portal.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="familyId">Family ID</label>
              <input
                id="familyId"
                type="text"
                className="form-input"
                value={familyId}
                onChange={e => setFamilyId(e.target.value.toUpperCase())}
                placeholder="e.g. FAM-00001"
                required
                style={{ fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '14px' }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Provided in your confirmation email after registration
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="familyPassword">Password</label>
              <input
                id="familyPassword"
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ fontSize: '14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                marginTop: '8px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 700,
                background: loading ? undefined : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing In…' : '🔓 Sign In to Family Portal'}
            </button>
          </form>

          <p style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            fontSize: '12px', color: 'var(--text-secondary)',
            textAlign: 'center', lineHeight: 1.6,
          }}>
            Your Family ID was sent when your child was registered.<br />
            Need help? Contact the program administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FamilyLoginPage;
