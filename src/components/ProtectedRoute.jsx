import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted">Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
