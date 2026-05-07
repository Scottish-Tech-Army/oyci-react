import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Link,
} from '@mui/material';
import api from '../api/client';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', dateOfBirth: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
      <Card sx={{ maxWidth: 420, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Register as a participant
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField label="Full Name" fullWidth required margin="normal" inputProps={{ maxLength: 150 }}
              value={form.name} onChange={set('name')} />
            <TextField label="Email" type="email" fullWidth required margin="normal" inputProps={{ maxLength: 200 }}
              value={form.email} onChange={set('email')} />
            <TextField label="Password" type="password" fullWidth required margin="normal"
              value={form.password} onChange={set('password')} />
            <TextField label="Date of Birth" type="date" fullWidth required margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Registering…' : 'Register'}
            </Button>
          </Box>
          <Typography variant="body2" textAlign="center" mt={2}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Sign In</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
