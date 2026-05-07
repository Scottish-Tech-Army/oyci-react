import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.3s ease',
    }}>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 50,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '50%', width: '40px', height: '40px',
        cursor: 'pointer', fontSize: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)', color: 'var(--text-primary)',
      }} aria-label="Toggle theme">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* ── TOP HERO BANNER ── */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1b69 40%, #0e3a5c 100%)',
        padding: '48px 24px 56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-40px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(236,72,153,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)', pointerEvents: 'none' }} />

        {/* OYCI Logo */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '24px' }}>
          <img
            src="/oyci-logo.png"
            alt="OYCI — Ochil Youths Community Improvement"
            style={{
              height: '130px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.45))',
            }}
          />
        </div>

        {/* Tagline */}
        <h1 style={{
          position: 'relative', zIndex: 2,
          fontFamily: "'Inter', sans-serif",
          fontSize: 'clamp(20px, 3.5vw, 32px)',
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          margin: '0 0 12px',
          letterSpacing: '-0.3px',
          lineHeight: 1.25,
          maxWidth: '600px',
        }}>
          Empowering Young People &amp;{' '}
          <span style={{ background: 'linear-gradient(90deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Building Communities
          </span>
        </h1>

        <p style={{
          position: 'relative', zIndex: 2,
          fontSize: '15px',
          color: 'rgba(255,255,255,0.72)',
          textAlign: 'center',
          margin: '0 0 28px',
          maxWidth: '500px',
          lineHeight: 1.7,
        }}>
          Ochil Youths Community Improvement (OYCI) is dedicated to inspiring young people through
          meaningful sessions, mentorship, and community engagement across Scotland.
        </p>

        {/* Website + Facebook links */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="https://www.oyci.org.uk/ook"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '99px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', textDecoration: 'none',
              fontSize: '13px', fontWeight: 700,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.12)'; }}
          >
            🌐 Visit Our Website
          </a>

          <a
            href="https://www.facebook.com/OYCIchange/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '99px',
              background: 'rgba(24,119,242,0.25)',
              border: '1px solid rgba(24,119,242,0.5)',
              color: '#fff', textDecoration: 'none',
              fontSize: '13px', fontWeight: 700,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(24,119,242,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(24,119,242,0.25)'; }}
          >
            {/* Facebook 'f' icon via SVG */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M22 12a10 10 0 1 0-11.563 9.879v-6.99H7.9V12h2.537V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989A10.002 10.002 0 0 0 22 12z"/></svg>
            Follow on Facebook
          </a>
        </div>
      </div>

      {/* ── PORTAL SELECTION ── */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        position: 'relative',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent)', pointerEvents: 'none' }} />

        <p style={{
          fontSize: '11px', fontWeight: 800,
          color: 'var(--text-secondary)', textTransform: 'uppercase',
          letterSpacing: '0.15em', margin: '0 0 28px', opacity: 0.7,
        }}>
          Please select your portal
        </p>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px', width: '100%', maxWidth: '560px',
        }}>
          {/* Admin card */}
          <button
            id="admin-login-btn"
            onClick={() => navigate('/admin/login')}
            style={{
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: '20px', padding: '36px 24px',
              cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.25s ease', color: 'inherit',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'rgba(99,102,241,0.6)';
              el.style.transform = 'translateY(-5px)';
              el.style.boxShadow = '0 16px 40px rgba(99,102,241,0.18)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'var(--border)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
            }}>🛡️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Admin Login
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Manage staff, students, sessions, attendance &amp; payroll operations.
            </p>
            <div style={{ marginTop: '22px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>
              Sign In →
            </div>
          </button>

          {/* Guardian card */}
          <button
            id="guardian-login-btn"
            onClick={() => navigate('/family/login')}
            style={{
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: '20px', padding: '36px 24px',
              cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.25s ease', color: 'inherit',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'rgba(236,72,153,0.55)';
              el.style.transform = 'translateY(-5px)';
              el.style.boxShadow = '0 16px 40px rgba(236,72,153,0.16)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'var(--border)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg,#ec4899,#8b5cf6)',
              boxShadow: '0 6px 20px rgba(236,72,153,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
            }}>👨‍👩‍👧</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Guardian Login
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              View your child's sessions, attendance, upcoming events &amp; profile.
            </p>
            <div style={{ marginTop: '22px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#ec4899' }}>
              Sign In →
            </div>
          </button>
        </div>

        {/* Footer info strip */}
        <div style={{
          marginTop: '48px',
          display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center',
          fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600,
        }}>
          <span>🏡 Serving Clackmannanshire &amp; beyond</span>
          <span>·</span>
          <span>🧒 Youth-led community programmes</span>
          <span>·</span>
          <span>🌱 Est. for a brighter future</span>
        </div>
        <p style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5 }}>
          © {new Date().getFullYear()} Ochil Youths Community Improvement (OYCI) · Charity Portal
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
