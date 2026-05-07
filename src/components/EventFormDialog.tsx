import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useAppContext } from '../context/useAppContext';
import type { Event } from '../types';

interface EventFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** When provided, the dialog is in "edit" mode for this event. */
  readonly editingEvent?: Event;
  /** Called after a successful save/create. */
  readonly onSaved?: () => void;
}

type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

function generateRecurringDates(
  startDate: string,
  pattern: RecurrencePattern,
  until: string,
): string[] {
  const dates: string[] = [];
  const end = new Date(until);
  const current = new Date(startDate);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    if (pattern === 'weekly') current.setDate(current.getDate() + 7);
    else if (pattern === 'biweekly') current.setDate(current.getDate() + 14);
    else current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

type FormData = {
  eventTypeId: string; locationId: string; date: string;
  startTime: string; endTime: string; staffStartTime: string; staffEndTime: string;
  maxAttendees: string; notes: string;
};
type RecurrenceState = { enabled: boolean; pattern: RecurrencePattern; until: string };

function validateTimings(formData: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!formData.startTime) errors.startTime = 'Start time is required.';
  if (!formData.endTime) errors.endTime = 'End time is required.';
  if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
    errors.endTime = 'End time must be after start time.';
  }
  const staffStart = formData.staffStartTime || formData.startTime;
  const staffEnd = formData.staffEndTime || formData.endTime;
  if (staffStart && staffEnd && staffEnd <= staffStart) {
    errors.staffEndTime = 'Staff end time must be after staff start time.';
  }
  return errors;
}

function validateEventFormData(
  formData: FormData,
  recurrence: RecurrenceState,
  isEditing: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!formData.eventTypeId) errors.eventTypeId = 'Event type is required.';
  if (!formData.locationId) errors.locationId = 'Location is required.';
  if (!formData.date) errors.date = 'Date is required.';
  Object.assign(errors, validateTimings(formData));
  if (formData.maxAttendees) {
    const parsed = Number.parseInt(formData.maxAttendees, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      errors.maxAttendees = 'Max attendees must be a positive whole number.';
    }
  }
  if (recurrence.enabled && !isEditing) {
    if (!recurrence.until) errors.recurrenceUntil = 'End date is required for recurring events.';
    else if (recurrence.until <= formData.date) errors.recurrenceUntil = 'End date must be after the start date.';
  }
  return errors;
}

