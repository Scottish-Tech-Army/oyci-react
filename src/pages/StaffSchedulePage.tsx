import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, Alert,
} from '@mui/material';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { EventInstance, EventStatus } from '../types';

const STATUS_COLORS: Record<EventStatus, 'default' | 'warning' | 'success' | 'info' | 'error'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  STAFFED: 'info',
  COMPLETED: 'info',
  CANCELLED: 'error',
};

export default function StaffSchedulePage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await api.get<EventInstance[]>(`/staff/${user.id}/schedule`);
      setSchedule(data);
    } catch {
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>My Schedule</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedule.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell>{ev.eventTypeName ?? ev.eventTypeId}</TableCell>
                <TableCell>{ev.locationName ?? ev.locationId}</TableCell>
                <TableCell>{ev.date}</TableCell>
                <TableCell>{ev.startTime} – {ev.endTime}</TableCell>
                <TableCell>
                  <Chip label={ev.status} color={STATUS_COLORS[ev.status]} size="small" />
                </TableCell>
              </TableRow>
            ))}
            {schedule.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">No upcoming events</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

