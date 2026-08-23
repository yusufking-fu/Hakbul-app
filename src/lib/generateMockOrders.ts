// Mock sipariş verisi üretici
// Mağaza bağlandığında gerçekçi örnek siparişler oluşturur.
// İleride gerçek Trendyol API çağrısıyla değiştirilecek.

import { supabase } from '@/lib/supabase';
import { hakedisHesapla, farkHesapla, SirketTuru } from '@/lib/hakedisHesapla';

interface MockSiparisSablon {
  urun_adi: string;
  kategori: string;
  satis_tutari: number;
  kargo_tutari: number;
  komisyon_orani: number;
  teslim_tarihi: string;
  iade_durumu: boolean;
  // Gerçek ödenen tutarın beklenenenden farkı (oran veya sabit)
  // 0 = uyumlu, pozitif = eksik ödeme
  fark_simulasyonu: number;
}

const siparisSablonlari: MockSiparisSablon[] = [
  {
    urun_adi: 'Pamuklu Basic T-Shirt (Beyaz, M)',
    kategori: 'Giyim',
    satis_tutari: 249.9,
    kargo_tutari: 29.9,
    komisyon_orani: 0.18,
    teslim_tarihi: '2026-07-28',
    iade_durumu: false,
    fark_simulasyonu: 0,
  },
  {
    urun_adi: 'Kadın Yüksek Bel Jean Pantolon',
    kategori: 'Giyim',
    satis_tutari: 599.0,
    kargo_tutari: 39.9,
    komisyon_orani: 0.2,
    teslim_tarihi: '2026-07-30',
    iade_durumu: false,
    fark_simulasyonu: 12.5,
  },
  {
    urun_adi: 'Termos Çelik Su Matarası 1L',
    kategori: 'Ev & Yaşam',
    satis_tutari: 349.0,
    kargo_tutari: 34.9,
    komisyon_orani: 0.15,
    teslim_tarihi: '2026-08-01',
    iade_durumu: false,
    fark_simulasyonu: 0,
  },
  {
    urun_adi: 'Erkek Deri Cüzdan Kartlıklı',
    kategori: 'Aksesuar',
    satis_tutari: 179.9,
    kargo_tutari: 24.9,
    komisyon_orani: 0.18,
    teslim_tarihi: '2026-08-02',
    iade_durumu: false,
    fark_simulasyonu: 8.75,
  },
  {
    urun_adi: 'Ahşap Mutfak Kesme Tahtası Seti',
    kategori: 'Ev & Yaşam',
    satis_tutari: 289.0,
    kargo_tutari: 34.9,
    komisyon_orani: 0.15,
    teslim_tarihi: '2026-08-03',
    iade_durumu: false,
    fark_simulasyonu: 0,
  },
  {
    urun_adi: 'Kablosuz Bluetooth Kulaklık',
    kategori: 'Elektronik',
    satis_tutari: 1299.0,
    kargo_tutari: 0,
    komisyon_orani: 0.12,
    teslim_tarihi: '2026-08-04',
    iade_durumu: false,
    fark_simulasyonu: 45.0,
  },
  {
    urun_adi: 'Organik Zeytinyağlı Sabun (6\'lı Set)',
    kategori: 'Kozmetik',
    satis_tutari: 159.9,
    kargo_tutari: 29.9,
    komisyon_orani: 0.2,
    teslim_tarihi: '2026-08-05',
    iade_durumu: false,
    fark_simulasyonu: 0,
  },
  {
    urun_adi: 'Kadın Spor Ayakkabı Nubuk',
    kategori: 'Giyim',
    satis_tutari: 749.0,
    kargo_tutari: 39.9,
    komisyon_orani: 0.2,
    teslim_tarihi: '2026-08-06',
    iade_durumu: false,
    fark_simulasyonu: 22.3,
  },
  {
    urun_adi: 'Çocuk Oyuncak Yapboz 500 Parça',
    kategori: 'Oyuncak',
    satis_tutari: 129.9,
    kargo_tutari: 24.9,
    komisyon_orani: 0.18,
    teslim_tarihi: '2026-08-07',
    iade_durumu: false,
    fark_simulasyonu: 0,
  },
  {
    urun_adi: 'Akıllı Saat Sportif Kayış',
    kategori: 'Elektronik',
    satis_tutari: 899.0,
    kargo_tutari: 0,
    komisyon_orani: 0.12,
    teslim_tarihi: '2026-08-08',
    iade_durumu: true,
    fark_simulasyonu: 35.6,
  },
];

