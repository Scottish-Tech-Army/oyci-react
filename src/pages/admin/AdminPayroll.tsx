import { useState, useEffect } from 'react';
import API from '../../services/api';

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
  const end = new Date(`1970-01-01T${e.endTime}:00`);
  const diff = (end.getTime() - s.getTime()) / (1000 * 60 * 60);
  return diff > 0 ? diff : 0;
};

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Returns the last Mon–Fri of a given month
function getLastWorkingDay(year: number, month: number): Date {
  const last = new Date(year, month + 1, 0); // last calendar day
  while (last.getDay() === 0 || last.getDay() === 6) {
    last.setDate(last.getDate() - 1);
  }
  return last;
}

function isLastWorkingDayOfMonth(): boolean {
  const now = new Date();
  const lwd = getLastWorkingDay(now.getFullYear(), now.getMonth());
  return (
    now.getFullYear() === lwd.getFullYear() &&
    now.getMonth()    === lwd.getMonth() &&
    now.getDate()     === lwd.getDate()
  );
}

const AdminPayroll = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<'request' | 'remind' | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [periodType, setPeriodType] = useState<'month' | 'week'>('month');
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentWeek  = `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);

  const isLastWD = isLastWorkingDayOfMonth();
  const lwd = getLastWorkingDay(now.getFullYear(), now.getMonth());
  const lwdLabel = lwd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    if (periodType === 'month') setSelectedPeriod(currentMonth);
    else setSelectedPeriod(currentWeek);
  }, [periodType, currentMonth, currentWeek]);

  useEffect(() => {
    Promise.all([API.get('/users'), API.get('/events')])
      .then(([usersRes, eventsRes]) => {
        setStaff(usersRes.data.filter((u: any) => u.role !== 'admin' && u.status === 'APPROVED'));
        setEvents(eventsRes.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter(e => {
    if (getEventStatus(e) !== 'COMPLETED') return false;
    if (periodType === 'month') return e.date.startsWith(selectedPeriod);
    const [year, weekStr] = selectedPeriod.split('-W');
    if (!year || !weekStr) return true;
    const eDate = new Date(e.date);
    if (eDate.getFullYear().toString() !== year) return false;
    return getISOWeek(eDate).toString() === parseInt(weekStr).toString();
  });

  const payrollData = staff.map(u => {
    const attendedEvents = filteredEvents.filter(e =>
      e.assignedStaff?.some((id: any) => (typeof id === 'object' ? id._id : id) === u._id)
    );
    let totalHours = 0;
    attendedEvents.forEach(e => { totalHours += getEventDuration(e); });
    let pay = 0;
    if (u.employmentType === 'salaried') {
      pay = periodType === 'week' ? Number(u.fixedSalary || 0) / 4 : Number(u.fixedSalary || 0);
    } else {
      pay = totalHours * Number(u.hourlyRate || 0);
    }
    return {
      _id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.roleType || 'Staff',
      empType: u.employmentType || 'contractual',
      rate: u.employmentType === 'salaried' ? u.fixedSalary || 0 : u.hourlyRate || 0,
      sessionsAttended: attendedEvents.length,
      totalHours,
      totalPay: pay,
    };
  });

  const totalPayroll = payrollData.reduce((sum, item) => sum + item.totalPay, 0);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const sendEmail = async (isReminder: boolean) => {
    setSending(isReminder ? 'remind' : 'request');
    try {
      await API.post('/payroll/send-email', {
        period: selectedPeriod,
        payrollData: payrollData.map(({ name, role, empType, sessionsAttended, totalHours, totalPay }) =>
          ({ name, role, empType, sessionsAttended, totalHours, totalPay })
        ),
        totalPayroll,
        isReminder,
      });
      showToast(isReminder ? '🔔 Reminder sent to finance team!' : '💸 Payroll request sent to finance team!', true);
    } catch {
      showToast('Failed to send email. Please try again.', false);
    } finally {
      setSending(null);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading payroll data...</div>;

  return (
    <div style={{ padding: '24px', background: 'var(--bg-document)', minHeight: '100%', borderRadius: '12px', position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.ok ? '#022c22' : '#450a0a',
          border: `1px solid ${toast.ok ? '#16a34a' : '#dc2626'}`,
          color: toast.ok ? '#4ade80' : '#f87171',
          padding: '12px 20px', borderRadius: '10px',
          fontSize: '14px', fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
          💸 Payroll Management
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="radio" value="month" checked={periodType === 'month'} onChange={() => setPeriodType('month')} />Monthly
            </label>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="radio" value="week" checked={periodType === 'week'} onChange={() => setPeriodType('week')} />Weekly
            </label>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
          {periodType === 'month' ? (
            <input type="month" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
          ) : (
            <input type="week" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="admin-table-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL PAYROLL ({periodType.toUpperCase()})</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>£{totalPayroll.toFixed(2)}</p>
        </div>
        <div className="admin-table-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>COMPLETED SESSIONS</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{filteredEvents.length}</p>
        </div>
        <div className="admin-table-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>ACTIVE COMPENSATED STAFF</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{payrollData.filter(d => d.totalPay > 0).length}</p>
        </div>
      </div>

      {/* Payroll Action Bar */}
      <div className="admin-table-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            📬 Payroll Dispensing Actions
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
            Emails sent to: <span style={{ fontWeight: 700, color: '#6366f1' }}>payroll-email@gmail.com</span>
            {!isLastWD && periodType === 'month' && (
              <span style={{ marginLeft: '8px', color: '#f59e0b', fontWeight: 600 }}>
                · Request Payroll activates on last working day ({lwdLabel})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Request Payroll — only active on last working day of month */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => sendEmail(false)}
              disabled={sending !== null || (periodType === 'month' && !isLastWD)}
              title={!isLastWD && periodType === 'month' ? `Available on last working day: ${lwdLabel}` : 'Request payroll dispensing'}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 18px', borderRadius: '10px', border: 'none',
                background: (periodType === 'month' && !isLastWD)
                  ? 'var(--bg-input)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: (periodType === 'month' && !isLastWD) ? 'var(--text-secondary)' : '#fff',
                fontWeight: 700, fontSize: '13px',
                cursor: (sending !== null || (periodType === 'month' && !isLastWD)) ? 'not-allowed' : 'pointer',
                opacity: sending === 'request' ? 0.6 : 1,
                boxShadow: (periodType === 'month' && !isLastWD) ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
                transition: 'all 0.15s',
              }}
            >
              {sending === 'request' ? '⏳ Sending…' : '💸 Request Payroll'}
            </button>
            {periodType === 'month' && !isLastWD && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: '#f59e0b', color: '#fff', fontSize: '9px', fontWeight: 800,
                padding: '2px 5px', borderRadius: '99px', lineHeight: 1.2,
              }}>
                {lwdLabel}
              </span>
            )}
          </div>

          {/* Remind button — always active */}
          <button
            onClick={() => sendEmail(true)}
            disabled={sending !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: '10px',
              border: '1.5px solid rgba(245,158,11,0.6)',
              background: 'rgba(245,158,11,0.08)',
              color: '#d97706', fontWeight: 700, fontSize: '13px',
              cursor: sending !== null ? 'not-allowed' : 'pointer',
              opacity: sending === 'remind' ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {sending === 'remind' ? '⏳ Sending…' : '🔔 Send Reminder'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Employment Type</th>
              <th>Base Rate</th>
              <th>Sessions (Completed)</th>
              <th>Total Hours</th>
              <th style={{ textAlign: 'right' }}>Calculated Pay</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                  No active staff found for this period.
                </td>
              </tr>
            ) : (
              payrollData.map(item => (
                <tr key={item._id}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                      <br />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.role}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: item.empType === 'salaried' ? 'rgba(99,102,241,0.1)' : 'rgba(234,179,8,0.1)',
                      color: item.empType === 'salaried' ? '#4f46e5' : '#ca8a04',
                      textTransform: 'uppercase',
                    }}>
                      {item.empType}
                    </span>
                  </td>
                  <td>
                    {item.empType === 'salaried'
                      ? <span style={{ fontWeight: 600 }}>£{item.rate}/mo</span>
                      : <span style={{ fontWeight: 600 }}>£{item.rate}/hr</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.sessionsAttended}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.totalHours.toFixed(1)} hrs</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#10b981' }}>
                      £{item.totalPay.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {payrollData.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td colSpan={5} style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '13px' }}>
                  TOTAL
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, fontSize: '18px', color: '#10b981' }}>
                  £{totalPayroll.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default AdminPayroll;
