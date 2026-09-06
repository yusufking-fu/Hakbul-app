import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, CalendarClock, CircleX, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatTL } from '@/lib/format';
import { diffTypeLabels, DiffType } from '@/types/dispute';

interface FarkKalemi {
  id: string;
  donem_id: string;
  siparis_id: string;
  beklenen_tutar: string;
  gercek_tutar: string;
  fark: string;
  fark_turu: string;
}

interface Siparis {
  id: string;
  siparis_no: string;
  urun_adi: string;
  kategori: string | null;
}

interface Donem {
  id: string;
  tarama_tarihi: string;
}

interface Itiraz {
  fark_kalem_id: string;
}

interface UyariItem {
  id: string;
  productName: string;
  orderNumber: string;
  diffType: DiffType;
  diffAmount: number;
  taramaTarihi: string;
  kalanGun: number;
}

const ITIRAZ_SURESI_GUN = 8;

function gunFarki(taramaTarihi: string): number {
  const tarama = new Date(taramaTarihi);
  const simdi = new Date();
  const ms = simdi.getTime() - tarama.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function UyariMerkeziPage() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uyariItems, setUyariItems] = useState<UyariItem[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      const { data: magazalar } = await supabase
        .from('magazalar')
        .select('id')
        .eq('kullanici_id', user.id)
        .maybeSingle();

      if (!magazalar) {
        setLoading(false);
        return;
      }

      const { data: donemler } = await supabase
        .from('hakedis_donemleri')
        .select('id, tarama_tarihi')
        .eq('magaza_id', magazalar.id)
        .order('tarama_tarihi', { ascending: false });

      if (!donemler || donemler.length === 0) {
        setLoading(false);
        return;
      }

      const donemMap: Record<string, Donem> = {};
      donemler.forEach((d) => {
        donemMap[d.id] = d;
      });

      const { data: farkKalemleri } = await supabase
        .from('fark_kalemleri')
        .select('*')
        .in('donem_id', donemler.map((d) => d.id));

      if (!farkKalemleri || farkKalemleri.length === 0) {
        setLoading(false);
        return;
      }

      const { data: itirazlar } = await supabase
        .from('itirazlar')
        .select('fark_kalem_id')
        .in('fark_kalem_id', farkKalemleri.map((f) => f.id));

      const itirazEdilmis = new Set<string>();
      (itirazlar || []).forEach((i: Itiraz) => itirazEdilmis.add(i.fark_kalem_id));

      const itirazEdilmemisKalemler = farkKalemleri.filter(
        (f: FarkKalemi) =>
          !itirazEdilmis.has(f.id) && Math.abs(Number(f.fark)) >= 0.01
      );

      if (itirazEdilmemisKalemler.length === 0) {
        setLoading(false);
        return;
      }

      const siparisIds = itirazEdilmemisKalemler.map((f) => f.siparis_id);
      const { data: siparisler } = await supabase
        .from('siparisler')
        .select('id, siparis_no, urun_adi, kategori')
        .in('id', siparisIds);

      const siparisMap: Record<string, Siparis> = {};
      (siparisler || []).forEach((s) => {
        siparisMap[s.id] = s;
      });

      const items: UyariItem[] = itirazEdilmemisKalemler.map((f: FarkKalemi) => {
        const donem = donemMap[f.donem_id];
        const kalanGun = ITIRAZ_SURESI_GUN - gunFarki(donem?.tarama_tarihi ?? new Date().toISOString());
        const siparis = siparisMap[f.siparis_id];
        return {
          id: f.id,
          productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
          orderNumber: siparis?.siparis_no ?? '—',
          diffType: (f.fark_turu as DiffType) || 'diger',
          diffAmount: Math.abs(Number(f.fark)),
          taramaTarihi: donem?.tarama_tarihi ?? new Date().toISOString(),
          kalanGun,
        };
      });

      setUyariItems(items);
      setLoading(false);
    }

    loadData();
  }, [user?.id]);

  const yaklasanlar = uyariItems.filter((i) => i.kalanGun > 0 && i.kalanGun <= 3);
  const normalOlanlar = uyariItems.filter((i) => i.kalanGun > 3);
  const dolanlar = uyariItems.filter((i) => i.kalanGun <= 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hb-bg">
        <Loader2 size={28} className="animate-spin text-hb-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hb-bg">
      <UyariHeader email={user?.email} onSignOut={signOut} />

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-hb-text">Uyarı Merkezi</h1>
          <p className="mt-2 text-sm leading-relaxed text-hb-muted">
            Trendyol'un kesilen faturalara itiraz süresi 8 gündür. Tespit edilen fakat henüz itiraz
            açılmamış fark kalemlerini ve kalan süresini buradan takip et.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <OzetKart
            icon={<CalendarClock size={20} />}
            label="Süresi yaklaşan"
            count={yaklasanlar.length}
            accent="text-hb-secondary"
            bg="bg-hb-secondary/10"
            border="border-hb-secondary/30"
          />
          <OzetKart
            icon={<CircleX size={20} />}
            label="Süresi dolan"
            count={dolanlar.length}
            accent="text-red-400"
            bg="bg-red-400/10"
            border="border-red-400/30"
          />
          <OzetKart
            icon={<Clock size={20} />}
            label="Toplam bekleyen"
            count={uyariItems.length}
            accent="text-hb-primary"
            bg="bg-hb-primary/10"
            border="border-hb-primary/30"
          />
        </div>

        {uyariItems.length === 0 ? (
          <div className="mt-8 rounded-xl border border-hb-border bg-hb-surface p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hb-primary/10 text-hb-primary">
              <Clock size={24} />
            </div>
            <h2 className="font-serif text-lg font-semibold text-hb-text">Bekleyen uyarı yok</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-hb-muted">
              İtiraz açılmamış, süresi bekleyen bir fark kalemi bulunmuyor.
            </p>
          </div>
        ) : (
          <>
            {yaklasanlar.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-hb-secondary" />
                  <h2 className="font-serif text-lg font-semibold text-hb-text">Süresi Dolmak Üzere</h2>
                </div>
                <div className="space-y-3">
                  {yaklasanlar.map((item) => (
                    <UyariKart key={item.id} item={item} urgent />
                  ))}
                </div>
              </div>
            )}

            {normalOlanlar.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-hb-primary" />
                  <h2 className="font-serif text-lg font-semibold text-hb-text">Devam Eden Süreler</h2>
                </div>
                <div className="space-y-3">
                  {normalOlanlar.map((item) => (
                    <UyariKart key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {dolanlar.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <CircleX size={18} className="text-hb-muted" />
                  <h2 className="font-serif text-lg font-semibold text-hb-muted">Süresi Doldu</h2>
                </div>
                <div className="space-y-3">
                  {dolanlar.map((item) => (
                    <UyariKart key={item.id} item={item} expired />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function OzetKart({
  icon,
  label,
  count,
  accent,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  accent: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-5`}>
      <div className={`mb-2 ${accent}`}>{icon}</div>
      <p className="font-mono text-3xl font-semibold tabular-nums text-hb-text">{count}</p>
      <p className="mt-1 text-xs text-hb-muted">{label}</p>
    </div>
  );
}

function UyariKart({ item, urgent, expired }: { item: UyariItem; urgent?: boolean; expired?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        expired
          ? 'border-hb-border bg-hb-surface/40 opacity-60'
          : urgent
            ? 'border-hb-secondary/40 bg-hb-secondary/5'
            : 'border-hb-border bg-hb-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${expired ? 'text-hb-muted' : 'text-hb-text'}`}>
            {item.productName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-hb-muted">#{item.orderNumber}</span>
            <span className="rounded-full bg-hb-border/60 px-2 py-0.5 text-xs font-medium text-hb-muted">
              {diffTypeLabels[item.diffType] ?? 'Diğer'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-hb-muted">
            <CalendarClock size={12} />
            Tespit: {formatDate(item.taramaTarihi)}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums text-hb-secondary">
            {formatTL(item.diffAmount)}
          </span>
          {expired ? (
            <span className="flex items-center gap-1 rounded-full bg-hb-muted/15 px-2.5 py-1 text-xs font-medium text-hb-muted">
              <CircleX size={12} />
              Süre doldu
            </span>
          ) : (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                urgent
                  ? 'bg-hb-secondary/15 text-hb-secondary'
                  : 'bg-hb-primary/10 text-hb-primary'
              }`}
            >
              <Clock size={12} />
              {item.kalanGun} gün kaldı
            </span>
          )}
        </div>
      </div>

      <Link
        to="/itiraz-taslagi"
        className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] ${
          expired
            ? 'border border-hb-border text-hb-muted hover:border-hb-muted'
            : 'bg-hb-primary text-hb-bg shadow-glow'
        }`}
      >
        {expired ? 'Yine de değerlendir' : 'İtiraz oluştur'}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function UyariHeader({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <header className="border-b border-hb-border px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hb-border text-hb-text transition-colors hover:border-hb-muted"
            aria-label="Geri dön"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hb-primary font-serif text-lg font-semibold text-hb-bg">
              H
            </span>
            <span className="font-serif text-lg font-semibold text-hb-text">HakBul</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {email && <span className="hidden text-sm text-hb-muted sm:inline">{email}</span>}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg border border-hb-border px-3 py-2 text-sm text-hb-muted transition-colors hover:border-hb-muted hover:text-hb-text"
          >
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}
