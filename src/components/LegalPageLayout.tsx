import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export default function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-hb-bg">
      <header className="sticky top-0 z-10 border-b border-hb-border bg-hb-bg/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hb-border text-hb-text transition-colors hover:border-hb-muted"
            aria-label="Ana sayfaya dön"
          >
            <ArrowLeft size={18} />
          </Link>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hb-primary font-serif text-lg font-semibold text-hb-bg">
              H
            </span>
            <span className="font-serif text-lg font-semibold text-hb-text">HakBul</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="font-serif text-2xl font-semibold text-hb-text sm:text-3xl">{title}</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-hb-muted sm:text-base">
          {children}
        </div>

        <div className="mt-12 border-t border-hb-border pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-hb-primary transition-colors hover:text-hb-primary-dark"
          >
            <ArrowLeft size={16} />
            Ana Sayfaya Dön
          </Link>
        </div>
      </main>
    </div>
  );
}
