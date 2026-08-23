const steps = [
  {
    number: '01',
    title: 'Bağlan',
    description: 'Trendyol API bilgini gir, salt okunur, mağaza ayarlarına dokunmuyoruz.',
  },
  {
    number: '02',
    title: 'Tarayalım',
    description: 'Son dönem hakedişini beklenenle karşılaştırırız.',
  },
  {
    number: '03',
    title: 'Öğren',
    description: 'Fark varsa gösteririz, itiraz taslağını hazırlarız.',
  },
];

export default function HowItWorks() {
  return (
    <section className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl font-semibold text-hb-text sm:text-4xl">
          Nasıl çalışır
        </h2>

        <div className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-0">
                <span className="font-mono text-3xl font-semibold text-hb-primary/40">
                  {step.number}
                </span>
                <div className="sm:mt-4">
                  <h3 className="font-serif text-xl font-semibold text-hb-text">{step.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-hb-muted sm:mt-3">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <div className="mt-8 h-px w-full bg-hb-border sm:hidden" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
