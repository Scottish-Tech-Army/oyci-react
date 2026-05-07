import { useQuery } from '@tanstack/react-query';
import { getStaff, getStaffQualifications } from '../../api/staff';
import { getAssignments } from '../../api/assignments';
import { getEvents } from '../../api/events';
import { getUnavailability } from '../../api/unavailability';
import type { StaffMember, Qualification, EventStaffAssignment, Event, UnavailabilityPeriod } from '../../types';

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

function QualBadge({ qual }: { qual: Qualification }) {
  return (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: '#ede9f7', color: '#913a8e' }}>
      {qual.name}
    </span>
  );
}

function StaffCard({
  member,
  qualifications,
  upcomingAssignments,
  eventsMap,
  unavailability,
}: {
  member: StaffMember;
  qualifications: Qualification[];
  upcomingAssignments: EventStaffAssignment[];
  eventsMap: Map<string, Event>;
  unavailability: UnavailabilityPeriod[];
}) {
  const confirmed = upcomingAssignments.filter(a => a.status === 'CONFIRMED');
  const pending   = upcomingAssignments.filter(a => a.status === 'PENDING_ACCEPTANCE');
  const booked    = confirmed.length + pending.length;

  const statusColour: Record<string, string> = {
    CONFIRMED:          'bg-green-100 text-green-800',
    PENDING_ACCEPTANCE: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {member.firstName} {member.lastName}
          </h2>
          <p className="text-sm text-slate-400">{member.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Ref: {member.externalRef}</p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={member.active
            ? { background: '#e8f7ee', color: '#066633' }
            : { background: '#f1f1f1', color: '#888' }}
        >
          {member.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Hours */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>🕐 Target: <strong className="text-slate-700">{member.weeklyHoursTarget}h/wk</strong></span>
        <span>⬆️ Max: <strong className="text-slate-700">{member.maxWeeklyHours}h/wk</strong></span>
        <span>🌍 {member.timezone}</span>
      </div>

      {/* Qualifications */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Qualifications</p>
        {qualifications.length === 0 ? (
          <p className="text-xs text-slate-400 italic">None recorded</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {qualifications.map(q => <QualBadge key={q.id} qual={q} />)}
          </div>
        )}
      </div>

      {/* Upcoming availability */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Upcoming Assignments ({booked})
        </p>
        {upcomingAssignments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No upcoming assignments — available to schedule</p>
        ) : (
          <div className="space-y-1.5">
            {upcomingAssignments.map(a => {
              const ev = eventsMap.get(a.sessionEventId);
              return (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600">
                    {ev ? `${ev.eventType} — ${new Date(ev.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : a.sessionEventId}
                  </span>
                  {ev?.eventLocation && <span className="text-slate-400">· {ev.eventLocation}</span>}
                  <span className={`px-1.5 py-0.5 rounded font-medium ${statusColour[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.status === 'PENDING_ACCEPTANCE' ? 'Pending' : 'Confirmed'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unavailability */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Unavailable Dates</p>
        {unavailability.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No dates marked — fully available</p>
        ) : (
          <div className="space-y-1">
            {unavailability.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="inline-block px-2 py-0.5 rounded font-medium"
                  style={{ background: '#fff0f6', color: '#e6007e' }}>
                  {formatDateRange(p.startDate, p.endDate)}
                </span>
                {p.reason && <span className="text-slate-400">{p.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Wrapper that fetches per-staff qualifications and unavailability dynamically */
function StaffCardWrapper({
  member,
  upcomingAssignments,
  eventsMap,
}: {
  member: StaffMember;
  upcomingAssignments: EventStaffAssignment[];
  eventsMap: Map<string, Event>;
}) {
  const { data: qualifications = [] } = useQuery({
    queryKey: ['staff-quals', member.id],
    queryFn: () => getStaffQualifications(member.id),
  });
  const { data: unavailability = [] } = useQuery({
    queryKey: ['unavailability', member.id],
    queryFn: () => getUnavailability(member.id),
  });
  return (
    <StaffCard
      member={member}
      qualifications={qualifications}
      upcomingAssignments={upcomingAssignments}
      eventsMap={eventsMap}
      unavailability={unavailability}
    />
  );
}

export default function StaffListPage() {
  const { data: staffList, isLoading: loadingStaff, error } = useQuery({ queryKey: ['staff'], queryFn: getStaff });
  const { data: assignments } = useQuery({ queryKey: ['assignments'], queryFn: getAssignments });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: getEvents });

  const eventsMap = new Map((events ?? []).map(e => [e.eventId, e]));

  const activeAssignmentsFor = (staffId: string) =>
    (assignments ?? []).filter(
      a => a.staffId === staffId &&
           (a.status === 'CONFIRMED' || a.status === 'PENDING_ACCEPTANCE'),
    );

  const activeStaff = staffList?.filter(s => s.active) ?? [];
  const inactiveStaff = staffList?.filter(s => !s.active) ?? [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Staff</h1>
        <div className="h-1 w-12 rounded" style={{ background: '#913a8e' }} />
      </div>

      {loadingStaff && <p className="text-slate-500">Loading staff...</p>}
      {error && <p className="text-red-500">Failed to load staff.</p>}

      {!loadingStaff && !error && (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#913a8e' }}>
              Active Staff ({activeStaff.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeStaff.map(s => (
                <StaffCardWrapper
                  key={s.id}
                  member={s}
                  upcomingAssignments={activeAssignmentsFor(s.id)}
                  eventsMap={eventsMap}
                />
              ))}
            </div>
          </section>

          {inactiveStaff.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Inactive Staff ({inactiveStaff.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {inactiveStaff.map(s => (
                  <StaffCardWrapper
                    key={s.id}
                    member={s}
                    upcomingAssignments={[]}
                    eventsMap={eventsMap}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
