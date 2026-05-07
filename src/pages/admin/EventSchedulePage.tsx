import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent } from '../../api/events';
import { getEventAssignments, createAssignment } from '../../api/assignments';
import { getEventEligibility } from '../../api/eligibility';
import { useAuth } from '../../contexts/AuthContext';
import type { EligibleStaffCandidate } from '../../types';

const statusColour: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  DRAFT: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-pink-100 text-oyci-pink',
};

function AssignModal({
  candidate,
  eventId,
  onClose,
}: {
  candidate: EligibleStaffCandidate;
  eventId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [role, setRole] = useState('Support');

  const mutation = useMutation({
    mutationFn: () =>
      createAssignment(eventId, {
        staffId: candidate.staffId,
        role,
        assignedBy: user?.username ?? 'admin',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-assignments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-eligibility', eventId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80">
        <h3 className="font-bold text-slate-800 mb-1">Assign {candidate.displayName}</h3>
        <p className="text-slate-500 text-sm mb-4">Choose a role for this assignment</p>
        <input
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="Role (e.g. Support, Lead)"
          className="focus:outline-none focus:ring-2 focus:ring-oyci-green w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
        />
        {mutation.isError && (
          <p className="text-red-500 text-xs mb-2">Failed to assign. Please try again.</p>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-slate-500 text-sm hover:text-slate-800 px-3 py-1">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-oyci-green hover:bg-oyci-green-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {mutation.isPending ? 'Assigning…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventSchedulePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [assigningCandidate, setAssigningCandidate] = useState<EligibleStaffCandidate | null>(null);

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId!),
    enabled: !!eventId,
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['event-assignments', eventId],
    queryFn: () => getEventAssignments(eventId!),
    enabled: !!eventId,
  });

  const { data: eligibility, isLoading: loadingEligibility } = useQuery({
    queryKey: ['event-eligibility', eventId],
    queryFn: () => getEventEligibility(eventId!),
    enabled: !!eventId,
  });

  const loading = loadingEvent || loadingAssignments || loadingEligibility;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Schedule Staff</h1>
      <div className="h-1 w-12 rounded mb-6" style={{ background: '#0b8e36' }} />

      {loading && <p className="text-slate-500">Loading...</p>}

      {!loading && event && (
        <>
          {/* Event details */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-6 text-sm text-slate-600">
            <span><strong className="text-slate-800">Type:</strong> {event.eventType}</span>
            <span><strong className="text-slate-800">Date:</strong> {new Date(event.eventDate).toLocaleDateString()}</span>
            <span><strong className="text-slate-800">Location:</strong> {event.eventLocation}</span>
            {eligibility && (
              <span>
                <strong className="text-slate-800">Staff needed:</strong>{' '}
                {eligibility.currentAssignments}/{eligibility.requiredStaffCount}
              </span>
            )}
          </div>

          {/* Current assignments */}
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Current Assignments</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            {assignments && assignments.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Staff ID</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.staffId}</td>
                      <td className="px-4 py-3">{a.role || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusColour[a.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.assignedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-slate-400 text-sm">No staff assigned yet.</div>
            )}
          </div>

          {/* Eligible staff */}
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Eligible Staff</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {eligibility && eligibility.candidates.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Eligible</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Reason</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibility.candidates.map(c => (
                    <tr key={c.staffId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.displayName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${c.eligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {c.eligible ? 'Eligible' : 'Not eligible'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{c.reason}</td>
                      <td className="px-4 py-3">
                        <button
                          disabled={!c.eligible}
                          onClick={() => setAssigningCandidate(c)}
                          className="bg-oyci-green hover:bg-oyci-green-dark disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-slate-400 text-sm">No eligible staff found.</div>
            )}
          </div>
        </>
      )}

      {assigningCandidate && eventId && (
        <AssignModal
          candidate={assigningCandidate}
          eventId={eventId}
          onClose={() => setAssigningCandidate(null)}
        />
      )}
    </div>
  );
}
