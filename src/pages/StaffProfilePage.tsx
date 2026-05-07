import { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Button, TextField, Alert, CircularProgress, Chip,
  Card, CardContent, Grid, IconButton, Autocomplete, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Staff, Tag, AvailabilityWindow, Holiday, DayOfWeek } from "../types";

const DAYS: DayOfWeek[] = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

export default function StaffProfilePage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [savingAvail, setSavingAvail] = useState(false);
  const [maxHours, setMaxHours] = useState(40);
  const [savingHours, setSavingHours] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const staffUrl = (suffix = '') => '/staff/' + user?.id + suffix;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [staffRes, tagsRes, holRes] = await Promise.all([
        api.get<Staff>(staffUrl()),
        api.get<Tag[]>('/tags'),
        api.get<Holiday[]>(staffUrl('/holidays')),
      ]);
      setStaff(staffRes.data);
      setAllTags(tagsRes.data);
      setHolidays(holRes.data);
      setWindows(staffRes.data.availability ?? []);
      setMaxHours(staffRes.data.maxHoursPerWeek ?? 40);
      setSelectedTags(staffRes.data.tags ?? []);
    } catch { setError('Failed to load profile'); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const addWindow = () => { setWindows((w) => [...w, { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' }]); };
  const updateWindow = (index: number, field: keyof AvailabilityWindow, value: string) => { setWindows((w) => w.map((item, i) => i === index ? { ...item, [field]: value } : item)); };
  const removeWindow = (index: number) => { setWindows((w) => w.filter((_, i) => i !== index)); };

  const saveAvailability = async () => {
    if (!user?.id) return;
    setSavingAvail(true); setError('');
    try { await api.put(staffUrl('/availability'), { windows }); showSuccess('Availability updated'); load(); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; setError(msg || 'Failed to update availability'); }
    finally { setSavingAvail(false); }
  };

  const saveMaxHours = async () => {
    if (!user?.id) return;
    setSavingHours(true); setError('');
    try { await api.put(staffUrl('/max-hours'), { maxHoursPerWeek: maxHours }); showSuccess('Max hours updated'); load(); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; setError(msg || 'Failed to update max hours'); }
    finally { setSavingHours(false); }
  };

  const saveTags = async () => {
    if (!user?.id) return;
    setSavingTags(true); setError('');
    try { await api.put(staffUrl('/tags'), { tagIds: selectedTags.map((t) => t.id) }); showSuccess('Tags updated'); load(); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; setError(msg || 'Failed to update tags'); }
    finally { setSavingTags(false); }
  };

  const addHoliday = async () => {
    if (!user?.id || !newHolidayDate) return;
    setError('');
    try { await api.post(staffUrl('/holidays'), { date: newHolidayDate }); setNewHolidayDate(''); setHolidayDialogOpen(false); showSuccess('Holiday added'); load(); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; setError(msg || 'Failed to add holiday'); }
  };

  const removeHoliday = async (date: string) => {
    if (!user?.id) return;
    setError('');
    try { await api.delete(staffUrl('/holidays'), { data: { date } }); showSuccess('Holiday removed'); load(); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; setError(msg || 'Failed to remove holiday'); }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>My Profile</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {staff && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Typography variant="subtitle2" color="text.secondary">Name</Typography>
              <Typography mb={1}>{staff.name}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography>{staff.email}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>Max Hours Per Week</Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField type="number" size="small" value={maxHours} onChange={(e) => setMaxHours(Number(e.target.value))} sx={{ width: 120 }} />
                <Button variant="contained" size="small" onClick={saveMaxHours} disabled={savingHours}>{savingHours ? 'Saving...' : 'Save'}</Button>
              </Box>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>Qualifications / Tags</Typography>
              <Autocomplete multiple options={allTags} getOptionLabel={(o) => o.name} value={selectedTags} onChange={(_, v) => setSelectedTags(v)} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={(params) => <TextField {...params} size="small" />} />
              <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={saveTags} disabled={savingTags}>{savingTags ? 'Saving...' : 'Save Tags'}</Button>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Holidays</Typography>
                <Button size="small" startIcon={<Add />} onClick={() => setHolidayDialogOpen(true)}>Add</Button>
              </Box>
              {holidays.length > 0 ? (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {holidays.map((h) => (<Chip key={h.id} label={h.date} onDelete={() => removeHoliday(h.date)} />))}
                </Box>
              ) : (<Typography variant="body2" color="text.secondary">No holidays set</Typography>)}
            </CardContent></Card>
          </Grid>
          <Grid item xs={12}>
            <Card><CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Weekly Availability</Typography>
                <Box display="flex" gap={1}>
                  <Button size="small" startIcon={<Add />} onClick={addWindow}>Add Window</Button>
                  <Button variant="contained" size="small" onClick={saveAvailability} disabled={savingAvail}>{savingAvail ? 'Saving...' : 'Save Availability'}</Button>
                </Box>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead><TableRow><TableCell>Day</TableCell><TableCell>Start Time</TableCell><TableCell>End Time</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                  <TableBody>
                    {windows.map((w, i) => (
                      <TableRow key={i}>
                        <TableCell><FormControl size="small" fullWidth><InputLabel>Day</InputLabel><Select value={w.dayOfWeek} label="Day" onChange={(e) => updateWindow(i, 'dayOfWeek', e.target.value)}>{DAYS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</Select></FormControl></TableCell>
                        <TableCell><TextField type="time" size="small" value={w.startTime} onChange={(e) => updateWindow(i, 'startTime', e.target.value)} /></TableCell>
                        <TableCell><TextField type="time" size="small" value={w.endTime} onChange={(e) => updateWindow(i, 'endTime', e.target.value)} /></TableCell>
                        <TableCell align="right"><IconButton size="small" color="error" onClick={() => removeWindow(i)}><Delete /></IconButton></TableCell>
                      </TableRow>
                    ))}
                    {windows.length === 0 && (<TableRow><TableCell colSpan={4} align="center">No availability windows</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}
      <Dialog open={holidayDialogOpen} onClose={() => setHolidayDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Holiday</DialogTitle>
        <DialogContent>
          <TextField label="Date" type="date" fullWidth margin="normal" InputLabelProps={{ shrink: true }} value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHolidayDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addHoliday} disabled={!newHolidayDate}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}