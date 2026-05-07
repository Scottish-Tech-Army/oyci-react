import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, CircularProgress, Grid,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../api/client';
import type { Location, LocationRequest } from '../types';

const emptyForm: LocationRequest = {
  name: '', addressLine1: '', addressLine2: '', city: '', zipCode: '',
  contactName: '', contactPhone: '', contactEmail: '', defaultCapacity: undefined,
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationRequest>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Location[]>('/locations');
      setLocations(data);
    } catch {
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field: keyof LocationRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: field === 'defaultCapacity' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (loc: Location) => {
    setEditing(loc);
    setForm({
      name: loc.name, addressLine1: loc.addressLine1 ?? '', addressLine2: loc.addressLine2 ?? '',
      city: loc.city ?? '', zipCode: loc.zipCode ?? '', contactName: loc.contactName ?? '',
      contactPhone: loc.contactPhone ?? '', contactEmail: loc.contactEmail ?? '',
      defaultCapacity: loc.defaultCapacity,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, form);
      } else {
        await api.post('/locations', form);
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this location?')) return;
    try {
      await api.delete(`/locations/${id}`);
      load();
    } catch {
      setError('Failed to delete location');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Locations</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Location</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell>{loc.name}</TableCell>
                <TableCell>{loc.city}</TableCell>
                <TableCell>{loc.contactName}</TableCell>
                <TableCell>{loc.defaultCapacity ?? '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(loc)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(loc.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {locations.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No locations found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Location' : 'Create Location'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField label="Name" fullWidth required value={form.name} onChange={set('name')} inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Address Line 1" fullWidth value={form.addressLine1} onChange={set('addressLine1')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Address Line 2" fullWidth value={form.addressLine2} onChange={set('addressLine2')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="City" fullWidth value={form.city} onChange={set('city')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Zip Code" fullWidth value={form.zipCode} onChange={set('zipCode')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Contact Name" fullWidth value={form.contactName} onChange={set('contactName')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Contact Phone" fullWidth value={form.contactPhone} onChange={set('contactPhone')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Contact Email" type="email" fullWidth value={form.contactEmail} onChange={set('contactEmail')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Default Capacity" type="number" fullWidth value={form.defaultCapacity ?? ''} onChange={set('defaultCapacity')} />
            </Grid>
          </Grid>
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
