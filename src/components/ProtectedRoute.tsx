import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useDemoMode } from '@/lib/demoMode';
import { Loader2 } from 'lucide-react';

const DEMO_ALLOWED_EMAIL = 'karaayusf2027@gmail.com';

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
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const email = session?.user?.email;
    if (!session || email !== DEMO_ALLOWED_EMAIL) {
      navigate('/', { replace: true });
      return;
    }

    enterDemo();
    navigate('/dashboard', { replace: true });
  }, [session, loading, enterDemo, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hb-bg">
      <Loader2 size={28} className="animate-spin text-hb-primary" />
    </div>
  );
}