/**
 * Mağaza için mock sipariş verisi üretir, veritabanına kaydeder,
 * hakediş dönemi ve fark kalemlerini hesaplayarak oluşturur.
 */
export async function generateMockOrders(
  magazaId: string,
  sirketTuru: SirketTuru
): Promise<void> {
  // Dönem tarihleri
  const donemBaslangic = '2026-07-28';
  const donemBitis = '2026-08-08';

  // 1. Hakediş dönemi oluştur
  const { data: donemData, error: donemError } = await supabase
    .from('hakedis_donemleri')
    .insert({
      magaza_id: magazaId,
      donem_baslangic: donemBaslangic,
      donem_bitis: donemBitis,
      beklenen_toplam: 0,
      gercek_odenen_toplam: 0,
      fark_toplam: 0,
    })
    .select()
    .single();

  if (donemError || !donemData) {
    throw new Error('Hakediş dönemi oluşturulamadı.');
  }

  const donemId = donemData.id;

  // 2. Siparişleri oluştur
  const siparisKayitlari = siparisSablonlari.map((sablon, index) => ({
    magaza_id: magazaId,
    siparis_no: `3081${String(245719 + index * 483).padStart(7, '0')}`,
    urun_adi: sablon.urun_adi,
    kategori: sablon.kategori,
    satis_tutari: sablon.satis_tutari,
    kargo_tutari: sablon.kargo_tutari,
    komisyon_orani: sablon.komisyon_orani,
    teslim_tarihi: sablon.teslim_tarihi,
    iade_durumu: sablon.iade_durumu,
    ham_veri: { kaynak: 'mock', simule_edildi: true },
  }));

  const { data: siparisData, error: siparisError } = await supabase
    .from('siparisler')
    .insert(siparisKayitlari)
    .select();

  if (siparisError || !siparisData) {
    throw new Error('Siparişler oluşturulamadı.');
  }

  // 3. Her sipariş için hakediş hesapla ve fark kalemi oluştur
  let beklenenToplam = 0;
  let gercekOdenenToplam = 0;
  let farkToplam = 0;

  const farkKayitlari = siparisData.map((siparis, index) => {
    const sablon = siparisSablonlari[index];
    const hesap = hakedisHesapla(
      {
        satis_tutari: sablon.satis_tutari,
        kargo_tutari: sablon.kargo_tutari,
        komisyon_orani: sablon.komisyon_orani,
        iade_durumu: sablon.iade_durumu,
      },
      sirketTuru
    );

    const beklenenTutar = hesap.beklenenHakedis;
    // Gerçek tutarı simüle et: fark_simulasyonu kadar eksik öde
    const gercekTutar = beklenenTutar - sablon.fark_simulasyonu;

    const farkSonuc = farkHesapla(beklenenTutar, gercekTutar, {
      satis_tutari: sablon.satis_tutari,
      kargo_tutari: sablon.kargo_tutari,
      komisyon_orani: sablon.komisyon_orani,
      iade_durumu: sablon.iade_durumu,
    });

    beklenenToplam += beklenenTutar;
    gercekOdenenToplam += gercekTutar;
    farkToplam += farkSonuc.fark;

    return {
      donem_id: donemId,
      siparis_id: siparis.id,
      beklenen_tutar: beklenenTutar,
      gercek_tutar: gercekTutar,
      fark: farkSonuc.fark,
      fark_turu: farkSonuc.farkTuru,
    };
  });

  // 4. Fark kalemlerini kaydet
  const { error: farkError } = await supabase.from('fark_kalemleri').insert(farkKayitlari);
  if (farkError) {
    throw new Error('Fark kalemleri kaydedilemedi.');
  }

  // 5. Hakediş dönemini güncelle
  const { error: guncelleError } = await supabase
    .from('hakedis_donemleri')
    .update({
      beklenen_toplam: beklenenToplam,
      gercek_odenen_toplam: gercekOdenenToplam,
      fark_toplam: farkToplam,
    })
    .eq('id', donemId);

  if (guncelleError) {
    throw new Error('Hakediş dönemi güncellenemedi.');
  }
}
