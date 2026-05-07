import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getEvents } from '../../api/events';
import { getAssignments } from '../../api/assignments';
import { getStaff } from '../../api/staff';

const statusColour: Record<string, string> = {
  CONFIRMED:          'bg-green-100 text-green-800',
  PENDING_ACCEPTANCE: 'bg-amber-100 text-amber-800',
  DRAFT:              'bg-slate-100 text-slate-500',
  CANCELLED:          'bg-pink-100 text-pink-700',
};

export default function EventsListPage() {
  const { data: events, isLoading: loadingEvents, error } = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const { data: assignments } = useQuery({ queryKey: ['assignments'], queryFn: getAssignments });
  const { data: staffList } = useQuery({ queryKey: ['staff'], queryFn: getStaff });

  const staffById = new Map(staffList?.map(s => [s.id, s]) ?? []);

  const activeAssignmentsForEvent = (eventId: string) =>
    (assignments ?? [])
      .filter(a => a.sessionEventId === eventId && a.status !== 'CANCELLED')
      .sort((a, b) => a.status.localeCompare(b.status));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Events</h1>
          <div className="h-1 w-12 rounded" style={{ background: '#0b8e36' }} />
        </div>
        <Link
          to="/admin/events/new"
          className="text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          style={{ background: '#0b8e36' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#066633')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0b8e36')}
        >
          + Create Event
        </Link>
      </div>

      {loadingEvents && <p className="text-slate-500">Loading events...</p>}
      {error && <p className="text-red-500">Failed to load events.</p>}

      {!loadingEvents && !error && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {events && events.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200" style={{ background: '#f0faf4' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#066633' }}>Type</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#066633' }}>Date</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#066633' }}>Location</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#066633' }}>Assigned Staff</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#066633' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map(event => {
                  const eventAssignments = activeAssignmentsForEvent(event.eventId);
                  return (
                    <tr key={event.eventId} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-3 font-medium text-slate-800">{event.eventType}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(event.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{event.eventLocation}</td>
                      <td className="px-4 py-3">
                        {eventAssignments.length === 0 ? (
                          <span className="text-slate-400 italic text-xs">No staff assigned</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {eventAssignments.map(a => {
                              const staff = staffById.get(a.staffId);
                              const name = staff
                                ? `${staff.firstName} ${staff.lastName}`
                                : a.staffId;
                              return (
                                <div key={a.id} className="flex items-center gap-2">
                                  <span className="text-slate-700 font-medium">{name}</span>
                                  {a.role && <span className="text-slate-400 text-xs">· {a.role}</span>}
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColour[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {a.status === 'PENDING_ACCEPTANCE' ? 'Pending' : a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/events/${event.eventId}/schedule`}
                          className="font-medium transition-colors"
                          style={{ color: '#27b0e7' }}
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400">
              No events yet. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
