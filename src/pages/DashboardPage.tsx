import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatTL } from '@/lib/format';
import { CheckCircle2, AlertTriangle, LogOut, FileSpreadsheet, Loader2, Store, ArrowRight, Lock } from 'lucide-react';

interface FarkKalemi {
  id: string;
  beklenen_tutar: number;
  gercek_tutar: number;
  fark: number;
  fark_turu: string;
  siparis_id: string;
}

interface Siparis {
  id: string;
  siparis_no: string;
  urun_adi: string;
  kategori: string | null;
  satis_tutari: number;
  kargo_tutari: number;
  komisyon_orani: number;
  iade_durumu: boolean;
  teslim_tarihi: string | null;
}

interface Donem {
  id: string;
  donem_baslangic: string;
  donem_bitis: string;
  beklenen_toplam: number;
  gercek_odenen_toplam: number;
  fark_toplam: number;
  tarama_tarihi: string;
}

const farkTuruEtiketleri: Record<string, string> = {
  komisyon: 'Komisyon hatası',
  desi: 'Desi farkı',
  iade: 'İade düzeltmesi',
  diger: 'Diğer',
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [donem, setDonem] = useState<Donem | null>(null);
  const [siparisler, setSiparisler] = useState<Record<string, Siparis>>({});
  const [farkKalemleri, setFarkKalemleri] = useState<FarkKalemi[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState(true);
  const [abonelikDurumu, setAbonelikDurumu] = useState<string>('deneme');

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      // Kullanıcının abonelik durumunu kontrol et
      const { data: kullaniciData } = await supabase
        .from('kullanicilar')
        .select('abonelik_durumu')
        .eq('id', user.id)
        .maybeSingle();

      if (kullaniciData) {
        setAbonelikDurumu(kullaniciData.abonelik_durumu);
      }

      // Kullanıcının mağazasını bul
      const { data: magazalar } = await supabase
        .from('magazalar')
        .select('id')
        .eq('kullanici_id', user.id)
        .maybeSingle();

      if (!magazalar) {
        setHasStore(false);
        setLoading(false);
        return;
      }

      // En son hakediş dönemini getir
      const { data: donemData } = await supabase
        .from('hakedis_donemleri')
        .select('*')
        .eq('magaza_id', magazalar.id)
        .order('tarama_tarihi', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!donemData) {
        setLoading(false);
        return;
      }

      setDonem(donemData);

      // Fark kalemlerini getir
      const { data: farkData } = await supabase
        .from('fark_kalemleri')
        .select('*')
        .eq('donem_id', donemData.id);

      if (farkData) {
        setFarkKalemleri(farkData);

        // İlgili siparişleri getir
        const siparisIds = farkData.map((f) => f.siparis_id);
        if (siparisIds.length > 0) {
          const { data: siparisData } = await supabase
            .from('siparisler')
            .select('*')
            .in('id', siparisIds);

          if (siparisData) {
            const siparisMap: Record<string, Siparis> = {};
            siparisData.forEach((s) => {
              siparisMap[s.id] = s;
            });
            setSiparisler(siparisMap);
          }
        }
      }

      setLoading(false);
    }

    loadData();
  }, [user?.id]);

  const tutarsizlikSayisi = farkKalemleri.filter((f) => Math.abs(f.fark) >= 0.01).length;
  const toplamSiparis = farkKalemleri.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hb-bg">
        <Loader2 size={28} className="animate-spin text-hb-primary" />
      </div>
    );
  }

  if (!hasStore) {
    return (
      <div className="min-h-screen bg-hb-bg">
        <DashboardHeader email={user?.email} onSignOut={signOut} />
        <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <div className="rounded-2xl border border-hb-border bg-hb-surface p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-hb-primary/10 text-hb-primary">
              <Store size={26} />
            </div>
            <h2 className="font-serif text-xl font-semibold text-hb-text">Henüz mağaza bağlı değil</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-hb-muted">
              Hakediş taraması başlatmak için önce Trendyol mağazanı bağlaman gerekiyor.
            </p>
            <Link
              to="/magaza-baglantisi"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-hb-primary px-5 py-2.5 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Mağaza bağla <ArrowRight size={16} />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!donem) {
    return (
      <div className="min-h-screen bg-hb-bg">
        <DashboardHeader email={user?.email} onSignOut={signOut} />
        <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
          <div className="rounded-2xl border border-hb-border bg-hb-surface p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-hb-primary/10 text-hb-primary">
              <FileSpreadsheet size={26} />
            </div>
            <h2 className="font-serif text-xl font-semibold text-hb-text">Henüz tarama yok</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-hb-muted">
              Bu mağaza için henüz hakediş taraması yapılmamış.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const isTrial = abonelikDurumu !== 'aktif';

  return (
    <div className="min-h-screen bg-hb-bg">
      <DashboardHeader email={user?.email} onSignOut={signOut} />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {/* Üst özet kartı */}
        <div className="rounded-2xl border border-hb-border bg-hb-surface p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-hb-muted">
                {formatDate(donem.donem_baslangic)} — {formatDate(donem.donem_bitis)}
              </p>
              <p className="mt-1 text-sm text-hb-muted">Toplam bulunan fark</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-hb-primary sm:text-5xl">
                {formatTL(Number(donem.fark_toplam))}
              </p>
            </div>
            <div className="text-sm text-hb-muted">
              <span className="font-medium text-hb-text">{toplamSiparis} siparişten</span>{' '}
              <span className="font-medium text-hb-secondary">{tutarsizlikSayisi} tanesinde</span>{' '}
              tutarsızlık bulundu
            </div>
          </div>
        </div>

        {/* Sipariş listesi — deneme modunda blur efekti */}
        <div className={`mt-6 overflow-hidden rounded-xl border border-hb-border bg-hb-surface ${isTrial ? 'relative' : ''}`}>
          {isTrial && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-hb-bg/80 backdrop-blur-sm">
              <div className="mx-4 max-w-sm rounded-2xl border border-hb-border bg-hb-surface p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hb-primary/10 text-hb-primary">
                  <Lock size={22} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-hb-text">Detayları görmek için abone ol</h3>
                <p className="mt-2 text-sm leading-relaxed text-hb-muted">
                  Ücretsiz taramanı tamamladın. Sipariş detaylarını ve itiraz taslağını görmek için aylık aboneliğe geç.
                </p>
                <Link
                  to="/abonelik"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-hb-primary px-5 py-2.5 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  ₺500/ay ile abone ol <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          <div className="border-b border-hb-border px-5 py-3.5">
            <h2 className="font-serif text-base font-semibold text-hb-text">Siparişler</h2>
          </div>

          {/* Masaüstü başlık */}
          <div className="hidden grid-cols-12 gap-4 border-b border-hb-border px-5 py-2.5 text-xs font-medium text-hb-muted sm:grid">
            <div className="col-span-5">Ürün</div>
            <div className="col-span-2">Sipariş No</div>
            <div className="col-span-2 text-right">Beklenen</div>
            <div className="col-span-2 text-right">Gerçek</div>
            <div className="col-span-1 text-right">Fark</div>
          </div>

          <div className="divide-y divide-hb-border">
            {farkKalemleri.map((kalem) => {
              const siparis = siparisler[kalem.siparis_id];
              const uyumlu = Math.abs(Number(kalem.fark)) < 0.01;
              const fark = Number(kalem.fark);

              return (
                <div
                  key={kalem.id}
                  className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-12 sm:items-center sm:gap-4"
                >
                  {/* Ürün */}
                  <div className="sm:col-span-5">
                    <p className="text-sm font-medium text-hb-text">{siparis?.urun_adi ?? 'Bilinmeyen ürün'}</p>
                    {siparis?.kategori && (
                      <p className="mt-0.5 text-xs text-hb-muted">{siparis.kategori}</p>
                    )}
                  </div>

                  {/* Sipariş No */}
                  <div className="font-mono text-xs tabular-nums text-hb-muted sm:col-span-2">
                    {siparis?.siparis_no ?? '—'}
                  </div>

                  {/* Beklenen */}
                  <div className="flex items-center justify-between sm:col-span-2 sm:block sm:text-right">
                    <span className="text-xs text-hb-muted sm:hidden">Beklenen</span>
                    <span className="font-mono text-sm tabular-nums text-hb-text">
                      {formatTL(Number(kalem.beklenen_tutar))}
                    </span>
                  </div>

                  {/* Gerçek */}
                  <div className="flex items-center justify-between sm:col-span-2 sm:block sm:text-right">
                    <span className="text-xs text-hb-muted sm:hidden">Gerçek</span>
                    <span className="font-mono text-sm tabular-nums text-hb-text">
                      {formatTL(Number(kalem.gercek_tutar))}
                    </span>
                  </div>

                  {/* Fark */}
                  <div className="flex items-center justify-end gap-2 sm:col-span-1">
                    {uyumlu ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-hb-primary/10 px-2.5 py-1 text-xs font-medium text-hb-primary">
                        <CheckCircle2 size={12} />
                        Uyumlu
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={14} className="shrink-0 text-hb-secondary" />
                        <span className="font-mono text-sm font-medium tabular-nums text-hb-secondary">
                          {formatTL(fark)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alt aksiyon */}
        {!isTrial && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="text-xs text-hb-muted">
              {farkTuruEtiketleri[farkKalemleri[0]?.fark_turu] ?? 'Fark türü'} dahil {tutarsizlikSayisi} siparişte tutarsızlık tespit edildi.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/uyari-merkezi"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-hb-secondary/40 bg-hb-secondary/10 px-5 py-2.5 text-sm font-semibold text-hb-secondary transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <AlertTriangle size={16} />
                Uyarı Merkezi
              </Link>
              <Link
                to="/itiraz-taslagi"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-hb-primary px-5 py-2.5 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileSpreadsheet size={16} />
                İtiraz taslağı oluştur
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardHeader({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <header className="border-b border-hb-border px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hb-primary font-serif text-lg font-semibold text-hb-bg">
            H
          </span>
          <span className="font-serif text-lg font-semibold text-hb-text">HakBul</span>
        </div>
        <div className="flex items-center gap-4">
          {email && (
            <span className="hidden text-sm text-hb-muted sm:inline">{email}</span>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg border border-hb-border px-3 py-2 text-sm text-hb-muted transition-colors hover:border-hb-muted hover:text-hb-text"
          >
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}
