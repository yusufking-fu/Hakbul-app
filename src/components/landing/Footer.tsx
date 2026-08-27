import { Link } from 'react-router-dom';

const legalLinks = [
  { label: 'Mesafeli Satış Sözleşmesi', to: '/mesafeli-satis-sozlesmesi' },
  { label: 'İptal ve İade Koşulları', to: '/iptal-iade' },
  { label: 'Gizlilik Politikası ve KVKK', to: '/gizlilik-kvkk' },
  { label: 'Firma / İletişim', to: '/iletisim' },
];

export default function Footer() {
  return (
    <footer className="border-t border-hb-border px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hb-primary font-serif text-lg font-semibold text-hb-bg">
              H
            </span>
            <span className="font-serif text-lg font-semibold text-hb-text">HakBul</span>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-2.5 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-6">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-hb-muted transition-colors hover:text-hb-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-hb-border pt-6">
          <p className="text-center text-sm text-hb-muted">HakBul © 2026</p>
        </div>
      </div>
    </footer>
  );
}
