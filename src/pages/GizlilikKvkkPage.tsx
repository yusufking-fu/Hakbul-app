import LegalPageLayout from '@/components/LegalPageLayout';

export default function GizlilikKvkkPage() {
  return (
    <LegalPageLayout title="GİZLİLİK POLİTİKASI VE KVKK AYDINLATMA METNİ">
      <section>
        <p>
          Hakbul olarak kullanıcılarımızın kişisel verilerinin ve hesap bilgilerinin güvenliğine önem
          veriyoruz.
        </p>
      </section>

      <section>
        <p>
          Hakbul'a kayıt olurken veya hizmetlerimizi kullanırken kullanıcı tarafından sağlanan ad, soyad,
          e-posta adresi, iletişim bilgileri ve hizmetin kullanılması sırasında oluşan teknik veriler;
          hizmetin sunulması, kullanıcı hesabının yönetilmesi, destek sağlanması ve yasal yükümlülüklerin
          yerine getirilmesi amacıyla işlenebilir.
        </p>
      </section>

      <section>
        <p>
          Trendyol entegrasyonu kapsamında kullanıcı tarafından sağlanan API bilgileri ve ilgili mağaza
          verileri, Hakbul'un hizmeti sunabilmesi ve finansal hesaplamaları gerçekleştirebilmesi amacıyla
          işlenir.
        </p>
      </section>

      <section>
        <p>
          Kullanıcıların API bilgileri ve mağaza verileri yetkisiz kişilerle paylaşılmaz ve yalnızca
          hizmetin sağlanması için gerekli amaçlarla kullanılır.
        </p>
      </section>

      <section>
        <p>
          Kişisel verilerin işlenmesi, saklanması ve kullanıcıların KVKK kapsamındaki hakları hakkında
          detaylı bilgiye bu sayfadan ulaşılabilir.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">Veri Sorumlusu</h2>
        <p className="mt-2">
          <strong className="text-hb-text">Veri Sorumlusu / Hizmet Sağlayıcı:</strong> Evin Kara<br />
          <strong className="text-hb-text">Marka:</strong> Hakbul<br />
          <strong className="text-hb-text">E-posta:</strong> hakbuldestek@gmail.com<br />
          <strong className="text-hb-text">Adres:</strong> Gaziantep, Şehitkamil, Gazikent Mahallesi, Belkıs Sokak, No: 56, Kat: 3
        </p>
      </section>
    </LegalPageLayout>
  );
}
