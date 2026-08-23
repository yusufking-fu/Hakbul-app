import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section id="top" className="border-b border-hb-border px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hb-primary/40 bg-hb-primary/10 px-4 py-1.5 text-xs font-medium text-hb-primary">
          <Sparkles size={14} />
          Kart bilgisi gerekmez · İlk tarama ücretsiz
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-hb-muted">
          Trendyol satıcıları için
        </p>

        <h1 className="font-serif text-4xl font-semibold leading-[1.15] text-hb-text sm:text-5xl md:text-6xl">
          Trendyol'un sana borçlu olduğu parayı{' '}
          <span className="text-hb-primary">buluyoruz.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-hb-muted sm:text-lg">
          Hakedişini otomatik doğruluyor, eksik ödemeyi tespit ediyor ve itiraz sürecini senin yerine
          takip ediyoruz.
        </p>

        <Link
          to="/kayit"
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-hb-primary px-7 py-3.5 text-base font-semibold text-hb-bg shadow-glow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Ücretsiz Tara
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
