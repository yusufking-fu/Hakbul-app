import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl font-semibold leading-tight text-hb-text sm:text-4xl">
          Trendyol'un sana ne kadar borçlu olduğunu öğrenmek 2 dakika sürer.
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/kayit"
            className="inline-flex items-center gap-2 rounded-xl bg-hb-primary px-7 py-3.5 text-base font-semibold text-hb-bg shadow-glow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Ücretsiz Tara
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-xl border border-hb-border bg-hb-surface px-7 py-3.5 text-base font-semibold text-hb-text transition-colors hover:border-hb-muted"
          >
            Demo Modu
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
