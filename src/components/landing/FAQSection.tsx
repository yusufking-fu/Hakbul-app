import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'HakBul nedir?',
    answer:
      'Trendyol satıcılarının hakedişini otomatik doğrulayan, eksik ödemeyi bulup itiraz sürecini takip eden bir araç.',
  },
  {
    question: 'Verilerim güvende mi?',
    answer: 'API bağlantımız salt okunur, mağaza ayarlarına hiçbir müdahalede bulunmuyoruz.',
  },
  {
    question: 'Nasıl hesaplıyorsunuz?',
    answer:
      'Komisyon, kargo, hizmet bedeli ve stopajı Trendyol\'un kendi kurallarına göre hesaplayıp gerçek ödemenle karşılaştırıyoruz.',
  },
  {
    question: 'İtirazı siz mi gönderiyorsunuz?',
    answer:
      'Hayır, itiraz taslağını hazırlıyoruz, resmi süreci Trendyol Satıcı Paneli üzerinden sen başlatıyorsun. Sonucunu senin yerine takip ediyoruz.',
  },
  {
    question: 'Ücretsiz deneme nasıl işliyor?',
    answer:
      'İlk hakediş taraman tamamen ücretsiz, kart bilgisi istemiyoruz. Devam etmek istersen ayda ₺500.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="sss" className="border-b border-hb-border px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center font-serif text-3xl font-semibold text-hb-text sm:text-4xl">
          Sıkça sorulan sorular
        </h2>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-xl border border-hb-border bg-hb-surface"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-base font-semibold text-hb-text">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-hb-muted transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-hb-primary' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-hb-muted">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
