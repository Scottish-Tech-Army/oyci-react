import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { familyApi } from '../services/api';
import axios from 'axios';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#0ea5e9', '#ef4444'];
const ATT_COLORS: Record<string, string> = {
  PRESENT:    '#10b981',
  ABSENT:     '#ef4444',
  LATE:       '#f59e0b',
  NOT_MARKED: '#6b7280',
};

const FamilyDashboardHome = () => {
  const navigate = useNavigate();
  const familyStr = localStorage.getItem('family');
  const family = familyStr ? JSON.parse(familyStr) : null;
  const myFamilyId = family?.familyId || '';

  const [events,     setEvents    ] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading,    setLoading   ] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [evRes, attRes] = await Promise.all([
          familyApi.get('/events/family'),
          axios.get(`http://localhost:5001/api/attendance/family/${myFamilyId}`),
        ]);
        const onboarded = evRes.data.filter((e: any) =>
          (e.registeredFamilies || []).some((id: string) => id.toString() === myFamilyId)
        );
        setEvents(onboarded);
        setAttendance(attRes.data || []);
      } catch {
        try {
          const r = await familyApi.get('/events/family');
          const onboarded = r.data.filter((e: any) =>
            (e.registeredFamilies || []).some((id: string) => id.toString() === myFamilyId)
          );
          setEvents(onboarded);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    if (myFamilyId) fetchAll();
    else setLoading(false);
  }, [myFamilyId]);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const pastEvents     = events.filter(e => new Date((e.date || e.startDate) + 'T00:00:00') < now);
  const upcomingEvents = events.filter(e => new Date((e.date || e.startDate) + 'T00:00:00') >= now);

  const statusData = [
    { name: 'Upcoming', value: upcomingEvents.length },
    { name: 'Past',     value: pastEvents.length },
  ].filter(d => d.value > 0);

  const typeMap: Record<string, number> = {};
  events.forEach(e => { const t = e.sessionType || 'General'; typeMap[t] = (typeMap[t] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyMap: Record<string, number> = {};
  events.forEach(e => {
    const d = new Date((e.date || e.startDate || '') + 'T12:00:00');
    if (isNaN(d.getTime())) return;
    const key = `${monthNames[d.getMonth()]}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyData = Object.entries(monthlyMap)
    .slice(-6)
    .map(([name, sessions]) => ({ name, sessions }));

  const nextEvent = upcomingEvents.sort((a, b) =>
    new Date((a.date || a.startDate) + 'T00:00:00').getTime() -
    new Date((b.date || b.startDate) + 'T00:00:00').getTime()
  )[0];

  // ── Attendance derived data ────────────────────────────────────────────
  const attPresent   = attendance.filter(a => a.status === 'PRESENT').length;
  const attAbsent    = attendance.filter(a => a.status === 'ABSENT').length;
  const attLate      = attendance.filter(a => a.status === 'LATE').length;
  const attNotMarked = attendance.filter(a => a.status === 'NOT_MARKED').length;
  const attMarked    = attPresent + attAbsent + attLate;
  const attRate      = attMarked > 0 ? Math.round(((attPresent + attLate) / attMarked) * 100) : 0;

  const attPieData = [
    { name: 'Present',    value: attPresent   },
    { name: 'Absent',     value: attAbsent    },
    { name: 'Late',       value: attLate      },
    { name: 'Not Marked', value: attNotMarked },
  ].filter(d => d.value > 0);

  const ATT_PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280'];

  // Bar chart: last 8 sessions with attendance status
  const attBarData = [...attendance]
    .sort((a, b) => a.date?.localeCompare(b.date) || 0)
    .slice(-8)
    .map(a => ({
      name:   a.eventName?.length > 10 ? a.eventName.slice(0, 10) + '…' : (a.eventName || '?'),
      value:  1,
      fill:   ATT_COLORS[a.status] || '#6b7280',
      status: a.status,
    }));

  const kpis = [
    { icon: '📋', label: 'Total Sessions',  value: events.length,         color: '#6366f1' },
    { icon: '✅', label: 'Upcoming',         value: upcomingEvents.length, color: '#22c55e' },
    { icon: '🕐', label: 'Past',             value: pastEvents.length,     color: '#f59e0b' },
    { icon: '🎯', label: 'Attendance Rate',  value: `${attRate}%`,         color: '#10b981' },
  ];

  const EmptyChart = ({ height = 160 }: { height?: number }) => (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '6px' }}>
      <span style={{ fontSize: '28px', opacity: 0.4 }}>📊</span>
      <span style={{ fontSize: '12px' }}>{loading ? 'Loading…' : 'No data yet'}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
        borderRadius: '16px', padding: '24px 28px',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 6px 24px rgba(99,102,241,0.28)',
      }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '120px', opacity: 0.07, pointerEvents: 'none', lineHeight: 1 }}>🌟</div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Family Portal</p>
            <h2 style={{ margin: '0 0 6px', color: '#fff', fontSize: '22px', fontWeight: 900, lineHeight: 1.2 }}>
              Welcome, {family?.guardianName?.split(' ')[0] || 'Guardian'}! 👋
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '13px' }}>
              {family?.childFirstName}'s participation overview · Youth Ochilis
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' }}>
              🪪 {family?.familyId}
            </span>
            {nextEvent && (
              <span style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' }}>
                📅 Next: {nextEvent.eventName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {kpis.map(k => (
          <div key={k.label} className="admin-table-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: k.color, lineHeight: 1 }}>{loading ? '—' : k.value}</p>
              <p style={{ margin: '3px 0 0', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: '16px' }}>

        {/* Pie: Status */}
        <div className="admin-table-card" style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Session Status</p>
          <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>Upcoming vs past</p>
          {statusData.length === 0 ? <EmptyChart height={160} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Manual legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '4px' }}>
            {statusData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Pie: Types */}
        <div className="admin-table-card" style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Session Types</p>
          <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>By activity category</p>
          {typeData.length === 0 ? <EmptyChart height={160} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={typeData} dataKey="value" cx="50%" cy="50%" outerRadius={65} paddingAngle={3}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
            {typeData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[(i + 2) % COLORS.length], flexShrink: 0 }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Bar: Monthly */}
        <div className="admin-table-card" style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Monthly History</p>
          <p style={{ margin: '0 0 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>Sessions per month</p>
          {monthlyData.length === 0 ? <EmptyChart height={168} /> : (
            <ResponsiveContainer width="100%" height={168}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} formatter={(v) => [`${v}`, 'Sessions']} />
                <Bar dataKey="sessions" radius={[5, 5, 0, 0]}>
                  {monthlyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Attendance Charts ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px' }}>

        {/* Attendance Pie */}
        <div className="admin-table-card" style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>🎯 My Attendance</p>
          <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>Present / Absent / Late breakdown</p>
          {attPieData.length === 0 ? <EmptyChart height={160} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie data={attPieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                  {attPieData.map((_, i) => <Cell key={i} fill={ATT_PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} session${Number(v) !== 1 ? 's' : ''}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
            {attPieData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ATT_PIE_COLORS[i], flexShrink: 0 }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
          {/* Rate badge */}
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <span style={{ padding: '4px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 800, background: attRate >= 75 ? 'rgba(16,185,129,0.12)' : attRate >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: attRate >= 75 ? '#10b981' : attRate >= 50 ? '#f59e0b' : '#ef4444' }}>
              {attMarked === 0 ? 'No records yet' : `${attRate}% Attendance Rate`}
            </span>
          </div>
        </div>

        {/* Per-session bar */}
        <div className="admin-table-card" style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>📊 Session-wise Attendance</p>
          <p style={{ margin: '0 0 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>Last 8 registered sessions</p>
          {attBarData.length === 0 ? <EmptyChart height={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={attBarData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const cfg: Record<string, string> = { PRESENT: '#10b981', ABSENT: '#ef4444', LATE: '#f59e0b', NOT_MARKED: '#6b7280' };
                    return (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: cfg[d.status] || '#6b7280' }}>
                        {d.name}<br />{d.status.replace('_', ' ')}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {attBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Legend row */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['#10b981','Present'],['#ef4444','Absent'],['#f59e0b','Late'],['#6b7280','Not Marked']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: c, flexShrink: 0 }} />{l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { icon: '📅', label: 'View Calendar', sub: 'Session dates & staff details', path: '/family/dashboard/calendar', grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', hover: 'rgba(99,102,241,0.4)' },
          { icon: '✏️', label: 'Edit Profile',  sub: 'Medical needs & contacts',      path: '/family/dashboard/edit-profile', grad: 'linear-gradient(135deg,#ec4899,#8b5cf6)', hover: 'rgba(236,72,153,0.4)' },
        ].map(a => (
          <div
            key={a.label}
            className="admin-table-card"
            onClick={() => navigate(a.path)}
            style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.18s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = a.hover)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: a.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {a.icon}
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>{a.label}</p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{a.sub}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '16px', color: 'var(--text-secondary)' }}>›</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default FamilyDashboardHome;
