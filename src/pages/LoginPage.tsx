import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import oycLogo from '../assets/OYCI Logo 2018.svg';

interface FormValues {
  username: string;
  role: 'admin' | 'staff';
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { role: 'admin' },
  });

  const onSubmit = async ({ username, role }: FormValues) => {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(username.trim(), role);
      navigate(role === 'admin' ? '/admin' : '/staff');
    } catch {
      setLoginError('Invalid username or role. Staff users: try "aileen" or "gregor". Admin users: try "admin".');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #066633 0%, #0b8e36 60%, #27b0e7 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex justify-center mb-6">
          <img src={oycLogo} alt="OYCI – Ochils Youth Community Improvement" className="w-56 h-auto" />
        </div>
        <p className="text-center text-slate-500 text-sm mb-6">Sign in to continue</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              {...register('username', { required: 'Username is required' })}
              type="text"
              placeholder="e.g. aileen"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oyci-green"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              {...register('role')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oyci-green"
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          {loginError && (
            <p className="text-oyci-pink text-sm bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-oyci-green hover:bg-oyci-green-dark disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

