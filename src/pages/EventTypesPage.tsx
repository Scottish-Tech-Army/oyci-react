import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, CircularProgress, Chip, Autocomplete,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../api/client';
import type { EventType, EventTypeRequest, Tag } from '../types';

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState<EventTypeRequest>({ name: '', durationMinutes: 60, description: '', requiredTagIds: [], minStaff: 1 });
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [etRes, tagRes] = await Promise.all([
        api.get<EventType[]>('/event-types'),
        api.get<Tag[]>('/tags'),
      ]);
      setEventTypes(etRes.data);
      setAllTags(tagRes.data);
    } catch {
      setError('Failed to load event types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', durationMinutes: 60, description: '', requiredTagIds: [], minStaff: 1 });
    setSelectedTags([]);
    setDialogOpen(true);
  };

  const openEdit = (et: EventType) => {
    setEditing(et);
    setForm({
      name: et.name, durationMinutes: et.durationMinutes, description: et.description ?? '',
      requiredTagIds: et.requiredTags?.map((t) => t.id) ?? [], minStaff: et.minStaff ?? 1,
    });
    setSelectedTags(et.requiredTags ?? []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, requiredTagIds: selectedTags.map((t) => t.id) };
      if (editing) {
        await api.put(`/event-types/${editing.id}`, payload);
      } else {
        await api.post('/event-types', payload);
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save event type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event type?')) return;
    try {
      await api.delete(`/event-types/${id}`);
      load();
    } catch {
      setError('Failed to delete event type');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Event Types</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Event Type</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Duration (min)</TableCell>
              <TableCell>Min Staff</TableCell>
              <TableCell>Required Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventTypes.map((et) => (
              <TableRow key={et.id}>
                <TableCell>{et.name}</TableCell>
                <TableCell>{et.durationMinutes}</TableCell>
                <TableCell>{et.minStaff ?? '—'}</TableCell>
                <TableCell>
                  {et.requiredTags?.map((t) => <Chip key={t.id} label={t.name} size="small" sx={{ mr: 0.5 }} />) ?? '—'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(et)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(et.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {eventTypes.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No event types found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Event Type' : 'Create Event Type'}</DialogTitle>
        <DialogContent>
          <TextField label="Name" fullWidth required margin="normal" inputProps={{ maxLength: 200 }}
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="Description" fullWidth multiline rows={3} margin="normal"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <TextField label="Duration (minutes)" type="number" fullWidth required margin="normal"
            value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
          <TextField label="Minimum Staff" type="number" fullWidth margin="normal"
            value={form.minStaff} onChange={(e) => setForm((f) => ({ ...f, minStaff: Number(e.target.value) }))} />
          <Autocomplete
            multiple
            options={allTags}
            getOptionLabel={(o) => o.name}
            value={selectedTags}
            onChange={(_, v) => setSelectedTags(v)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Required Tags" margin="normal" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
