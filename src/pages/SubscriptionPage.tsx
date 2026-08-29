import { Link } from 'react-router-dom';
import { ArrowLeft, CircleCheck as CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatTL } from '@/lib/format';

const ABONELIK_TUTAR = 500;
const SHOPIER_PRODUCT_URL = 'https://www.shopier.com/Hakbulapp/50331075';

export default function SubscriptionPage() {
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

          <a
            href={SHOPIER_PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-hb-primary px-4 py-3 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <ExternalLink size={16} />
            Pro Paket Satın Al
          </a>

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-hb-border bg-hb-bg/40 px-4 py-3">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-hb-primary" />
            <p className="text-xs leading-relaxed text-hb-muted">
              Ödeme Shopier'in güvenli altyapısı üzerinden işlenir. Ödemeniz tamamlandığında
              aboneliğiniz otomatik olarak aktifleştirilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
