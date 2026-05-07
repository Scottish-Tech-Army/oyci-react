import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Grid,
  Chip, Alert, CircularProgress,
} from '@mui/material';
import { Event, LocationOn, AccessTime, People } from '@mui/icons-material';
import api from '../api/client';
import type { EventInstance } from '../types';

export default function BrowseEventsPage() {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<EventInstance[]>('/participant/events');
      setEvents(data);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async (id: number) => {
    setError('');
    setSuccess('');
    setActionLoading(id);
    try {
      await api.post(`/participant/events/${id}/register`);
      setSuccess('Successfully registered for event!');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to register');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel your registration?')) return;
    setError('');
    setSuccess('');
    setActionLoading(id);
    try {
      await api.delete(`/participant/events/${id}/register`);
      setSuccess('Registration cancelled');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to cancel registration');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Browse Events</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {events.length === 0 ? (
        <Typography variant="body1" color="text.secondary">No published events available at the moment.</Typography>
      ) : (
        <Grid container spacing={3}>
          {events.map((ev) => {
            const spotsLeft = ev.maxParticipants != null
              ? ev.maxParticipants - (ev.registeredParticipants ?? 0)
              : null;
            const isFull = spotsLeft != null && spotsLeft <= 0;

            return (
              <Grid item xs={12} sm={6} md={4} key={ev.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {ev.eventTypeName ?? `Event #${ev.id}`}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {ev.locationName ?? `Location #${ev.locationId}`}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Event fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">{ev.date}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {ev.startTime} – {ev.endTime}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <People fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {ev.registeredParticipants ?? 0}
                        {ev.maxParticipants != null ? ` / ${ev.maxParticipants}` : ''} registered
                      </Typography>
                    </Box>
                    {isFull && <Chip label="FULL" color="error" size="small" sx={{ mt: 1 }} />}
                    {spotsLeft != null && !isFull && (
                      <Chip label={`${spotsLeft} spots left`} color="success" size="small" sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      disabled={isFull || actionLoading === ev.id}
                      onClick={() => handleRegister(ev.id)}
                    >
                      {actionLoading === ev.id ? 'Processing…' : 'Register'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      fullWidth
                      disabled={actionLoading === ev.id}
                      onClick={() => handleCancel(ev.id)}
                    >
                      Cancel
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

