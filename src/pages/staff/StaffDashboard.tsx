import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignments, acceptAssignment, declineAssignment } from '../../api/assignments';
import { getEvents } from '../../api/events';
import { getStaff } from '../../api/staff';
import { useAuth } from '../../contexts/AuthContext';
import type { EventStaffAssignment } from '../../types';

const statusConfig: Record<string, { label: string; classes: string }> = {
  CONFIRMED:          { label: 'Confirmed',         classes: 'bg-green-100 text-green-800' },
  PENDING_ACCEPTANCE: { label: 'Awaiting Response',  classes: 'bg-amber-100 text-amber-800' },
  DRAFT:              { label: 'Draft',              classes: 'bg-slate-100 text-slate-600' },
  CANCELLED:          { label: 'Declined',           classes: 'bg-pink-100 text-oyci-pink' },
};

function AssignmentCard({
  assignment,
  eventType,
  eventDate,
  eventLocation,
}: {
  assignment: EventStaffAssignment;
  eventType?: string;
  eventDate?: string;
  eventLocation?: string;
}) {
  const queryClient = useQueryClient();
  const isPending = assignment.status === 'PENDING_ACCEPTANCE';

  const accept = useMutation({
    mutationFn: () => acceptAssignment(assignment.sessionEventId, assignment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const decline = useMutation({
    mutationFn: () => declineAssignment(assignment.sessionEventId, assignment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const cfg = statusConfig[assignment.status] ?? { label: assignment.status, classes: 'bg-gray-100 text-gray-700' };
  const busy = accept.isPending || decline.isPending;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border-l-4"
      style={{ borderLeftColor: isPending ? '#27b0e7' : assignment.status === 'CONFIRMED' ? '#0b8e36' : '#e0e0e0' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-slate-800 mb-1">{eventType ?? 'Unknown Event'}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {eventDate && <span>📅 {new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>}
            {eventLocation && <span>📍 {eventLocation}</span>}
            <span>🎭 Role: {assignment.role || '—'}</span>
          </div>
          {isPending && (
            <p className="mt-2 text-xs" style={{ color: '#27b0e7' }}>
              🔔 You have been scheduled for this event — please accept or decline.
            </p>
          )}
          {(accept.isError || decline.isError) && (
            <p className="mt-1 text-xs" style={{ color: '#e6007e' }}>Action failed. Please try again.</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cfg.classes}`}>
            {cfg.label}
          </span>
          {isPending && (
            <div className="flex gap-2">
              <button
                onClick={() => accept.mutate()}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: '#0b8e36' }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#066633'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0b8e36'; }}
              >
                {accept.isPending ? 'Accepting…' : '✓ Accept'}
              </button>
              <button
                onClick={() => decline.mutate()}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: '#e6007e' }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#b8006a'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#e6007e'; }}
              >
                {decline.isPending ? 'Declining…' : '✕ Decline'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: getAssignments,
  });
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });
  const { data: staffList, isLoading: loadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: getStaff,
  });

  const loading = loadingAssignments || loadingEvents || loadingStaff;

  const matchedStaff = staffList?.find(
    s =>
      s.firstName.toLowerCase().includes(user?.username.toLowerCase() ?? '') ||
      s.lastName.toLowerCase().includes(user?.username.toLowerCase() ?? '') ||
      user?.username.toLowerCase().includes(s.firstName.toLowerCase()) ||
      user?.username.toLowerCase().includes(s.lastName.toLowerCase()),
  );

  const myAssignments = assignments?.filter(a =>
    matchedStaff ? a.staffId === matchedStaff.id : true,
  ) ?? [];

  const pending = myAssignments.filter(a => a.status === 'PENDING_ACCEPTANCE');
  const active  = myAssignments.filter(a => a.status === 'CONFIRMED');
  const other   = myAssignments.filter(a => a.status !== 'PENDING_ACCEPTANCE' && a.status !== 'CONFIRMED');

  const eventsMap = new Map(events?.map(e => [e.eventId, e]));

  const renderCard = (a: EventStaffAssignment) => {
    const ev = eventsMap.get(a.sessionEventId);
    return (
      <AssignmentCard
        key={a.id}
        assignment={a}
        eventType={ev?.eventType}
        eventDate={ev?.eventDate}
        eventLocation={ev?.eventLocation}
      />
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">My Events</h1>
      <div className="h-1 w-12 rounded mb-4" style={{ background: '#0b8e36' }} />
      {matchedStaff && (
        <p className="text-slate-500 text-sm mb-6">
          Showing assignments for <strong>{matchedStaff.firstName} {matchedStaff.lastName}</strong>
        </p>
      )}
      {!matchedStaff && !loading && (
        <p className="text-slate-500 text-sm mb-6">
          Showing all assignments (no staff record matched username "{user?.username}")
        </p>
      )}
      {loading && <p className="text-slate-500">Loading...</p>}
      {!loading && myAssignments.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400">
          No event assignments yet. An admin will schedule you when events are available.
        </div>
      )}
      {!loading && myAssignments.length > 0 && (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#27b0e7' }}>
                🔔 Awaiting Your Response ({pending.length})
              </h2>
              <div className="grid gap-3">{pending.map(renderCard)}</div>
            </section>
          )}
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#0b8e36' }}>
                ✓ Confirmed ({active.length})
              </h2>
              <div className="grid gap-3">{active.map(renderCard)}</div>
            </section>
          )}
          {other.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Other
              </h2>
              <div className="grid gap-3">{other.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
