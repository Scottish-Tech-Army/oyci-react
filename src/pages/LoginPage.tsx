import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import axios from 'axios';

interface LoginForm {
  emailId: string;
  password: string;
}

interface FormErrors {
  emailId?: string;
  password?: string;
}

const LoginPage = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginForm>({ emailId: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.emailId.trim()) newErrors.emailId = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.emailId)) newErrors.emailId = 'Enter a valid email';
    if (!form.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      if (data.role === 'admin') {
        navigate('/admin/dashboard/staff');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? 'Login failed. Please try again.');
      } else {
        setApiError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🚀</div>
          <span className="auth-logo-text">MyApp</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {/* API Error Alert */}
        {apiError && (
          <div className="alert alert-error" role="alert">
            ⚠️ {apiError}
          </div>
        )}

        {/* Form */}
        <form id="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              name="emailId"
              className={`form-input ${errors.emailId ? 'error' : ''}`}
              placeholder="you@example.com"
              value={form.emailId}
              onChange={handleChange}
              autoComplete="email"
            />
            {errors.emailId && <span className="form-error">{errors.emailId}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password <span className="required">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading && <span className="btn-spinner" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" id="go-to-signup-link">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
