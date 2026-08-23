import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const included = [
  'Otomatik hakediş doğrulama',
  'İtiraz taslağı (Excel) oluşturma',
  'İtiraz süreci takibi',
  'Süre uyarı bildirimleri',
];

export default function PricingSection() {
  return (
    <section id="fiyatlandirma" className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-md">
        <h2 className="text-center font-serif text-3xl font-semibold text-hb-text sm:text-4xl">
          Basit, şeffaf fiyat
        </h2>

        <div className="mt-10 rounded-2xl border border-hb-border bg-hb-surface p-8 text-center">
          <p className="font-mono text-5xl font-semibold tabular-nums text-hb-primary">
            ₺500<span className="text-xl text-hb-muted"> / ay</span>
          </p>
          <p className="mt-3 text-sm font-medium text-hb-text">İlk tarama tamamen ücretsiz</p>

          <ul className="mt-6 space-y-2.5 text-left">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-hb-muted">
                <Check size={16} className="shrink-0 text-hb-primary" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            to="/kayit"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-hb-primary px-6 py-3.5 text-base font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Ücretsiz Tara
          </Link>

          <p className="mt-4 text-xs text-hb-muted">İlk taramada kart bilgisi gerekmez</p>
        </div>
      </div>
    </section>
  );
}
