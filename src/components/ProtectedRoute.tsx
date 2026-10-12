import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useDemoMode } from '@/lib/demoMode';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { isDemo } = useDemoMode();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hb-bg">
        <Loader2 size={28} className="animate-spin text-hb-primary" />
      </div>
    );
  }

  if (!session && !isDemo) {
    return <Navigate to="/giris" replace />;
  }

  return <>{children}</>;
}

export function DemoEntryRoute() {
  const { enterDemo } = useDemoMode();
  const navigate = useNavigate();

  useEffect(() => {
    enterDemo();
    navigate('/dashboard', { replace: true });
  }, [enterDemo, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hb-bg">
      <Loader2 size={28} className="animate-spin text-hb-primary" />
    </div>
  );
}
