import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-aqua border-t-transparent shadow-glow-aqua" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}