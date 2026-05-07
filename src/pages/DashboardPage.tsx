import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import { Event, People, LocationOn, Category } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function DashboardPage() {
  const { user, isAdmin, isStaff } = useAuth();
  const [stats, setStats] = useState({ events: 0, staff: 0, locations: 0, eventTypes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const promises: Promise<{ data: unknown[] }>[] = [];
        if (isAdmin || isStaff) {
          promises.push(api.get('/event-instances'));
        }
        if (isAdmin) {
          promises.push(api.get('/staff'));
          promises.push(api.get('/locations'));
          promises.push(api.get('/event-types'));
        }
        const results = await Promise.all(promises);
        let idx = 0;
        const events = (isAdmin || isStaff) ? (results[idx++]?.data as unknown[])?.length ?? 0 : 0;
        const staff = isAdmin ? (results[idx++]?.data as unknown[])?.length ?? 0 : 0;
        const locations = isAdmin ? (results[idx++]?.data as unknown[])?.length ?? 0 : 0;
        const eventTypes = isAdmin ? (results[idx++]?.data as unknown[])?.length ?? 0 : 0;
        setStats({ events, staff, locations, eventTypes });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, isStaff]);

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  const cards = [
    { label: 'Events', value: stats.events, icon: <Event fontSize="large" color="primary" />, show: isAdmin || isStaff },
    { label: 'Staff', value: stats.staff, icon: <People fontSize="large" color="secondary" />, show: isAdmin },
    { label: 'Locations', value: stats.locations, icon: <LocationOn fontSize="large" color="success" />, show: isAdmin },
    { label: 'Event Types', value: stats.eventTypes, icon: <Category fontSize="large" color="warning" />, show: isAdmin },
  ].filter((c) => c.show);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Welcome, {user?.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Role: {user?.role}
      </Typography>
      <Grid container spacing={3}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {c.icon}
                <Box>
                  <Typography variant="h4" fontWeight={700}>{c.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