export default function EventFormDialog({
  open,
  onClose,
  editingEvent,
  onSaved,
}: EventFormDialogProps) {
  const { eventTypes, locations, addEvent, updateEvent } = useAppContext();
  const isEditing = Boolean(editingEvent);

  const emptyForm = {
    eventTypeId: '',
    locationId: '',
    date: '',
    startTime: '',
    endTime: '',
    staffStartTime: '',
    staffEndTime: '',
    maxAttendees: '',
    notes: '',
  };

  const [formData, setFormData] = useState(() =>
    editingEvent
      ? {
          eventTypeId: editingEvent.eventTypeId,
          locationId: editingEvent.locationId,
          date: editingEvent.date,
          startTime: editingEvent.startTime,
          endTime: editingEvent.endTime,
          staffStartTime: editingEvent.staffStartTime || editingEvent.startTime,
          staffEndTime: editingEvent.staffEndTime || editingEvent.endTime,
          maxAttendees: editingEvent.maxAttendees?.toString() ?? '',
          notes: editingEvent.notes ?? '',
        }
      : emptyForm,
  );

  const [recurrence, setRecurrence] = useState({
    enabled: false,
    pattern: 'weekly' as RecurrencePattern,
    until: '',
  });

  const [showValidation, setShowValidation] = useState(false);

  // Reset state when dialog opens
  useMemo(() => {
    if (open) {
      setShowValidation(false);
      setRecurrence({ enabled: false, pattern: 'weekly', until: '' });
      setFormData(
        editingEvent
          ? {
              eventTypeId: editingEvent.eventTypeId,
              locationId: editingEvent.locationId,
              date: editingEvent.date,
              startTime: editingEvent.startTime,
              endTime: editingEvent.endTime,
              staffStartTime: editingEvent.staffStartTime || editingEvent.startTime,
              staffEndTime: editingEvent.staffEndTime || editingEvent.endTime,
              maxAttendees: editingEvent.maxAttendees?.toString() ?? '',
              notes: editingEvent.notes ?? '',
            }
          : emptyForm,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validationErrors = useMemo(
    () => validateEventFormData(formData, recurrence, isEditing),
    [formData, recurrence, isEditing],
  );

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    setShowValidation(true);
    if (Object.keys(validationErrors).length > 0) return;

    const data = {
      eventTypeId: formData.eventTypeId,
      locationId: formData.locationId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      staffStartTime: formData.staffStartTime || formData.startTime,
      staffEndTime: formData.staffEndTime || formData.endTime,
      maxAttendees: formData.maxAttendees ? Number.parseInt(formData.maxAttendees, 10) : undefined,
      notes: formData.notes || undefined,
    };

    if (isEditing && editingEvent) {
      updateEvent(editingEvent.id, data);
    } else if (recurrence.enabled && recurrence.until) {
      const dates = generateRecurringDates(formData.date, recurrence.pattern, recurrence.until);
      dates.forEach((date) => addEvent({ ...data, date }));
    } else {
      addEvent(data);
    }

    onSaved?.();
    handleClose();
  };

  const occurrenceCount =
    recurrence.enabled && formData.date && recurrence.until
      ? generateRecurringDates(formData.date, recurrence.pattern, recurrence.until).length
      : 0;

  const recurrenceHelperText = (() => {
    if (showValidation && validationErrors.recurrenceUntil) return validationErrors.recurrenceUntil;
    if (occurrenceCount > 0) return `${occurrenceCount} occurrence(s)`;
    return '';
  })();

  const saveButtonLabel = (() => {
    if (isEditing) return 'Update Event';
    if (!recurrence.enabled) return 'Create Event';
    const countStr = occurrenceCount > 0 ? `${occurrenceCount} ` : '';
    const plural = occurrenceCount === 1 ? '' : 's';
    return `Create ${countStr}Recurring Event${plural}`;
  })();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {isEditing ? 'Edit Event' : 'Create Event'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>

        {/* Section 1: Event details */}
        <Typography variant="overline" color="textSecondary">Event Details</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1, mb: 2 }}>
          <FormControl fullWidth required error={showValidation && Boolean(validationErrors.eventTypeId)}>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={formData.eventTypeId}
              onChange={(e) => setFormData({ ...formData, eventTypeId: e.target.value })}
              label="Event Type"
            >
              {eventTypes.map((et) => (
                <MenuItem key={et.id} value={et.id}>{et.name}</MenuItem>
              ))}
            </Select>
            {showValidation && validationErrors.eventTypeId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{validationErrors.eventTypeId}</Typography>
            )}
          </FormControl>

          <FormControl fullWidth required error={showValidation && Boolean(validationErrors.locationId)}>
            <InputLabel>Location</InputLabel>
            <Select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              label="Location"
            >
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
              ))}
            </Select>
            {showValidation && validationErrors.locationId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{validationErrors.locationId}</Typography>
            )}
          </FormControl>
        </Box>

        <TextField
          label="Date"
          fullWidth
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          error={showValidation && Boolean(validationErrors.date)}
          helperText={showValidation ? validationErrors.date : ''}
          sx={{ mb: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* Section 2: Timings */}
        <Typography variant="overline" color="textSecondary">Event Times</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1, mb: 2 }}>
          <TextField
            label="Start Time"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            error={showValidation && Boolean(validationErrors.startTime)}
            helperText={showValidation ? validationErrors.startTime : ''}
          />
          <TextField
            label="End Time"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            error={showValidation && Boolean(validationErrors.endTime)}
            helperText={showValidation ? validationErrors.endTime : ''}
          />
        </Box>

        <Typography variant="overline" color="textSecondary">
          Staff Times{' '}
          <Typography component="span" variant="caption" color="textSecondary">(for setup / teardown)</Typography>
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1, mb: 2 }}>
          <TextField
            label="Staff Arrive"
            type="time"
            value={formData.staffStartTime}
            onChange={(e) => setFormData({ ...formData, staffStartTime: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder={formData.startTime}
            helperText="Defaults to event start"
            error={showValidation && Boolean(validationErrors.staffStartTime)}
          />
          <TextField
            label="Staff Leave"
            type="time"
            value={formData.staffEndTime}
            onChange={(e) => setFormData({ ...formData, staffEndTime: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder={formData.endTime}
            helperText={
              showValidation && validationErrors.staffEndTime
                ? validationErrors.staffEndTime
                : 'Defaults to event end'
            }
            error={showValidation && Boolean(validationErrors.staffEndTime)}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Section 3: Optional details */}
        <Typography variant="overline" color="textSecondary">Optional</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2, mt: 1, mb: 2 }}>
          <TextField
            label="Max Attendees"
            type="number"
            value={formData.maxAttendees}
            onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
            fullWidth
            error={showValidation && Boolean(validationErrors.maxAttendees)}
            helperText={showValidation ? validationErrors.maxAttendees : ''}
          />
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            fullWidth
            multiline
            rows={1}
          />
        </Box>

        {/* Section 4: Recurrence (create only) */}
        {!isEditing && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: recurrence.enabled ? 2 : 0 }}>
              <RepeatIcon fontSize="small" color={recurrence.enabled ? 'secondary' : 'disabled'} />
              <Typography variant="overline" color="textSecondary" sx={{ flex: 1 }}>
                Recurring Event
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={recurrence.enabled}
                    onChange={(e) => setRecurrence({ ...recurrence, enabled: e.target.checked })}
                    size="small"
                    color="secondary"
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Box>
            {recurrence.enabled && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Repeats</InputLabel>
                  <Select
                    value={recurrence.pattern}
                    label="Repeats"
                    onChange={(e) =>
                      setRecurrence({ ...recurrence, pattern: e.target.value as RecurrencePattern })
                    }
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Every 2 weeks</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Repeat until"
                  type="date"
                  value={recurrence.until}
                  onChange={(e) => setRecurrence({ ...recurrence, until: e.target.value })}
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={showValidation && Boolean(validationErrors.recurrenceUntil)}
                  helperText={recurrenceHelperText}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={recurrence.enabled && !isEditing ? <RepeatIcon /> : undefined}
        >
          {saveButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
