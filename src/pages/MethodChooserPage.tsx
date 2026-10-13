import { Link, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

export default function MethodChooserPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-hb-bg px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-hb-muted transition-colors hover:text-hb-text"
        >
          <ArrowLeft size={16} />
          Ana sayfa
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-hb-text">Nasıl başlayalım?</h1>
          <p className="mt-2 text-sm leading-relaxed text-hb-muted">
            Hakediş kontrolü için iki yöntem var. Hangisi uygunsa onu seç.
          </p>
        </div>

        {/* Excel — önerilen, üstte */}
        <div
          onClick={() => navigate('/excel-kontrol')}
          className="group cursor-pointer rounded-2xl border-2 border-hb-primary/40 bg-hb-surface p-6 transition-all hover:border-hb-primary hover:shadow-glow sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hb-primary/10 text-hb-primary">
              <FileSpreadsheet size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-semibold text-hb-text">Excel yükle (hızlı başla)</h2>
                <span className="rounded-full bg-hb-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-hb-primary">
                  Önerilen
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-hb-muted">
                Trendyol panelinden Finans &gt; Cari Hesap ekstresini indirip yükleyin. Hesap bilgisi girmeniz gerekmez.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-hb-primary">
                Başla
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>

{/* API — altta */}
        <div
          onClick={() => navigate('/magaza-baglantisi')}
          className="group mt-4 cursor-pointer rounded-2xl border border-hb-border bg-hb-surface p-6 transition-all hover:border-hb-muted sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hb-muted/10 text-hb-muted">
              <Zap size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-semibold text-hb-text">Otomatik takip (API)</h2>
              <p className="mt-2 text-sm leading-relaxed text-hb-muted">
                Bir kez bağlayın, her hakediş otomatik kontrol edilsin.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-hb-muted transition-colors group-hover:text-hb-text">
                Bağlan
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
