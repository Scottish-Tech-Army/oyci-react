import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'staff';
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace />;
  }

  return <Outlet />;
}
