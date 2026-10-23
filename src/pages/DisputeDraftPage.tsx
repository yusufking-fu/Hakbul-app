import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert as AlertCircle, ArrowLeft, CircleCheck as CheckCircle2, Download, Info, Loader as Loader2, FileText, Clock, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useDemoMode } from '@/lib/demoMode';
import { diffTypeLabels, DiffType } from '@/types/dispute';
import { formatTL } from '@/lib/format';
import { exportDisputeExcel } from '@/lib/exportExcel';

const diffTypeStyles: Record<DiffType, string> = {
  komisyon: 'bg-hb-secondary/10 text-hb-secondary',
  desi: 'bg-hb-primary/10 text-hb-primary',
  iade: 'bg-hb-muted/15 text-hb-muted',
  mukerrer: 'bg-orange-500/10 text-orange-600',
  ceza: 'bg-red-500/10 text-red-600',
  diger: 'bg-hb-muted/15 text-hb-muted',
};

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

interface Itiraz {
  id: string;
  fark_kalem_id: string;
  durum: string;
  toplam_tutar: string;
  olusturma_tarihi: string;
  aciklama: string | null;
}

interface DisputeOrderRow {
  id: string;
  productName: string;
  orderNumber: string;
  diffType: DiffType;
  diffAmount: number;
}

interface PastItirazRow {
  id: string;
  productName: string;
  orderNumber: string;
  durum: string;
  toplam_tutar: number;
  olusturma_tarihi: string;
}

const itirazDurumEtiketleri: Record<string, string> = {
  acik: 'Açık',
  tamamlandi: 'Tamamlandı',
  reddedildi: 'Reddedildi',
};

