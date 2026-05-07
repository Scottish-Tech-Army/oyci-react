import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, CircularProgress, Chip, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import api from '../api/client';
import type { Staff, StaffCreateRequest, StaffUpdateRequest } from '../types';

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStaff, setDetailStaff] = useState<Staff | null>(null);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffCreateRequest & StaffUpdateRequest>({ name: '', email: '', password: '', maxHoursPerWeek: 40 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Staff[]>('/staff');
      setStaffList(data);
    } catch {
      setError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', maxHoursPerWeek: 40 });
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, password: '', maxHoursPerWeek: s.maxHoursPerWeek ?? 40 });
    setDialogOpen(true);
  };

  const openDetail = async (id: number) => {
    try {
      const { data } = await api.get<Staff>(`/staff/${id}`);
      setDetailStaff(data);
      setDetailOpen(true);
    } catch {
      setError('Failed to load staff details');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const payload: StaffUpdateRequest = { name: form.name, email: form.email };
        await api.put(`/staff/${editing.id}`, payload);
      } else {
        await api.post('/staff', form);
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      load();
    } catch {
      setError('Failed to delete staff');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Staff Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Staff</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Max Hours/Week</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staffList.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.maxHoursPerWeek ?? '—'}</TableCell>
                <TableCell>
                  {s.tags && s.tags.length > 0
                    ? s.tags.map((t) => <Chip key={t.id} label={t.name} size="small" sx={{ mr: 0.5 }} />)
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => openDetail(s.id)}><Visibility /></IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(s)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {staffList.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No staff found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Staff' : 'Create Staff'}</DialogTitle>
        <DialogContent>
          <TextField label="Name" fullWidth required margin="normal" inputProps={{ maxLength: 150 }}
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="Email" type="email" fullWidth required margin="normal" inputProps={{ maxLength: 200 }}
            value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          {!editing && (
            <TextField label="Password" type="password" fullWidth required margin="normal"
              value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          )}
          {!editing && (
            <TextField label="Max Hours/Week" type="number" fullWidth margin="normal"
              value={form.maxHoursPerWeek} onChange={(e) => setForm((f) => ({ ...f, maxHoursPerWeek: Number(e.target.value) }))} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.email.trim() || (!editing && !form.password?.trim())}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Staff Details</DialogTitle>
        <DialogContent>
          {detailStaff && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Name</Typography>
              <Typography mb={1}>{detailStaff.name}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography mb={1}>{detailStaff.email}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Max Hours/Week</Typography>
              <Typography mb={1}>{detailStaff.maxHoursPerWeek ?? '—'}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Tags</Typography>
              <Box mb={1}>
                {detailStaff.tags && detailStaff.tags.length > 0
                  ? detailStaff.tags.map((t) => <Chip key={t.id} label={t.name} size="small" sx={{ mr: 0.5 }} />)
                  : <Typography>—</Typography>}
              </Box>
              <Typography variant="subtitle2" color="text.secondary">Availability</Typography>
              {detailStaff.availability && detailStaff.availability.length > 0
                ? detailStaff.availability.map((a, i) => (
                    <Typography key={i} variant="body2">
                      {a.dayOfWeek}: {a.startTime} – {a.endTime}
                    </Typography>
                  ))
                : <Typography>—</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

