import LegalPageLayout from '@/components/LegalPageLayout';

export default function IletisimPage() {
  return (
    <LegalPageLayout title="FİRMA / İLETİŞİM">
      <section>
        <h2 className="font-serif text-xl font-semibold text-hb-text">HAKBUL</h2>
        <p className="mt-2">
          Hakbul, e-ticaret satıcılarının finansal süreçlerini daha kolay takip edebilmesi için
          geliştirilmiş bir yazılım platformudur.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">İletişim Bilgileri</h2>
        <p className="mt-2">
          <strong className="text-hb-text">Hizmet Sağlayıcı:</strong> Evin Kara<br />
          <strong className="text-hb-text">Marka:</strong> Hakbul<br />
          <strong className="text-hb-text">E-posta:</strong>{' '}
          <a href="mailto:hakbuldestek@gmail.com" className="text-hb-primary transition-colors hover:text-hb-primary-dark">
            hakbuldestek@gmail.com
          </a>
          <br />
          <strong className="text-hb-text">Adres:</strong> Gaziantep, Şehitkamil, Gazikent Mahallesi, Belkıs Sokak, No: 56, Kat: 3
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">Destek</h2>
        <p className="mt-2">
          Destek talepleri için:{' '}
          <a href="mailto:hakbuldestek@gmail.com" className="text-hb-primary transition-colors hover:text-hb-primary-dark">
            hakbuldestek@gmail.com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
