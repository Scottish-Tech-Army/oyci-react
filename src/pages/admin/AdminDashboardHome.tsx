import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import API from '../../services/api';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#ef4444', '#0ea5e9'];

const getEventStatus = (e: any): 'YET_TO_START' | 'ONGOING' | 'COMPLETED' => {
  if (e.isManuallyCompleted) return 'COMPLETED';
  if (!e.date || !e.startTime || !e.endTime) return 'YET_TO_START';
  const now = new Date();
  const startObj = new Date(`${e.date}T${e.startTime}:00`);
  const endObj   = new Date(`${e.date}T${e.endTime}:00`);
  if (now < startObj) return 'YET_TO_START';
  if (now > endObj)   return 'COMPLETED';
  return 'ONGOING';
};

const getEventDuration = (e: any): number => {
  if (!e.startTime || !e.endTime) return 0;
  const s = new Date(`1970-01-01T${e.startTime}:00`);
  const en = new Date(`1970-01-01T${e.endTime}:00`);
  const h = (en.getTime() - s.getTime()) / 3600000;
  return h > 0 ? h : 0;
};

// Custom Tooltip for stacked bar
const AttTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const enrolled = payload[0]?.payload?.enrolled ?? '—';
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', minWidth: '160px' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 800, color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ margin: '0 0 2px', color: '#6b7280' }}>Enrolled: <b>{enrolled}</b></p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.fill }}>{p.name}: <b>{p.value}</b></p>
      ))}
    </div>
  );
};

const EmptyChart = ({ h = 260 }: { h?: number }) => (
  <div style={{ height: h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '8px' }}>
    <span style={{ fontSize: '36px', opacity: 0.35 }}>📊</span>
    <span style={{ fontSize: '13px' }}>No data yet</span>
  </div>
);

