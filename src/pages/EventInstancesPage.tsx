import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, CircularProgress, Chip, MenuItem,
  Select, FormControl, InputLabel, Grid, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import { Add, Edit, Delete, Publish, PersonAdd, PersonRemove } from '@mui/icons-material';
import api from '../api/client';
import type {
  EventInstance, EventInstanceRequest, EventType, Location as Loc,
  EventStatus, AvailableStaff,
} from '../types';

const STATUS_COLORS: Record<EventStatus, 'default' | 'warning' | 'success' | 'info' | 'error'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  STAFFED: 'info',
  COMPLETED: 'info',
  CANCELLED: 'error',
};

const emptyForm: EventInstanceRequest = {
  eventTypeId: 0, locationId: 0, date: '', startTime: '', endTime: '', maxParticipants: undefined,
};

export default function EventInstancesPage() {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<EventStatus | ''>('');

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventInstance | null>(null);
  const [form, setForm] = useState<EventInstanceRequest>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Staffing dialog
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [staffEvent, setStaffEvent] = useState<EventInstance | null>(null);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (filterStatus) params.status = filterStatus;

      const [evRes, etRes, locRes] = await Promise.all([
        api.get<EventInstance[]>('/event-instances', { params }),
        api.get<EventType[]>('/event-types'),
        api.get<Loc[]>('/locations'),
      ]);
      setEvents(evRes.data);
      setEventTypes(etRes.data);
      setLocations(locRes.data);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ev: EventInstance) => {
    setEditing(ev);
    setForm({
      eventTypeId: ev.eventTypeId, locationId: ev.locationId, date: ev.date,
      startTime: ev.startTime, endTime: ev.endTime, maxParticipants: ev.maxParticipants,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/event-instances/${editing.id}`, form);
      } else {
        await api.post('/event-instances', form);
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event instance?')) return;
    try {
      await api.delete(`/event-instances/${id}`);
      load();
    } catch {
      setError('Failed to delete event');
    }
  };

  const handlePublish = async (id: number) => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/event-instances/${id}/publish`);
      setSuccess('Event published successfully');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to publish event');
    }
  };

  const openStaffing = async (ev: EventInstance) => {
    setStaffEvent(ev);
    setLoadingStaff(true);
    setStaffDialogOpen(true);
    try {
      const { data } = await api.get<AvailableStaff[]>(`/event-instances/${ev.id}/available-staff`);
      setAvailableStaff(data);
    } catch {
      setError('Failed to load available staff');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAssign = async (staffId: number) => {
    if (!staffEvent) return;
    setError('');
    try {
      await api.post(`/event-instances/${staffEvent.id}/assign`, { staffId });
      setSuccess('Staff assigned');
      // Refresh event detail and available staff
      const [evRes, asRes] = await Promise.all([
        api.get<EventInstance>(`/event-instances/${staffEvent.id}`),
        api.get<AvailableStaff[]>(`/event-instances/${staffEvent.id}/available-staff`),
      ]);
      setStaffEvent(evRes.data);
      setAvailableStaff(asRes.data);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to assign staff');
    }
  };

  const handleUnassign = async (staffId: number) => {
    if (!staffEvent) return;
    setError('');
    try {
      await api.delete(`/event-instances/${staffEvent.id}/assign/${staffId}`);
      setSuccess('Staff unassigned');
      const evRes = await api.get<EventInstance>(`/event-instances/${staffEvent.id}`);
      setStaffEvent(evRes.data);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to unassign staff');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Event Instances</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Create Event</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField label="From" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="To" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status"
                onChange={(e) => setFilterStatus(e.target.value as EventStatus | '')}>
                <MenuItem value="">All</MenuItem>
                {(['DRAFT', 'PUBLISHED', 'STAFFED', 'COMPLETED', 'CANCELLED'] as EventStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button variant="outlined" onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterStatus(''); }}>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Participants</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell>{ev.eventTypeName ?? ev.eventTypeId}</TableCell>
                <TableCell>{ev.locationName ?? ev.locationId}</TableCell>
                <TableCell>{ev.date}</TableCell>
                <TableCell>{ev.startTime} – {ev.endTime}</TableCell>
                <TableCell>
                  <Chip label={ev.status} color={STATUS_COLORS[ev.status]} size="small" />
                </TableCell>
                <TableCell>{ev.assignedStaff?.length ?? 0}</TableCell>
                <TableCell>
                  {ev.registeredParticipants ?? 0}{ev.maxParticipants ? ` / ${ev.maxParticipants}` : ''}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Manage Staff">
                    <IconButton size="small" onClick={() => openStaffing(ev)}><PersonAdd /></IconButton>
                  </Tooltip>
                  {ev.status === 'DRAFT' && (
                    <Tooltip title="Publish">
                      <IconButton size="small" color="success" onClick={() => handlePublish(ev.id)}><Publish /></IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(ev)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDelete(ev.id)}><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">No events found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Event Instance' : 'Create Event Instance'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Event Type</InputLabel>
            <Select value={form.eventTypeId || ''} label="Event Type"
              onChange={(e) => setForm((f) => ({ ...f, eventTypeId: Number(e.target.value) }))}>
              {eventTypes.map((et) => <MenuItem key={et.id} value={et.id}>{et.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Location</InputLabel>
            <Select value={form.locationId || ''} label="Location"
              onChange={(e) => setForm((f) => ({ ...f, locationId: Number(e.target.value) }))}>
              {locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Date" type="date" fullWidth required margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <TextField label="Start Time" type="time" fullWidth required margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          <TextField label="End Time" type="time" fullWidth required margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          <TextField label="Max Participants (optional)" type="number" fullWidth margin="normal"
            value={form.maxParticipants ?? ''} onChange={(e) => setForm((f) => ({
              ...f, maxParticipants: e.target.value ? Number(e.target.value) : undefined,
            }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={saving || !form.eventTypeId || !form.locationId || !form.date || !form.startTime || !form.endTime}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staffing Dialog */}
      <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Staff — {staffEvent?.eventTypeName} ({staffEvent?.date})
        </DialogTitle>
        <DialogContent>
          {/* Currently Assigned */}
          <Typography variant="h6" gutterBottom>Assigned Staff</Typography>
          {staffEvent?.assignedStaff && staffEvent.assignedStaff.length > 0 ? (
            <List dense>
              {staffEvent.assignedStaff.map((s) => (
                <ListItem key={s.id}>
                  <ListItemText primary={s.name} secondary={s.email} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" color="error" onClick={() => handleUnassign(s.id)}>
                      <PersonRemove />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" mb={2}>No staff assigned yet</Typography>
          )}

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Available Staff</Typography>
          {loadingStaff ? <CircularProgress size={24} /> : (
            availableStaff.length > 0 ? (
              <List dense>
                {availableStaff.map((as) => (
                  <ListItem key={as.staff.id} sx={{
                    bgcolor: as.warnings.length > 0 ? 'warning.light' : undefined,
                    borderRadius: 1, mb: 0.5,
                  }}>
                    <ListItemText
                      primary={as.staff.name}
                      secondary={
                        <>
                          {as.staff.email}
                          {as.warnings.length > 0 && (
                            <Typography variant="caption" color="warning.dark" display="block">
                              ⚠ {as.warnings.join(', ')}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" color="primary" onClick={() => handleAssign(as.staff.id)}>
                        <PersonAdd />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No available staff</Typography>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaffDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
