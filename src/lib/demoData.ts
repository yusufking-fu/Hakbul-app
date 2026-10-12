import { hakedisHesapla, farkHesapla, SirketTuru, FarkTuru } from '@/lib/hakedisHesapla';
import { siparisSablonlari } from '@/lib/generateMockOrders';

export interface DemoSiparis {
  id: string;
  siparis_no: string;
  urun_adi: string;
  kategori: string;
  satis_tutari: number;
  kargo_tutari: number;
  komisyon_orani: number;
  iade_durumu: boolean;
  teslim_tarihi: string;
}

export interface DemoFarkKalemi {
  id: string;
  donem_id: string;
  siparis_id: string;
  beklenen_tutar: number;
  gercek_tutar: number;
  fark: number;
  fark_turu: FarkTuru;
}

export interface DemoDonem {
  id: string;
  magaza_id: string;
  donem_baslangic: string;
  donem_bitis: string;
  beklenen_toplam: number;
  gercek_odenen_toplam: number;
  fark_toplam: number;
  tarama_tarihi: string;
}

export interface DemoItiraz {
  id: string;
  fark_kalem_id: string;
  magaza_id: string;
  durum: string;
  toplam_tutar: number;
  olusturma_tarihi: string;
  aciklama: string | null;
}

export interface DemoDataset {
  magaza_id: string;
  donem: DemoDonem;
  siparisler: Record<string, DemoSiparis>;
  farkKalemleri: DemoFarkKalemi[];
  itirazlar: DemoItiraz[];
}

const DEMO_SIRKET_TURU: SirketTuru = 'sahis';
const DEMEME_BASLANGIC = '2026-07-28';
const DEMEME_BITIS = '2026-08-08';

export function buildDemoDataset(): DemoDataset {
  const magaza_id = 'demo-magaza';
  const donem_id = 'demo-donem-1';
  const tarama_tarihi = new Date().toISOString();

  let beklenenToplam = 0;
  let gercekOdenenToplam = 0;
  let farkToplam = 0;

  const siparisler: Record<string, DemoSiparis> = {};
  const farkKalemleri: DemoFarkKalemi[] = [];

  siparisSablonlari.forEach((sablon, index) => {
    const siparisId = `demo-siparis-${index}`;
    const siparisNo = `3081${String(245719 + index * 483).padStart(7, '0')}`;

    const siparis: DemoSiparis = {
      id: siparisId,
      siparis_no: siparisNo,
      urun_adi: sablon.urun_adi,
      kategori: sablon.kategori,
      satis_tutari: sablon.satis_tutari,
      kargo_tutari: sablon.kargo_tutari,
      komisyon_orani: sablon.komisyon_orani,
      iade_durumu: sablon.iade_durumu,
      teslim_tarihi: sablon.teslim_tarihi,
    };
    siparisler[siparisId] = siparis;

    const hesap = hakedisHesapla(
      {
        satis_tutari: sablon.satis_tutari,
        kargo_tutari: sablon.kargo_tutari,
        komisyon_orani: sablon.komisyon_orani,
        iade_durumu: sablon.iade_durumu,
      },
      DEMO_SIRKET_TURU
    );

    const beklenenTutar = hesap.beklenenHakedis;
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

    farkKalemleri.push({
      id: `demo-fark-${index}`,
      donem_id,
      siparis_id: siparisId,
      beklenen_tutar: Math.round(beklenenTutar * 100) / 100,
      gercek_tutar: Math.round(gercekTutar * 100) / 100,
      fark: Math.round(farkSonuc.fark * 100) / 100,
      fark_turu: farkSonuc.farkTuru,
    });
  });

  const donem: DemoDonem = {
    id: donem_id,
    magaza_id,
    donem_baslangic: DEMEME_BASLANGIC,
    donem_bitis: DEMEME_BITIS,
    beklenen_toplam: Math.round(beklenenToplam * 100) / 100,
    gercek_odenen_toplam: Math.round(gercekOdenenToplam * 100) / 100,
    fark_toplam: Math.round(farkToplam * 100) / 100,
    tarama_tarihi,
  };

  return {
    magaza_id,
    donem,
    siparisler,
    farkKalemleri,
    itirazlar: [],
  };
}
