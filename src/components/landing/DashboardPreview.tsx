import { CheckCircle2 } from 'lucide-react';

const previewOrders = [
  { name: 'Pamuklu Basic T-Shirt (Beyaz, M)', status: 'diff', amount: 84.5 },
  { name: 'Kadın Yüksek Bel Jean Pantolon', status: 'diff', amount: 156.2 },
  { name: 'Termos Çelik Su Matarası 1L', status: 'ok' },
  { name: 'Kablosuz Bluetooth Kulaklık', status: 'diff', amount: 412.0 },
  { name: 'Organik Zeytinyağlı Sabun (6\'lı Set)', status: 'ok' },
];

export default function DashboardPreview() {
  return (
    <section className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-semibold text-hb-text sm:text-4xl">
            İşte ürün gerçekten böyle görünüyor
          </h2>
          <p className="mt-3 text-base text-hb-muted">Gerçek bir tarama sonucunun önizlemesi.</p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-hb-border bg-hb-surface shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-hb-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-hb-secondary/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-hb-muted/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-hb-primary/60" />
            <span className="ml-3 truncate text-xs text-hb-muted">app.hakbul.com/tarama-sonucu</span>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-hb-muted">
              Toplam bulunan fark
            </p>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-hb-primary sm:text-5xl">
              ₺3.458
            </p>

            <div className="mt-8 divide-y divide-hb-border border-t border-hb-border">
              {previewOrders.map((order) => (
                <div key={order.name} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="truncate text-sm text-hb-text">{order.name}</span>
                  {order.status === 'diff' ? (
                    <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-hb-secondary">
                      -₺{order.amount?.toFixed(2)}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-hb-primary/10 px-2.5 py-1 text-xs font-medium text-hb-primary">
                      <CheckCircle2 size={12} />
                      Uyumlu
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
