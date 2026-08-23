import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Info } from 'lucide-react';
import { mockDisputeOrders } from '@/data/mockDisputeOrders';
import { diffTypeLabels, DiffType } from '@/types/dispute';
import { formatTL } from '@/lib/format';
import { exportDisputeExcel } from '@/lib/exportExcel';

const diffTypeStyles: Record<DiffType, string> = {
  'komisyon-hatasi': 'bg-hb-secondary/10 text-hb-secondary',
  'desi-farki': 'bg-hb-primary/10 text-hb-primary',
  'iade-duzeltmesi': 'bg-hb-muted/15 text-hb-muted',
};

export default function DisputeDraftPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(mockDisputeOrders.map((order) => order.id))
  );

  const toggleOrder = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => mockDisputeOrders.filter((order) => selectedIds.has(order.id)),
    [selectedIds]
  );

  const totalAmount = useMemo(
    () => selectedOrders.reduce((sum, order) => sum + order.diffAmount, 0),
    [selectedOrders]
  );

  const handleDownload = () => {
    if (selectedOrders.length === 0) return;
    exportDisputeExcel(selectedOrders);
  };

  return (
    <div className="min-h-screen bg-hb-bg pb-32">
      <header className="sticky top-0 z-10 border-b border-hb-border bg-hb-bg/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hb-border text-hb-text transition-colors hover:border-hb-muted"
            aria-label="Geri dön"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-serif text-xl font-semibold text-hb-text">İtiraz Taslağı</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <p className="text-sm leading-relaxed text-hb-muted">
          Fark bulunan siparişler otomatik seçildi. İstemediklerini çıkarabilirsin.
        </p>

        <div className="mt-6 divide-y divide-hb-border overflow-hidden rounded-xl border border-hb-border bg-hb-surface">
          {mockDisputeOrders.map((order) => {
            const checked = selectedIds.has(order.id);
            return (
              <label
                key={order.id}
                className="flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-hb-bg/40 sm:items-center sm:px-5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOrder(order.id)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-hb-border bg-hb-bg text-hb-primary accent-hb-primary sm:mt-0"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-hb-text">{order.productName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs tabular-nums text-hb-muted">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${diffTypeStyles[order.diffType]}`}
                    >
                      {diffTypeLabels[order.diffType]}
                    </span>
                  </div>
                </div>

                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-hb-secondary">
                  {formatTL(order.diffAmount)}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-hb-border bg-hb-surface p-6">
          <p className="text-sm font-medium text-hb-muted">İtiraz edilecek toplam tutar</p>
          <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-hb-primary">
            {formatTL(totalAmount)}
          </p>
          <p className="mt-2 text-sm text-hb-muted">
            {selectedOrders.length} sipariş seçildi · tek pakette gönderilecek
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-hb-muted">
          <span className="rounded-md border border-hb-border px-2 py-1 font-medium">Çıktı formatı</span>
          <span>Excel (.xlsx) — cari hesap ekstresi formatında</span>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-hb-border bg-hb-surface/60 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-hb-muted" />
          <p className="text-sm leading-relaxed text-hb-muted">
            Bu dosyayı, Trendyol'un sana gönderdiği mutabakat mailindeki "Mutabık Değilim" seçeneğine
            tıkladıktan sonra belirtilen adrese e-posta ile gönder ya da Satıcı Paneli'ndeki destek
            alanından bildirim açarak ekle.
          </p>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-hb-border bg-hb-bg/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={handleDownload}
            disabled={selectedOrders.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-hb-primary px-6 py-3.5 text-base font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
          >
            <Download size={18} />
            Excel'i İndir
          </button>
        </div>
      </div>
    </div>
  );
}
