import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;