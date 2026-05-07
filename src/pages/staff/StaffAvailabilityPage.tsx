import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getUnavailability, addUnavailability, deleteUnavailability } from '../../api/unavailability';
import { useAuth } from '../../contexts/AuthContext';
import { getStaff } from '../../api/staff';
import type { CreateUnavailabilityRequest } from '../../types';

interface FormValues {
  startDate: string;
  endDate: string;
  reason: string;
}

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

export default function StaffAvailabilityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  // Resolve logged-in user to a staff ID
  const { data: staffList } = useQuery({ queryKey: ['staff'], queryFn: getStaff });
  const matchedStaff = staffList?.find(
    s =>
      s.firstName.toLowerCase().includes(user?.username.toLowerCase() ?? '') ||
      s.lastName.toLowerCase().includes(user?.username.toLowerCase() ?? '') ||
      user?.username.toLowerCase().includes(s.firstName.toLowerCase()) ||
      user?.username.toLowerCase().includes(s.lastName.toLowerCase()),
  );
  const staffId = matchedStaff?.id;

  const { data: periods, isLoading } = useQuery({
    queryKey: ['unavailability', staffId],
    queryFn: () => getUnavailability(staffId!),
    enabled: !!staffId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const addMutation = useMutation({
    mutationFn: (data: CreateUnavailabilityRequest) => addUnavailability(staffId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', staffId] });
      reset();
      setFormError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Failed to save. Please check your dates and try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (periodId: string) => deleteUnavailability(staffId!, periodId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unavailability', staffId] }),
  });

  const onSubmit = (values: FormValues) => {
    setFormError(null);
    addMutation.mutate({ startDate: values.startDate, endDate: values.endDate, reason: values.reason || undefined });
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oyci-green";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">My Availability</h1>
        <div className="h-1 w-12 rounded" style={{ background: '#27b0e7' }} />
      </div>

      {!staffId && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
          Could not match your username to a staff record. Contact your admin.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add unavailability form */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Mark Unavailability
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-xl shadow-sm p-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                <input
                  {...register('startDate', { required: 'Required' })}
                  type="date"
                  className={inputClass}
                />
                {errors.startDate && <p className="text-oyci-pink text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                <input
                  {...register('endDate', { required: 'Required' })}
                  type="date"
                  className={inputClass}
                />
                {errors.endDate && <p className="text-oyci-pink text-xs mt-1">{errors.endDate.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                {...register('reason')}
                type="text"
                placeholder="e.g. Holiday, Medical appointment…"
                className={inputClass}
              />
            </div>

            {formError && (
              <p className="text-oyci-pink text-sm bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">{formError}</p>
            )}

            <button
              type="submit"
              disabled={!staffId || addMutation.isPending}
              className="w-full text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              style={{ background: '#0b8e36' }}
              onMouseEnter={e => { if (!addMutation.isPending) e.currentTarget.style.background = '#066633'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0b8e36'; }}
            >
              {addMutation.isPending ? 'Saving…' : 'Mark as Unavailable'}
            </button>
          </form>
        </section>

        {/* Existing unavailability periods */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Unavailable Dates
          </h2>

          {isLoading && <p className="text-slate-500 text-sm">Loading...</p>}

          {!isLoading && (!periods || periods.length === 0) && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-slate-400 text-sm">
              No unavailability recorded — you're available for all upcoming events.
            </div>
          )}

          {!isLoading && periods && periods.length > 0 && (
            <div className="space-y-2">
              {periods.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">
                      {formatDateRange(p.startDate, p.endDate)}
                    </p>
                    {p.reason && (
                      <p className="text-xs text-slate-400 mt-0.5">{p.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-white"
                    style={{ background: '#e6007e' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#b8006a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#e6007e'; }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
