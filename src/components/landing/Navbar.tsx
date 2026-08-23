import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Fiyatlandırma', href: '#fiyatlandirma' },
  { label: 'SSS', href: '#sss' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const handleLinkClick = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hb-border bg-hb-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hb-primary font-serif text-lg font-semibold text-hb-bg">
            H
          </span>
          <span className="font-serif text-lg font-semibold text-hb-text">HakBul</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-hb-muted transition-colors hover:text-hb-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/giris"
            className="rounded-lg border border-hb-border px-4 py-2 text-sm font-medium text-hb-text transition-colors hover:border-hb-muted"
          >
            Giriş Yap
          </Link>
          <Link
            to="/kayit"
            className="rounded-lg bg-hb-primary px-4 py-2 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Ücretsiz Tara
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hb-border text-hb-text md:hidden"
          aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hb-border px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="rounded-lg px-3 py-3 text-sm font-medium text-hb-muted transition-colors hover:bg-hb-surface hover:text-hb-text"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              to="/giris"
              onClick={handleLinkClick}
              className="w-full rounded-lg border border-hb-border px-4 py-2.5 text-center text-sm font-medium text-hb-text"
            >
              Giriş Yap
            </Link>
            <Link
              to="/kayit"
              onClick={handleLinkClick}
              className="w-full rounded-lg bg-hb-primary px-4 py-2.5 text-center text-sm font-semibold text-hb-bg shadow-glow"
            >
              Ücretsiz Tara
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
