import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../../api/events';
import { getEventTypes, getLocations } from '../../api/masterdata';

interface FormValues {
  eventTypeCode: string;
  eventDate: string;
  locationName: string;
}

export default function EventCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: eventTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['event-types'],
    queryFn: getEventTypes,
  });
  const { data: locations, isLoading: loadingLocs } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createEvent({
        eventType: values.eventTypeCode,
        eventDate: new Date(values.eventDate).toISOString(),
        eventLocation: values.locationName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/admin/events');
    },
  });

  const loading = loadingTypes || loadingLocs;
  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oyci-green";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Event</h1>
        <div className="h-1 w-12 rounded" style={{ background: '#0b8e36' }} />
      </div>

      {loading && <p className="text-slate-500">Loading options...</p>}

      {!loading && (
        <form
          onSubmit={handleSubmit(values => mutation.mutate(values))}
          className="bg-white rounded-xl shadow-sm p-6 max-w-md space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
            <select {...register('eventTypeCode', { required: 'Event type is required' })} className={inputClass}>
              <option value="">Select type…</option>
              {eventTypes?.map(et => (
                <option key={et.id} value={et.code}>{et.name}</option>
              ))}
            </select>
            {errors.eventTypeCode && (
              <p className="text-oyci-pink text-xs mt-1">{errors.eventTypeCode.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              {...register('eventDate', { required: 'Date is required' })}
              type="date"
              className={inputClass}
            />
            {errors.eventDate && (
              <p className="text-oyci-pink text-xs mt-1">{errors.eventDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <select {...register('locationName', { required: 'Location is required' })} className={inputClass}>
              <option value="">Select location…</option>
              {locations?.map(loc => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
            {errors.locationName && (
              <p className="text-oyci-pink text-xs mt-1">{errors.locationName.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-oyci-pink text-sm">Failed to create event. Please try again.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              style={{ background: '#0b8e36' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#066633')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0b8e36')}
            >
              {mutation.isPending ? 'Creating…' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="text-slate-600 hover:text-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
