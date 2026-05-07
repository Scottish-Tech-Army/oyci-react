import { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Card, CardContent, Grid,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import api from '../api/client';

export default function CommunicationsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSend = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/communications/notify-staff', { from, to });
      setSuccess('Schedule notifications sent to all assigned staff.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Communications</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Send Weekly Schedule Emails</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Send schedule notification emails to all staff members who have events assigned
            within the specified date range.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="From Date" type="date" fullWidth required
                InputLabelProps={{ shrink: true }}
                value={from} onChange={(e) => setFrom(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="To Date" type="date" fullWidth required
                InputLabelProps={{ shrink: true }}
                value={to} onChange={(e) => setTo(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<Send />} onClick={handleSend}
                disabled={loading || !from || !to} fullWidth size="large">
                {loading ? 'Sending…' : 'Send Notifications'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
