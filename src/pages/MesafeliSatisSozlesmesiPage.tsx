import LegalPageLayout from '@/components/LegalPageLayout';

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <LegalPageLayout title="MESAFELİ SATIŞ SÖZLEŞMESİ">
      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">1. Taraflar</h2>
        <p className="mt-2">
          <strong className="text-hb-text">Satıcı / Hizmet Sağlayıcı:</strong> Evin Kara<br />
          <strong className="text-hb-text">Marka:</strong> Hakbul<br />
          <strong className="text-hb-text">Web Sitesi:</strong> Hakbul<br />
          <strong className="text-hb-text">E-posta:</strong> hakbuldestek@gmail.com<br />
          <strong className="text-hb-text">Adres:</strong> Gaziantep, Şehitkamil, Gazikent Mahallesi, Belkıs Sokak, No: 56, Kat: 3
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">2. Sözleşmenin Konusu</h2>
        <p className="mt-2">
          İşbu sözleşme, Alıcı'nın Hakbul platformu üzerinden satın aldığı dijital yazılım hizmetinin
          kullanımına ilişkin tarafların hak ve yükümlülüklerini düzenler.
        </p>
        <p className="mt-2">
          Hakbul; e-ticaret satıcılarının, özellikle Trendyol mağazalarına ait hakediş ve finansal
          verileri analiz etmelerine, hesaplamaları kontrol etmelerine ve ilgili işlemleri yönetmelerine
          yardımcı olan bir yazılım hizmetidir.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">3. Hizmetin Sunulması</h2>
        <p className="mt-2">
          Satın alma işleminin başarıyla tamamlanmasının ardından kullanıcı hesabı üzerinden Hakbul
          hizmetine erişim sağlanır. Hizmet fiziksel bir ürün içermemekte olup tamamen dijital ortamda
          sunulmaktadır.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">4. Ücretlendirme</h2>
        <p className="mt-2">
          Kullanıcı, satın aldığı abonelik veya hizmet paketinin ücretini ödeme ekranında belirtilen
          tutar üzerinden öder.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">5. Kullanıcı Yükümlülükleri</h2>
        <p className="mt-2">
          Kullanıcı, sisteme yalnızca kendisine ait veya kullanma yetkisine sahip olduğu hesap ve API
          bilgilerini girmeyi kabul eder. Kullanıcı tarafından sağlanan bilgilerin doğruluğundan kullanıcı
          sorumludur.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">6. Veri Güvenliği</h2>
        <p className="mt-2">
          Hakbul, kullanıcı verilerinin güvenliğini sağlamak için gerekli teknik ve idari tedbirleri
          almaktadır. Kişisel verilerin işlenmesine ilişkin detaylar Gizlilik Politikası ve KVKK Aydınlatma
          Metni'nde açıklanmıştır.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-lg font-semibold text-hb-text">7. Yürürlük</h2>
        <p className="mt-2">
          Kullanıcının hizmeti satın alması ve elektronik ortamda onay vermesiyle sözleşme yürürlüğe girer.
        </p>
      </section>
    </LegalPageLayout>
  );
}