const AdminDashboardHome = () => {
  const [loading, setLoading] = useState(true);

  const [totalStaff,   setTotalStaff  ] = useState(0);
  const [totalEvents,  setTotalEvents ] = useState(0);
  const [totalStudents,setTotalStudents] = useState(0);

  const [roleData,        setRoleData       ] = useState<{ name: string; value: number }[]>([]);
  const [eventStatusData, setEventStatusData] = useState<{ name: string; value: number }[]>([]);
  const [payrollTypeData, setPayrollTypeData] = useState<{ name: string; value: number }[]>([]);
  const [attStats,        setAttStats       ] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      API.get('/users'),
      API.get('/events'),
      API.get('/students'),
      API.get('/attendance/stats/events'),
    ]).then(([usersRes, eventsRes, studentsRes, attRes]) => {
      const users   = usersRes.data;
      const events  = eventsRes.data;
      const students = studentsRes.data || [];

      const staffList = users.filter((u: any) => u.role !== 'admin' && u.status === 'APPROVED');
      setTotalStaff(staffList.length);
      setTotalEvents(events.length);
      setTotalStudents(students.length);
      setAttStats(attRes.data || []);

      // Staff by Role
      const roleMap: Record<string, number> = {};
      staffList.forEach((s: any) => {
        const role = s.roleType || 'Unknown';
        roleMap[role] = (roleMap[role] || 0) + 1;
      });
      setRoleData(Object.entries(roleMap).map(([name, value]) => ({ name, value })));

      // Events by Status
      const statusMap: Record<string, number> = { 'Completed': 0, 'Ongoing': 0, 'Yet to Start': 0 };
      const completedEvents: any[] = [];
      events.forEach((e: any) => {
        const s = getEventStatus(e);
        if (s === 'COMPLETED')    { statusMap['Completed']++;    completedEvents.push(e); }
        else if (s === 'ONGOING') statusMap['Ongoing']++;
        else                      statusMap['Yet to Start']++;
      });
      setEventStatusData(
        Object.entries(statusMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
      );

      // Payroll estimate
      let salariedTotal = 0, contractualTotal = 0;
      staffList.forEach((u: any) => {
        if (u.employmentType === 'salaried') {
          salariedTotal += Number(u.fixedSalary || 0);
        } else {
          const attended = completedEvents.filter(e =>
            e.assignedStaff?.some((id: any) => (typeof id === 'object' ? id._id : id) === u._id)
          );
          let hrs = 0;
          attended.forEach(ev => { hrs += getEventDuration(ev); });
          contractualTotal += hrs * Number(u.hourlyRate || 0);
        }
      });
      setPayrollTypeData([
        { name: 'Salaried Base Pay', value: salariedTotal },
        { name: 'Contractual Payout', value: contractualTotal },
      ]);

      setLoading(false);
    }).catch(err => {
      console.error('Dashboard load error', err);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
      <span style={{ fontSize: '40px' }}>⏳</span>
      <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading real-time statistics…</p>
    </div>
  );

  const payrollTotal = payrollTypeData.reduce((a, c) => a + c.value, 0);

  // Attendance overview totals (sum of all events)
  const totalPresent  = attStats.reduce((a, e) => a + e.present,  0);
  const totalAbsent   = attStats.reduce((a, e) => a + e.absent,   0);
  const totalLate     = attStats.reduce((a, e) => a + e.late,     0);
  const totalEnrolled = attStats.reduce((a, e) => a + e.enrolled, 0);
  const overallRate   = totalEnrolled > 0
    ? Math.round(((totalPresent + totalLate) / totalEnrolled) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', background: 'var(--bg-document)', minHeight: '100%', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '4px' }}>
        <img
          src="/oyci-logo.png"
          alt="OYCI"
          style={{ height: '64px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)' }}>
            📊 Charity Operations Dashboard
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em' }}>
            Ochil Youths Community Improvement — Admin Overview
          </p>
        </div>
      </div>

      {/* ── KPI Row 1: Core Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { label: 'ACTIVE STAFF',      value: totalStaff,   color: '#10b981', icon: '👥' },
          { label: 'SCHEDULED EVENTS',  value: totalEvents,  color: '#6366f1', icon: '📅' },
          { label: 'ONBOARDED STUDENTS',value: totalStudents, color: '#ec4899', icon: '🧒' },
          { label: 'PAYROLL LIABILITY', value: `£${payrollTotal.toFixed(0)}`, color: '#f59e0b', icon: '💷' },
        ].map(k => (
          <div key={k.label} className="admin-table-card" style={{ padding: '18px 20px', borderLeft: `4px solid ${k.color}` }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {k.icon} {k.label}
            </p>
            <p style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── KPI Row 2: Attendance Overview ── */}
      {attStats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
          {[
            { label: 'TOTAL ENROLLED', value: totalEnrolled, color: '#6366f1' },
            { label: 'PRESENT',         value: totalPresent,  color: '#10b981' },
            { label: 'ABSENT',          value: totalAbsent,   color: '#ef4444' },
            { label: 'LATE',            value: totalLate,     color: '#f59e0b' },
            { label: 'OVERALL RATE',    value: `${overallRate}%`, color: overallRate >= 75 ? '#10b981' : overallRate >= 50 ? '#f59e0b' : '#ef4444' },
          ].map(k => (
            <div key={k.label} className="admin-table-card" style={{ padding: '14px 16px', borderTop: `3px solid ${k.color}`, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Row 1: Attendance bar charts ── */}
      {attStats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Stacked bar: Present / Absent / Late per session */}
          <div className="admin-table-card" style={{ padding: '22px' }}>
            <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>📋 Attendance per Session</p>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>Present · Absent · Late — by event</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attStats} margin={{ top: 4, right: 8, left: -16, bottom: 40 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<AttTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="present" name="Present" stackId="att" fill="#10b981" radius={[0,0,0,0]} />
                <Bar dataKey="late"    name="Late"    stackId="att" fill="#f59e0b" radius={[0,0,0,0]} />
                <Bar dataKey="absent"  name="Absent"  stackId="att" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar: Enrolled vs Marked per session */}
          <div className="admin-table-card" style={{ padding: '22px' }}>
            <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>🧒 Enrolled vs Marked per Session</p>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>How many students were registered and how many had attendance taken</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attStats} margin={{ top: 4, right: 8, left: -16, bottom: 40 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(99,102,241,0.05)' }} formatter={(v, n) => [`${v}`, n]} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="enrolled" name="Enrolled" fill="#6366f1" radius={[5,5,0,0]} />
                <Bar dataKey="marked"   name="Marked"   fill="#10b981" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Charts Row 2: Staff & Event pipeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Staff Role Breakdown */}
        <div className="admin-table-card" style={{ padding: '22px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>👥 Staff Allocation by Role</p>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>Approved staff distribution</p>
          {roleData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} members`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Event Pipeline */}
        <div className="admin-table-card" style={{ padding: '22px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>📅 Event Pipeline</p>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>Completed · Ongoing · Upcoming</p>
          {eventStatusData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={eventStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} label>
                  {eventStatusData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} sessions`, 'Events']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Full-width: Payroll Bar ── */}
      <div className="admin-table-card" style={{ padding: '22px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>💷 Payroll Expenditure Estimate</p>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>Salaried base pay vs contractual payout (completed sessions)</p>
        {payrollTypeData.every(d => d.value === 0) ? <EmptyChart h={200} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollTypeData} margin={{ top: 10, right: 24, left: 8, bottom: 0 }} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} />
              <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, 'Amount']} cursor={{ fill: 'var(--bg-input)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {payrollTypeData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
};

export default AdminDashboardHome;
