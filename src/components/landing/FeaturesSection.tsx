import { ScanSearch, FileSpreadsheet, ListChecks, AlarmClock, PackageSearch } from 'lucide-react';

const features = [
  {
    icon: ScanSearch,
    title: 'Hakediş Doğrulama',
    description: 'Beklenen ile ödenen arasındaki farkı buluruz.',
  },
  {
    icon: FileSpreadsheet,
    title: 'İtiraz Taslağı',
    description: 'Tek tıkla Trendyol formatında Excel hazır.',
  },
  {
    icon: ListChecks,
    title: 'İtiraz Takip',
    description: 'İtirazının durumunu senin yerine izleriz.',
  },
  {
    icon: AlarmClock,
    title: 'Süre Uyarıları',
    description: 'Fatura ve ihlal itiraz sürelerini kaçırma.',
  },
  {
    icon: PackageSearch,
    title: 'Toplu İtiraz',
    description: 'Birden fazla siparişi tek pakette gönder.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="ozellikler" className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl font-semibold text-hb-text sm:text-4xl">
          Özellikler
        </h2>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-hb-border bg-hb-surface p-6 transition-colors hover:border-hb-primary/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-hb-primary/10 text-hb-primary">
                <feature.icon size={20} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-hb-text">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-hb-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
