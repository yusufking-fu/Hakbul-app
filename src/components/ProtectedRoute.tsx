import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hb-bg">
        <Loader2 size={28} className="animate-spin text-hb-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/giris" replace />;
  }

  return <>{children}</>;
}
