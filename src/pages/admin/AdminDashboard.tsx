import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEvents } from '../../api/events';
import { getAssignments } from '../../api/assignments';
import { getStaff } from '../../api/staff';
import { autoSchedule } from '../../api/schedule';
import type { AutoScheduleResult } from '../../types';

function StatCard({ label, value, accent, to }: { label: string; value: number | string; accent: string; to?: string }) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-1 border-t-4 transition-shadow"
      style={{ borderTopColor: accent, cursor: to ? 'pointer' : 'default' }}
    >
      <span className="text-3xl font-bold text-slate-800">{value}</span>
      <span className="text-sm text-slate-500">{label}</span>
      {to && <span className="text-xs mt-1 font-medium" style={{ color: accent }}>View →</span>}
    </div>
  );
  return to ? <Link to={to} className="block hover:shadow-md rounded-xl transition-shadow">{content}</Link> : content;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const events = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const assignments = useQuery({ queryKey: ['assignments'], queryFn: getAssignments });
  const staff = useQuery({ queryKey: ['staff'], queryFn: getStaff });

  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<AutoScheduleResult | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const loading = events.isLoading || assignments.isLoading || staff.isLoading;
  const error = events.error || assignments.error || staff.error;

  const handleAutoSchedule = async () => {
    setScheduling(true);
    setScheduleResult(null);
    setScheduleError(null);
    try {
      const result = await autoSchedule();
      setScheduleResult(result);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch {
      setScheduleError('Auto-schedule failed. Is the backend running?');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Dashboard</h1>
          <div className="h-1 w-16 rounded" style={{ background: '#0b8e36' }} />
        </div>
        <button
          onClick={handleAutoSchedule}
          disabled={scheduling}
          className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-sm"
          style={{ background: '#913a8e' }}
          onMouseEnter={e => { if (!scheduling) e.currentTarget.style.background = '#7a2f74'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#913a8e'; }}
        >
          {scheduling ? <>⏳ Scheduling…</> : <>⚡ Auto Schedule All Events</>}
        </button>
      </div>

      {scheduleResult && (
        <div className="mb-6 rounded-xl p-4 border text-sm"
          style={{ background: '#f0fdf4', borderColor: '#0b8e36', color: '#066633' }}>
          <strong>✅ Auto-schedule complete:</strong> {scheduleResult.message}
          {scheduleResult.scheduledCount > 0 && (
            <span className="ml-2 text-xs opacity-75">
              ({scheduleResult.scheduledCount} new assignment{scheduleResult.scheduledCount !== 1 ? 's' : ''}, awaiting staff acceptance)
            </span>
          )}
        </div>
      )}
      {scheduleError && (
        <div className="mb-6 rounded-xl p-4 border text-sm"
          style={{ background: '#fff0f6', borderColor: '#e6007e', color: '#e6007e' }}>
          ❌ {scheduleError}
        </div>
      )}

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-oyci-pink">Failed to load data. Is the backend running?</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(() => {
            const allAssignments = assignments.data ?? [];
            const allEvents = events.data ?? [];
            const REQUIRED = 2;

            const understaffedEvents = allEvents.filter(event => {
              const active = allAssignments.filter(
                a => a.sessionEventId === event.eventId &&
                     (a.status === 'CONFIRMED' || a.status === 'PENDING_ACCEPTANCE')
              ).length;
              return active < REQUIRED;
            });

            const firstUnderstaffed = understaffedEvents[0];
            const needsStaffLink = firstUnderstaffed
              ? `/admin/events/${firstUnderstaffed.eventId}/schedule`
              : '/admin/events';

            return (
              <>
                <StatCard label="Upcoming Events" value={allEvents.length} accent="#0b8e36" to="/admin/events" />
                <StatCard
                  label="Events Needing Staff"
                  value={understaffedEvents.length}
                  accent={understaffedEvents.length > 0 ? '#e6007e' : '#27b0e7'}
                  to={understaffedEvents.length > 0 ? needsStaffLink : undefined}
                />
                <StatCard
                  label="Active Staff"
                  value={staff.data?.filter(s => s.active).length ?? 0}
                  accent="#913a8e"
                  to="/admin/staff"
                />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
