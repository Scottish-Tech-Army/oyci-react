import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';
import axios from 'axios';

type Gender = 'male' | 'female' | 'other';

interface SignupForm {
  emailId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  gender: Gender | '';
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  emailId?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  password?: string;
  confirmPassword?: string;
}

const SignupPage = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState<SignupForm>({
    emailId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.emailId.trim()) e.emailId = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.emailId)) e.emailId = 'Enter a valid email';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.gender) e.gender = 'Please select a gender';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
    setSuccess('');
  };

  const handleGender = (value: Gender) => {
    setForm((prev) => ({ ...prev, gender: value }));
    setErrors((prev) => ({ ...prev, gender: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { emailId, firstName, middleName, lastName, phoneNumber, gender, password } = form;
      await API.post('/auth/register', {
        emailId,
        firstName,
        middleName: middleName || undefined,
        lastName,
        phoneNumber: phoneNumber || undefined,
        gender,
        password,
      });
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? 'Registration failed. Please try again.');
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
          id="theme-toggle-btn-signup"
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
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Fill in your details below to get started</p>

        {/* Alerts */}
        {apiError && (
          <div className="alert alert-error" role="alert">
            ⚠️ {apiError}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="status">
            ✅ {success}
          </div>
        )}

        {/* Form */}
        <form id="signup-form" onSubmit={handleSubmit} noValidate>

          {/* Name Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="signup-firstName">
                First Name <span className="required">*</span>
              </label>
              <input
                id="signup-firstName"
                type="text"
                name="firstName"
                className={`form-input ${errors.firstName ? 'error' : ''}`}
                placeholder="John"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
              />
              {errors.firstName && <span className="form-error">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-middleName">
                Middle Name
              </label>
              <input
                id="signup-middleName"
                type="text"
                name="middleName"
                className="form-input"
                placeholder="(optional)"
                value={form.middleName}
                onChange={handleChange}
                autoComplete="additional-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-lastName">
              Last Name <span className="required">*</span>
            </label>
            <input
              id="signup-lastName"
              type="text"
              name="lastName"
              className={`form-input ${errors.lastName ? 'error' : ''}`}
              placeholder="Doe"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
            />
            {errors.lastName && <span className="form-error">{errors.lastName}</span>}
          </div>

          {/* Contact Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">
                Email ID <span className="required">*</span>
              </label>
              <input
                id="signup-email"
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
              <label className="form-label" htmlFor="signup-phone">
                Phone Number
              </label>
              <input
                id="signup-phone"
                type="tel"
                name="phoneNumber"
                className="form-input"
                placeholder="+1 234 567 890"
                value={form.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="form-group">
            <label className="form-label">
              Gender <span className="required">*</span>
            </label>
            <div className="gender-group">
              {(['male', 'female', 'other'] as Gender[]).map((g) => (
                <div className="gender-option" key={g}>
                  <input
                    type="radio"
                    id={`gender-${g}`}
                    name="gender"
                    value={g}
                    checked={form.gender === g}
                    onChange={() => handleGender(g)}
                  />
                  <label htmlFor={`gender-${g}`}>
                    {g === 'male' ? '♂ Male' : g === 'female' ? '♀ Female' : '⚧ Other'}
                  </label>
                </div>
              ))}
            </div>
            {errors.gender && <span className="form-error">{errors.gender}</span>}
          </div>

          <div className="form-divider" />

          {/* Password Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">
                Password <span className="required">*</span>
              </label>
              <input
                id="signup-password"
                type="password"
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirmPassword">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                id="signup-confirmPassword"
                type="password"
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading && <span className="btn-spinner" />}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" id="go-to-login-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
