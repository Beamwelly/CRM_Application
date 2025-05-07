import { Navigate, useLocation } from 'react-router-dom';
import { useCRM } from '@/context/hooks';
import { Role } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useCRM();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    // Redirect to dashboard if authenticated but not authorized for this route
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
