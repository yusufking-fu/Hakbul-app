import { Clock, EyeOff, FileQuestion } from 'lucide-react';

const problems = [
  {
    icon: Clock,
    title: 'Saatlerce Excel',
    description: 'Her ödeme döneminde hesaplamaları tek tek kontrol etmeyin.',
  },
  {
    icon: EyeOff,
    title: 'Gözden Kaçan Farklar',
    description: 'Küçük kesintiler veya hesaplama farkları fark edilmeden kalabilir.',
  },
  {
    icon: FileQuestion,
    title: 'Karmaşık İtiraz Süreci',
    description:
      'Bir fark tespit ettiğinizde ne yapacağınızı ve nasıl itiraz edeceğinizi tekrar tekrar araştırmayın.',
  },
];

export default function ProblemSection() {
  return (
    <section className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-hb-text sm:text-4xl">
            Hakediş hesabınız gerçekten doğru mu?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-hb-muted">
            Komisyonlar, kargo ücretleri, hizmet bedelleri, kampanyalar ve diğer kesintiler bir araya
            geldiğinde, hesabınıza yatması gereken tutarı manuel olarak kontrol etmek oldukça
            zorlaşabilir.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="rounded-xl border border-hb-border bg-hb-surface p-6 transition-colors hover:border-hb-muted/40"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-hb-secondary/10 text-hb-secondary">
                <problem.icon size={20} />
              </div>
              <h3 className="font-serif text-lg font-semibold text-hb-text">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-hb-muted">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