const itirazDurumStilleri: Record<string, string> = {
  acik: 'bg-hb-secondary/10 text-hb-secondary',
  tamamlandi: 'bg-hb-primary/10 text-hb-primary',
  reddedildi: 'bg-hb-muted/15 text-hb-muted',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function DisputeDraftPage() {
  const { user } = useAuth();
  const { isDemo, demoData, setDemoItirazlar } = useDemoMode();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<DisputeOrderRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingItirazIds, setExistingItirazIds] = useState<Set<string>>(new Set());
  const [pastItirazlar, setPastItirazlar] = useState<PastItirazRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [magazaId, setMagazaId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (isDemo) {
        if (!demoData) {
          setLoading(false);
          return;
        }
        setMagazaId(demoData.magaza_id);

        const itirazEdilmisIds = new Set(demoData.itirazlar.map((i) => i.fark_kalem_id));
        setExistingItirazIds(itirazEdilmisIds);

        const disputeRows: DisputeOrderRow[] = demoData.farkKalemleri
          .filter((f) => Math.abs(f.fark) >= 0.01 && !itirazEdilmisIds.has(f.id))
          .map((f) => {
            const siparis = demoData.siparisler[f.siparis_id];
            return {
              id: f.id,
              productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
              orderNumber: siparis?.siparis_no ?? '—',
              diffType: (f.fark_turu as DiffType) || 'diger',
              diffAmount: Math.abs(f.fark),
            };
          });
        setOrders(disputeRows);
        setSelectedIds(new Set(disputeRows.map((o) => o.id)));

        const pastRows: PastItirazRow[] = demoData.itirazlar.map((itiraz) => {
          const kalem = demoData.farkKalemleri.find((k) => k.id === itiraz.fark_kalem_id);
          const siparis = kalem ? demoData.siparisler[kalem.siparis_id] : null;
          return {
            id: itiraz.id,
            productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
            orderNumber: siparis?.siparis_no ?? '—',
            durum: itiraz.durum,
            toplam_tutar: itiraz.toplam_tutar,
            olusturma_tarihi: itiraz.olusturma_tarihi,
          };
        });
        setPastItirazlar(pastRows);
        setLoading(false);
        return;
      }

      if (!user?.id) return;

      try {
        // Kullanıcının mağazasını bul (en son eklenen kayıt)
        const { data: magazaRows, error: magazaError } = await supabase
          .from('magazalar')
          .select('id')
          .eq('kullanici_id', user.id)
          .order('olusturma_tarihi', { ascending: false })
          .limit(1);

        if (magazaError) throw magazaError;
        if (!magazaRows || magazaRows.length === 0) {
          setError('Henüz mağaza bağlı değil. Önce bir mağaza bağlayın.');
          setLoading(false);
          return;
        }

        const magaza = magazaRows[0];
        setMagazaId(magaza.id);

        // En son hakediş dönemini getir
        const { data: donem, error: donemError } = await supabase
          .from('hakedis_donemleri')
          .select('id')
          .eq('magaza_id', magaza.id)
          .order('tarama_tarihi', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (donemError) throw donemError;
        if (!donem) {
          setLoading(false);
          return;
        }

        // Fark kalemlerini getir (sadece tutarsızlık olanlar)
        const { data: farkKalemleri, error: farkError } = await supabase
          .from('fark_kalemleri')
          .select('*')
          .eq('donem_id', donem.id);

        if (farkError) throw farkError;

        if (!farkKalemleri || farkKalemleri.length === 0) {
          setLoading(false);
          return;
        }

        // İlgili siparişleri getir
        const siparisIds = farkKalemleri.map((f) => f.siparis_id);
        const { data: siparisler, error: siparisError } = await supabase
          .from('siparisler')
          .select('id, siparis_no, urun_adi, kategori')
          .in('id', siparisIds);

        if (siparisError) throw siparisError;

        const siparisMap: Record<string, Siparis> = {};
        (siparisler || []).forEach((s) => {
          siparisMap[s.id] = s;
        });

        // Mevcut itirazları getir (bu mağaza için)
        const { data: mevcutItirazlar, error: itirazError } = await supabase
          .from('itirazlar')
          .select('id, fark_kalem_id, durum, toplam_tutar, olusturma_tarihi, aciklama')
          .eq('magaza_id', magaza.id)
          .order('olusturma_tarihi', { ascending: false });

        if (itirazError) throw itirazError;

        const itirazEdilmisKalemIds = new Set<string>();
        const pastRows: PastItirazRow[] = [];

        (mevcutItirazlar || []).forEach((itiraz: Itiraz) => {
          itirazEdilmisKalemIds.add(itiraz.fark_kalem_id);
        });

        if (mevcutItirazlar && mevcutItirazlar.length > 0) {
          const itirazKalemIds = mevcutItirazlar.map((i) => i.fark_kalem_id);
          const { data: itirazKalemleri } = await supabase
            .from('fark_kalemleri')
            .select('id, siparis_id')
            .in('id', itirazKalemIds);

          const kalemToSiparis: Record<string, string> = {};
          (itirazKalemleri || []).forEach((k) => {
            kalemToSiparis[k.id] = k.siparis_id;
          });

          const itirazSiparisIds = Object.values(kalemToSiparis);
          let itirazSiparisMap: Record<string, Siparis> = {};
          if (itirazSiparisIds.length > 0) {
            const { data: itirazSiparisler } = await supabase
              .from('siparisler')
              .select('id, siparis_no, urun_adi, kategori')
              .in('id', itirazSiparisIds);
            (itirazSiparisler || []).forEach((s) => {
              itirazSiparisMap[s.id] = s;
            });
          }

          mevcutItirazlar.forEach((itiraz) => {
            const siparisId = kalemToSiparis[itiraz.fark_kalem_id];
            const siparis = siparisId ? itirazSiparisMap[siparisId] : null;
            pastRows.push({
              id: itiraz.id,
              productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
              orderNumber: siparis?.siparis_no ?? '—',
              durum: itiraz.durum,
              toplam_tutar: Number(itiraz.toplam_tutar),
              olusturma_tarihi: itiraz.olusturma_tarihi,
            });
          });
        }

        const disputeRows: DisputeOrderRow[] = farkKalemleri
          .filter((f) => Math.abs(Number(f.fark)) >= 0.01)
          .map((f: FarkKalemi) => {
            const siparis = siparisMap[f.siparis_id];
            return {
              id: f.id,
              productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
              orderNumber: siparis?.siparis_no ?? '—',
              diffType: (f.fark_turu as DiffType) || 'diger',
              diffAmount: Math.abs(Number(f.fark)),
            };
          });

        setOrders(disputeRows);
        setSelectedIds(new Set(disputeRows.map((o) => o.id)));
        setExistingItirazIds(itirazEdilmisKalemIds);
        setPastItirazlar(pastRows);
        setLoading(false);
      } catch (err) {
        console.error('İtiraz verisi yüklenemedi:', err);
        setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id, isDemo, demoData]);

  const toggleOrder = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id)),
    [orders, selectedIds]
  );

  const totalAmount = useMemo(
    () => selectedOrders.reduce((sum, order) => sum + order.diffAmount, 0),
    [selectedOrders]
  );

  const handleDownload = () => {
    if (selectedOrders.length === 0) return;
    exportDisputeExcel(selectedOrders);
  };

  const handleCreateItiraz = async () => {
    if (selectedOrders.length === 0 || !magazaId) return;

    if (isDemo) {
      setSubmitting(true);
      setSubmitError(null);

      const newItirazlar = selectedOrders.map((order) => ({
        id: `demo-itiraz-${Date.now()}-${order.id}`,
        fark_kalem_id: order.id,
        magaza_id: magazaId,
        durum: 'acik',
        toplam_tutar: order.diffAmount,
        olusturma_tarihi: new Date().toISOString(),
        aciklama: null,
      }));

      const updatedItirazlar = [...newItirazlar, ...(demoData?.itirazlar ?? [])];
      setDemoItirazlar(updatedItirazlar);

      setSubmitSuccess(true);
      setExistingItirazIds((prev) => {
        const next = new Set(prev);
        selectedOrders.forEach((o) => next.add(o.id));
        return next;
      });
      setOrders((prev) => prev.filter((o) => !selectedIds.has(o.id)));
      setSelectedIds(new Set());

      const pastRows: PastItirazRow[] = updatedItirazlar.map((itiraz) => {
        const kalem = demoData?.farkKalemleri.find((k) => k.id === itiraz.fark_kalem_id);
        const siparis = kalem ? demoData?.siparisler[kalem.siparis_id] : null;
        return {
          id: itiraz.id,
          productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
          orderNumber: siparis?.siparis_no ?? '—',
          durum: itiraz.durum,
          toplam_tutar: itiraz.toplam_tutar,
          olusturma_tarihi: itiraz.olusturma_tarihi,
        };
      });
      setPastItirazlar(pastRows);
      setSubmitting(false);
      return;
    }

    if (!user?.id) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const rows = selectedOrders.map((order) => ({
        kullanici_id: user.id,
        fark_kalem_id: order.id,
        magaza_id: magazaId,
        durum: 'acik',
        toplam_tutar: order.diffAmount,
      }));

      const { error: insertError } = await supabase.from('itirazlar').insert(rows);

      if (insertError) {
        if (insertError.code === '23505') {
          setSubmitError('Seçtiğiniz bazı fark kalemleri için zaten itiraz açılmış. Lütfen listeyi yenileyin.');
        } else {
          setSubmitError('İtiraz oluşturulurken bir hata oluştu: ' + insertError.message);
        }
        setSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setExistingItirazIds((prev) => {
        const next = new Set(prev);
        selectedOrders.forEach((o) => next.add(o.id));
        return next;
      });
      setOrders((prev) => prev.filter((o) => !selectedIds.has(o.id)));
      setSelectedIds(new Set());

      const { data: guncelItirazlar } = await supabase
        .from('itirazlar')
        .select('id, fark_kalem_id, durum, toplam_tutar, olusturma_tarihi, aciklama')
        .eq('magaza_id', magazaId)
        .order('olusturma_tarihi', { ascending: false });

      if (guncelItirazlar && guncelItirazlar.length > 0) {
        const itirazKalemIds = guncelItirazlar.map((i: Itiraz) => i.fark_kalem_id);
        const { data: itirazKalemleri } = await supabase
          .from('fark_kalemleri')
          .select('id, siparis_id')
          .in('id', itirazKalemIds);

        const kalemToSiparis: Record<string, string> = {};
        (itirazKalemleri || []).forEach((k) => {
          kalemToSiparis[k.id] = k.siparis_id;
        });

        const itirazSiparisIds = Object.values(kalemToSiparis);
        let itirazSiparisMap: Record<string, Siparis> = {};
        if (itirazSiparisIds.length > 0) {
          const { data: itirazSiparisler } = await supabase
            .from('siparisler')
            .select('id, siparis_no, urun_adi, kategori')
            .in('id', itirazSiparisIds);
          (itirazSiparisler || []).forEach((s) => {
            itirazSiparisMap[s.id] = s;
          });
        }

        const pastRows: PastItirazRow[] = guncelItirazlar.map((itiraz: Itiraz) => {
          const siparisId = kalemToSiparis[itiraz.fark_kalem_id];
          const siparis = siparisId ? itirazSiparisMap[siparisId] : null;
          return {
            id: itiraz.id,
            productName: siparis?.urun_adi ?? 'Bilinmeyen ürün',
            orderNumber: siparis?.siparis_no ?? '—',
            durum: itiraz.durum,
            toplam_tutar: Number(itiraz.toplam_tutar),
            olusturma_tarihi: itiraz.olusturma_tarihi,
          };
        });
        setPastItirazlar(pastRows);
      }

      setSubmitting(false);
    } catch (err) {
      console.error('İtiraz oluşturma hatası:', err);
      setSubmitError('İtiraz oluşturulurken beklenmeyen bir hata oluştu.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hb-bg">
        <DisputeHeader isDemo={isDemo} />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-hb-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-hb-bg">
        <DisputeHeader isDemo={isDemo} />
        <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <div className="flex items-start gap-3 rounded-xl border border-hb-secondary/30 bg-hb-secondary/10 p-5">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-hb-secondary" />
            <p className="text-sm leading-relaxed text-hb-secondary">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hb-bg pb-32">
      <DisputeHeader />

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        {submitSuccess && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-hb-primary/30 bg-hb-primary/10 p-5">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-hb-primary" />
            <div>
              <p className="text-sm font-medium text-hb-primary">İtiraz oluşturuldu!</p>
              <p className="mt-1 text-sm text-hb-muted">
                İtirazların "Geçmiş İtirazlar" bölümünde listeleniyor. Durum güncellemelerini oradan takip edebilirsin.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-hb-secondary/30 bg-hb-secondary/10 p-5">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-hb-secondary" />
            <p className="text-sm leading-relaxed text-hb-secondary">{submitError}</p>
          </div>
        )}

        {orders.length > 0 ? (
          <>
            <p className="text-sm leading-relaxed text-hb-muted">
              Fark bulunan siparişler otomatik seçildi. İstemediklerini çıkarabilir, sonra itiraz oluşturup Excel'ini indirebilirsin.
            </p>

            <div className="mt-6 divide-y divide-hb-border overflow-hidden rounded-xl border border-hb-border bg-hb-surface">
              {orders.map((order) => {
                const checked = selectedIds.has(order.id);
                return (
                  <label
                    key={order.id}
                    className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-hb-bg/40 sm:items-center sm:px-5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOrder(order.id)}
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-hb-border bg-hb-bg text-hb-primary accent-hb-primary sm:mt-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-hb-text">{order.productName}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-hb-muted">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${diffTypeStyles[order.diffType] ?? diffTypeStyles.diger}`}
                        >
                          {diffTypeLabels[order.diffType] ?? 'Diğer'}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-hb-secondary">
                      {formatTL(order.diffAmount)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-hb-border bg-hb-surface p-6">
              <p className="text-sm font-medium text-hb-muted">İtiraz edilecek toplam tutar</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-hb-primary">
                {formatTL(totalAmount)}
              </p>
              <p className="mt-2 text-sm text-hb-muted">
                {selectedOrders.length} sipariş seçildi · tek pakette gönderilecek
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-hb-muted">
              <span className="rounded-md border border-hb-border px-2 py-1 font-medium">Çıktı formatı</span>
              <span>Excel (.xlsx) — cari hesap ekstresi formatında</span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleDownload}
                disabled={selectedOrders.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-hb-border bg-hb-surface px-5 py-2.5 text-sm font-semibold text-hb-text transition-colors hover:border-hb-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} />
                Excel indir
              </button>

              <button
                type="button"
                onClick={handleCreateItiraz}
                disabled={selectedOrders.length === 0 || submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-hb-primary px-5 py-2.5 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    İtiraz oluşturuluyor...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    İtiraz oluştur
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-hb-border bg-hb-surface p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hb-primary/10 text-hb-primary">
              <Info size={22} />
            </div>
            <h2 className="font-serif text-lg font-semibold text-hb-text">İtiraz edilecek fark bulunamadı</h2>
            <p className="mt-2 text-sm leading-relaxed text-hb-muted">
              Tutar farkı olan ve henüz itiraz edilmemiş sipariş bulunmuyor.
            </p>
          </div>
        )}

        {pastItirazlar.length > 0 && (
          <div className="mt-8 rounded-xl border border-hb-border bg-hb-surface overflow-hidden">
            <div className="border-b border-hb-border px-5 py-3.5">
              <h2 className="font-serif text-base font-semibold text-hb-text">Geçmiş itirazlar</h2>
            </div>
            <div className="divide-y divide-hb-border">
              {pastItirazlar.map((itiraz) => (
                <div key={itiraz.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-hb-text">{itiraz.productName}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-hb-muted">#{itiraz.orderNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${itirazDurumStilleri[itiraz.durum] ?? itirazDurumStilleri.reddedildi}`}>
                          {itirazDurumEtiketleri[itiraz.durum] ?? itiraz.durum}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-hb-secondary">{formatTL(itiraz.toplam_tutar)}</p>
                      <p className="mt-1 text-[11px] text-hb-muted">{formatDate(itiraz.olusturma_tarihi)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DisputeHeader({ isDemo }: { isDemo?: boolean }) {
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
            {isDemo && (
              <span className="flex items-center gap-1 rounded-full border border-hb-secondary/30 bg-hb-secondary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-hb-secondary">
                <Eye size={10} />
                Demo - örnek veri
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-hb-muted">
          <Clock size={16} className="text-hb-primary" />
          <span>İtiraz taslağı</span>
        </div>
      </div>
    </header>
  );
}
