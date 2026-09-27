import { CheckCircle2, AlertTriangle, FileText, Store, Calendar } from 'lucide-react';

const farkKalemleri = [
  {
    ad: 'Komisyon kesintisi',
    beklenen: 8450,
    gercek: 10250,
    fark: 1800,
  },
  {
    ad: 'Kargo kesintisi',
    beklenen: 12300,
    gercek: 15140,
    fark: 2840,
  },
  {
    ad: 'İade işlemleri',
    beklenen: 4200,
    gercek: 7400,
    fark: 3200,
  },
];

const TOPLAM_FARK = 7840;

const formatTL = (amount: number): string =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export default function DashboardPreview() {
  return (
    <section className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-semibold text-hb-text sm:text-4xl">
            Hakedişinizdeki farkları keşfedin.
          </h2>
          <p className="mt-3 text-base text-hb-muted">Hakbul'un örnek hakediş analiz raporunu inceleyin.</p>
          <p className="mt-1 text-xs text-hb-muted/60">Örnek demo verileriyle hazırlanmıştır.</p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-hb-border bg-hb-surface shadow-2xl shadow-black/40">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-hb-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-hb-secondary/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-hb-muted/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-hb-primary/60" />
            <span className="ml-3 truncate text-xs text-hb-muted">app.hakbul.com/tarama-sonucu</span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Demo etiketi */}
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="font-serif text-lg font-semibold text-hb-text">Hakediş Analiz Raporu</h3>
              <span className="shrink-0 rounded-full border border-hb-secondary/30 bg-hb-secondary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-hb-secondary">
                Örnek Demo
              </span>
            </div>

            {/* Mağaza & dönem */}
            <div className="flex flex-col gap-3 border-y border-hb-border py-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex items-center gap-2 text-sm text-hb-muted">
                <Store size={15} className="shrink-0 text-hb-primary" />
                <span className="text-hb-text">Örnek Trendyol Mağazası</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-hb-muted">
                <Calendar size={15} className="shrink-0 text-hb-primary" />
                <span className="font-mono tabular-nums text-hb-text">01.09.2026 – 15.09.2026</span>
              </div>
            </div>

            {/* Analiz özeti */}
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-hb-muted">Toplam hakediş</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-hb-text">
                  284.650,00 TL
                </p>
              </div>
              <div>
                <p className="text-xs text-hb-muted">Kontrol edilen işlem</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-hb-text">
                  1.248
                </p>
              </div>
              <div>
                <p className="text-xs text-hb-muted">Tespit edilen fark</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-hb-secondary">
                  7.840,00 TL
                </p>
              </div>
              <div>
                <p className="text-xs text-hb-muted">Analiz durumu</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-hb-primary">
                  <CheckCircle2 size={14} />
                  Tamamlandı
                </p>
              </div>
            </div>

            {/* Toplam fark vurgusu */}
            <div className="mt-6 rounded-xl border border-hb-border bg-hb-bg/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-hb-muted">
                Toplam örnek fark
              </p>
              <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-hb-primary sm:text-4xl">
                {formatTL(TOPLAM_FARK)} TL
              </p>
            </div>

            {/* Fark detayları tablosu */}
            <div className="mt-6 overflow-hidden rounded-xl border border-hb-border">
              <div className="border-b border-hb-border px-4 py-2.5">
                <h4 className="text-sm font-semibold text-hb-text">Fark Detayları</h4>
              </div>

              {/* Masaüstü başlık */}
              <div className="hidden grid-cols-12 gap-3 border-b border-hb-border px-4 py-2 text-xs font-medium text-hb-muted sm:grid">
                <div className="col-span-4">Kalem</div>
                <div className="col-span-3 text-right">Beklenen</div>
                <div className="col-span-3 text-right">Yatırılan</div>
                <div className="col-span-2 text-right">Fark</div>
              </div>

              <div className="divide-y divide-hb-border">
                {farkKalemleri.map((kalem) => (
                  <div
                    key={kalem.ad}
                    className="grid grid-cols-1 gap-1.5 px-4 py-3.5 sm:grid-cols-12 sm:items-center sm:gap-3"
                  >
                    {/* Kalem adı */}
                    <div className="flex items-center gap-2 sm:col-span-4">
                      <AlertTriangle size={14} className="shrink-0 text-hb-secondary" />
                      <span className="text-sm font-medium text-hb-text">{kalem.ad}</span>
                    </div>

                    {/* Beklenen */}
                    <div className="flex items-center justify-between sm:col-span-3 sm:block sm:text-right">
                      <span className="text-xs text-hb-muted sm:hidden">Beklenen</span>
                      <span className="font-mono text-sm tabular-nums text-hb-text">
                        {formatTL(kalem.beklenen)} TL
                      </span>
                    </div>

                    {/* Yatırılan */}
                    <div className="flex items-center justify-between sm:col-span-3 sm:block sm:text-right">
                      <span className="text-xs text-hb-muted sm:hidden">Yatırılan</span>
                      <span className="font-mono text-sm tabular-nums text-hb-text">
                        {formatTL(kalem.gercek)} TL
                      </span>
                    </div>

                    {/* Fark */}
                    <div className="flex items-center justify-between sm:col-span-2 sm:justify-end">
                      <span className="text-xs text-hb-muted sm:hidden">Fark</span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-hb-secondary">
                        {formatTL(kalem.fark)} TL
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toplam satırı */}
              <div className="flex items-center justify-between border-t-2 border-hb-border bg-hb-bg/30 px-4 py-3.5">
                <span className="text-sm font-semibold text-hb-text">Toplam örnek fark</span>
                <span className="font-mono text-base font-semibold tabular-nums text-hb-secondary">
                  {formatTL(TOPLAM_FARK)} TL
                </span>
              </div>
            </div>

            {/* İtiraz metni */}
            <div className="mt-6 rounded-xl border border-hb-border bg-hb-bg/40 p-5">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-hb-primary" />
                <h4 className="text-sm font-semibold text-hb-text">İtiraz Metni</h4>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-hb-muted">
                Yapılan örnek hakediş kontrolünde, ilgili döneme ait komisyon, kargo ve iade
                kesintilerinde toplam 7.840,00 TL tutarında incelenmesi gereken fark tespit
                edilmiştir. İlgili kesinti kalemlerinin ve hesaplamaların yeniden incelenmesini, varsa
                hatalı tahsil edilen tutarların tarafımıza iade edilmesini talep ederiz.
              </p>
              <p className="mt-3 text-xs italic text-hb-muted/70">
                Örnek itiraz taslağıdır. Gerçek bir Trendyol itirazı değildir.
              </p>
            </div>

            {/* Takip alanı */}
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-semibold text-hb-text">Takip</h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hb-secondary/15">
                    <AlertTriangle size={11} className="text-hb-secondary" />
                  </span>
                  <span className="text-sm text-hb-text">Fark tespit edildi</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hb-primary/15">
                    <FileText size={11} className="text-hb-primary" />
                  </span>
                  <span className="text-sm text-hb-text">İtiraz metni örneği hazırlandı</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hb-muted/15">
                    <Calendar size={11} className="text-hb-muted" />
                  </span>
                  <span className="text-sm text-hb-muted">İtiraz süreci: Demo</span>
                </div>
              </div>
            </div>

            {/* Alt demo etiketi */}
            <p className="mt-6 border-t border-hb-border pt-4 text-center text-[10px] uppercase tracking-wider text-hb-muted/60">
              Örnek demo — gerçek müşteri verisi değildir
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
