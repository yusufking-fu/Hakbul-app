import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { generateMockOrders } from '@/lib/generateMockOrders';
import { syncTrendyolOrders, testFinanceEndpoints } from '@/lib/trendyolApi';
import type { SirketTuru } from '@/lib/hakedisHesapla';

export default function StoreConnectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [supplierId, setSupplierId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [sirketTuru, setSirketTuru] = useState<SirketTuru>('sahis');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [usedMock, setUsedMock] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId.trim() || !apiKey.trim() || !apiSecret.trim()) {
      setError('Lütfen tüm alanları doldur.');
      return;
    }

    setLoading(true);
    setStatusText('Mağaza kaydediliyor…');

    // 1. Mağaza kaydı oluştur
    const { data: magazaData, error: insertError } = await supabase
      .from('magazalar')
      .insert({
        kullanici_id: user?.id,
        platform: 'trendyol',
        supplier_id: supplierId,
        api_key: apiKey,
        api_secret: apiSecret,
        sirket_turu: sirketTuru,
        baglanti_durumu: 'bekliyor',
      })
      .select()
      .single();

    if (insertError || !magazaData) {
      setLoading(false);
      setError('Bağlantı kaydedilemedi. Lütfen tekrar dene.');
      return;
    }

    // 2. Gerçek Trendyol API'sinden sipariş çekmeyi dene
    setStatusText('Trendyol API\'sine bağlanılıyor…');
    let syncSuccess = false;

    try {
      const syncResult = await syncTrendyolOrders(magazaData.id);
      if (syncResult.success) {
        syncSuccess = true;
        setStatusText(`${syncResult.ordersCount} sipariş çekildi. Hakediş hesaplanıyor…`);

        // Finans endpoint'lerini arka planda test et (sonuçları konsola yaz)
        testFinanceEndpoints(magazaData.id).then((financeResult) => {
          if (financeResult.success && financeResult.results) {
            console.log('=== Trendyol Finans Endpoint Test Sonuçları ===');
            if (financeResult.results.settlements) {
              console.log('Settlements:', financeResult.results.settlements);
            }
            if (financeResult.results.otherFinancials) {
              console.log('Other Financials:', financeResult.results.otherFinancials);
            }
            console.log('=== Test Sonu ===');
          }
        });

        // Hakediş dönemi ve fark kalemleri oluştur (hesaplama motorunu çalıştır)
        // Gerçek çekilen siparişler üzerinden hesaplama yap
        await generateMockOrders(magazaData.id, sirketTuru);
      } else {
        // API başarısız — mock veriye geri dön
        setStatusText('API bağlantısı başarısız, örnek veriyle devam ediliyor…');
        await supabase
          .from('magazalar')
          .update({ baglanti_durumu: 'mock' })
          .eq('id', magazaData.id);
        await generateMockOrders(magazaData.id, sirketTuru);
        setUsedMock(true);
      }
    } catch {
      // Beklenmeyen hata — mock veriye geri dön
      setStatusText('API bağlantısı başarısız, örnek veriyle devam ediliyor…');
      await supabase
        .from('magazalar')
        .update({ baglanti_durumu: 'mock' })
        .eq('id', magazaData.id);
      await generateMockOrders(magazaData.id, sirketTuru);
      setUsedMock(true);
    }

    setLoading(false);
    setSuccess(true);
    setStatusText('Dashboard\'a yönlendiriliyorsun…');
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  return (
    <div className="min-h-screen bg-hb-bg px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-hb-muted transition-colors hover:text-hb-text"
        >
          <ArrowLeft size={16} />
          Ana sayfa
        </Link>

        <div className="rounded-2xl border border-hb-border bg-hb-surface p-7 sm:p-8">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-hb-text">Trendyol'a Bağlan</h1>
            <p className="mt-2 text-sm leading-relaxed text-hb-muted">
              API bilgilerin salt okunur, mağaza ayarlarına hiçbir müdahalede bulunmuyoruz.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-hb-primary/15 text-hb-primary">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="font-serif text-xl font-semibold text-hb-text">Bağlantı başarılı</h2>
              <p className="mt-2 text-sm text-hb-muted">{statusText}</p>
              {usedMock && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-hb-secondary/30 bg-hb-secondary/10 px-3 py-2.5 text-xs text-hb-secondary">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Trendyol API'sine bağlanılamadı, örnek veriyle devam ediliyor. Gerçek API
                    entegrasyonu için Trendyol Satıcı Paneli'nden API erişimini doğrula.
                  </span>
                </div>
              )}
              <Loader2 size={18} className="mt-4 animate-spin text-hb-primary" />
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-hb-muted">Supplier ID</label>
                  <input
                    type="text"
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-hb-border bg-hb-bg px-4 py-2.5 text-sm text-hb-text outline-none transition-colors placeholder:text-hb-muted/60 focus:border-hb-primary"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-hb-muted">API Key</label>
                  <input
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-lg border border-hb-border bg-hb-bg px-4 py-2.5 text-sm text-hb-text outline-none transition-colors placeholder:text-hb-muted/60 focus:border-hb-primary"
                    placeholder="api_key_degeri"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-hb-muted">API Secret</label>
                  <input
                    type="password"
                    required
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full rounded-lg border border-hb-border bg-hb-bg px-4 py-2.5 text-sm text-hb-text outline-none transition-colors placeholder:text-hb-muted/60 focus:border-hb-primary"
                    placeholder="••••••••••••"
                  />
                </div>

                {/* Şirket türü seçimi */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-hb-muted">Şirket türü</label>
                  <p className="mb-3 text-xs text-hb-muted/70">
                    Stopaj hesaplamasında kullanılır. Şahıs şirketinde stopaj uygulanır.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors ${
                        sirketTuru === 'sahis'
                          ? 'border-hb-primary bg-hb-primary/10'
                          : 'border-hb-border bg-hb-bg hover:border-hb-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sirket-turu"
                        value="sahis"
                        checked={sirketTuru === 'sahis'}
                        onChange={() => setSirketTuru('sahis')}
                        className="h-4 w-4 accent-hb-primary"
                      />
                      <span className="text-sm text-hb-text">Şahıs Şirketi</span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors ${
                        sirketTuru === 'limited'
                          ? 'border-hb-primary bg-hb-primary/10'
                          : 'border-hb-border bg-hb-bg hover:border-hb-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sirket-turu"
                        value="limited"
                        checked={sirketTuru === 'limited'}
                        onChange={() => setSirketTuru('limited')}
                        className="h-4 w-4 accent-hb-primary"
                      />
                      <span className="text-sm text-hb-text">Limited / Anonim</span>
                    </label>
                  </div>
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
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {statusText}
                    </>
                  ) : (
                    'Bağlan'
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-hb-border bg-hb-bg/40 px-4 py-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-hb-primary" />
                <p className="text-xs leading-relaxed text-hb-muted">
                  Bağlantı sadece hakediş verilerini okumak için kullanılır. Mağaza ayarlarına, ürün
                  fiyatlarına veya sipariş durumuna asla dokunmayız.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
