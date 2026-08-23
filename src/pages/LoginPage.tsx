import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError('E-posta veya şifre hatalı.');
      return;
    }

    navigate('/magaza-baglantisi');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hb-bg px-5 py-12 sm:px-8">
      <Link to="/" className="mb-10 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-hb-primary font-serif text-lg font-semibold text-hb-bg">
          H
        </span>
        <span className="font-serif text-xl font-semibold text-hb-text">HakBul</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-hb-border bg-hb-surface p-7 sm:p-8">
        <h1 className="font-serif text-2xl font-semibold text-hb-text">Giriş yap</h1>
        <p className="mt-2 text-sm text-hb-muted">Hesabına giriş yap ve taramaya devam et.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-hb-muted">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-hb-border bg-hb-bg px-4 py-2.5 text-sm text-hb-text outline-none transition-colors placeholder:text-hb-muted/60 focus:border-hb-primary"
              placeholder="ornek@magaza.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-hb-muted">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-hb-border bg-hb-bg px-4 py-2.5 text-sm text-hb-text outline-none transition-colors placeholder:text-hb-muted/60 focus:border-hb-primary"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-hb-secondary/30 bg-hb-secondary/10 px-3 py-2.5 text-sm text-hb-secondary">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-hb-primary px-4 py-3 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Giriş yap <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-hb-muted">
          Hesabın yok mu?{' '}
          <Link to="/kayit" className="font-medium text-hb-primary hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
}
