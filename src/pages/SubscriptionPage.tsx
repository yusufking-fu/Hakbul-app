import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatTL } from '@/lib/format';

const ABONELIK_TUTAR = 500;

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [polling, setPolling] = useState(false);
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const startPayment = async () => {
    setError(null);
    setLoading(true);
    setPaymentStatus('processing');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        setLoading(false);
        setPaymentStatus('failed');
        return;
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paytr-baslat`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: user?.email,
          origin: window.location.origin,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('PayTR başlatma hatası:', data);
        setError(data.error || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.');
        setLoading(false);
        setPaymentStatus('failed');
        return;
      }

      const paytrIframeUrl = `https://www.paytr.com/odeme/api/iFrame/${data.token}`;
      setIframeUrl(paytrIframeUrl);
      setLoading(false);

      // 15 saniye timeout — iFrame açılmazsa hata göster
      iframeTimeoutRef.current = setTimeout(() => {
        if (paymentStatus === 'processing') {
          setError('Ödeme sayfası açılamadı (zaman aşımı). Lütfen tekrar deneyin.');
          setIframeUrl(null);
          setPaymentStatus('failed');
        }
      }, 15000);

      startPollingSubscription(data.merchantOid);
    } catch (err) {
      console.error('Ödeme başlatma hatası:', err);
      setError('Ödeme başlatılamadı. Lütfen tekrar deneyin.');
      setLoading(false);
      setPaymentStatus('failed');
    }
  };

  const startPollingSubscription = (merchantOid: string) => {
    setPolling(true);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data: abonelik } = await supabase
          .from('abonelikler')
          .select('durum')
          .eq('paytr_islem_no', merchantOid)
          .maybeSingle();

        if (abonelik?.durum === 'aktif') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPolling(false);
          setPaymentStatus('success');
          setIframeUrl(null);
          setTimeout(() => navigate('/dashboard'), 2000);
        } else if (abonelik?.durum === 'basarisiz') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPolling(false);
          setPaymentStatus('failed');
          setIframeUrl(null);
          setError('Ödeme başarısız oldu. Lütfen tekrar deneyin.');
        }
      } catch (err) {
        console.error('Abonelik durumu kontrol hatası:', err);
      }
    }, 3000);

    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        setPolling(false);
      }
    }, 5 * 60 * 1000);
  };

  const closeIframe = () => {
    setIframeUrl(null);
    setPaymentStatus('idle');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      setPolling(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-hb-bg px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-hb-border bg-hb-surface p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-hb-primary/15 text-hb-primary">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-hb-text">Aboneliğin aktif!</h1>
            <p className="mt-2 text-sm text-hb-muted">
              Ödemeniz alındı. Dashboard'a yönlendiriliyorsun…
            </p>
            <Loader2 size={18} className="mt-4 mx-auto animate-spin text-hb-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hb-bg px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-md">
        <Link
          to="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-hb-muted transition-colors hover:text-hb-text"
        >
          <ArrowLeft size={16} />
          Dashboard'a dön
        </Link>

        <div className="rounded-2xl border border-hb-border bg-hb-surface p-7 sm:p-8">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-hb-text">Abone Ol</h1>
            <p className="mt-2 text-sm leading-relaxed text-hb-muted">
              Ücretsiz taramanı tamamladın. Detayları görmek ve itiraz taslağı oluşturmak için abone ol.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-hb-border bg-hb-bg/40 p-6 text-center">
            <p className="font-mono text-4xl font-semibold tabular-nums text-hb-primary">
              {formatTL(ABONELIK_TUTAR)}
              <span className="text-lg text-hb-muted"> / ay</span>
            </p>
            <ul className="mt-5 space-y-2 text-left">
              {[
                'Sınırsız hakediş taraması',
                'İtiraz taslağı oluşturma',
                'İtiraz süreci takibi',
                'Süre uyarı bildirimleri',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-hb-muted">
                  <CheckCircle2 size={16} className="shrink-0 text-hb-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-hb-secondary/30 bg-hb-secondary/10 px-3 py-2.5 text-sm text-hb-secondary">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {iframeUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-hb-border bg-hb-bg/40 px-4 py-2.5">
                <span className="text-sm text-hb-muted">
                  {polling ? 'Ödeme bekleniyor…' : 'Ödeme sayfası açık'}
                </span>
                <button
                  onClick={closeIframe}
                  className="flex items-center gap-1.5 text-xs text-hb-muted transition-colors hover:text-hb-text"
                >
                  <X size={14} />
                  Kapat
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-hb-border">
                <iframe
                  src={iframeUrl}
                  title="PayTR Ödeme"
                  className="h-[500px] w-full"
                  onLoad={() => {
                    if (iframeTimeoutRef.current) {
                      clearTimeout(iframeTimeoutRef.current);
                    }
                  }}
                />
              </div>
              {polling && (
                <div className="flex items-center justify-center gap-2 text-sm text-hb-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Ödeme sonucu bekleniyor…
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={startPayment}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-hb-primary px-4 py-3 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ödeme başlatılıyor…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    {formatTL(ABONELIK_TUTAR)} Öde
                  </>
                )}
              </button>

              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-hb-border bg-hb-bg/40 px-4 py-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-hb-primary" />
                <p className="text-xs leading-relaxed text-hb-muted">
                  Ödemeler PayTR'nin güvenli altyapısı üzerinden işlenir. Kart bilgilerin bizim
                  sunucularımızdan geçmez.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
