// Dönem hakediş hesaplama motoru
// Bir dönem için satıcının hesabına yatması gereken tutarı hesaplar ve
// kullanıcının girdiği gerçek yatan tutarla karşılaştırır.

import { ExcelRow } from '@/lib/excelParse';
import { detectIslemTur } from '@/lib/excelAnalyze';

export interface DonemHesapInput {
  rows: ExcelRow[];
  kdvOrani: number; // ürün KDV oranı, örn 0.20
  stopajOrani: number; // stopaj oranı, şahıs için 0.01, diğerleri için 0
}

export interface KalemDokum {
  etiket: string;
  tutar: number;
}

export interface DonemHesapSonuc {
  toplamSatis: number;
  toplamKomisyon: number;
  toplamKomisyonKdv: number;
  toplamKargo: number;
  toplamIadeKargo: number;
  toplamHizmetBedeli: number;
  toplamIade: number;
  toplamCeza: number;
  toplamDigerKesinti: number;
  stopaj: number;
  hesaplananHakedis: number;
  yatacakTutar: number;
  kalemler: KalemDokum[];
}

export interface DonemKarsilastirmaSonuc {
  hesaplananYatacak: number;
  girilenYatan: number;
  fark: number;
  uyumlu: boolean;
  mesaj: string;
}

function mutlakTutar(r: ExcelRow): number {
  return r.borc > 0 ? r.borc : Math.abs(r.tutar);
}

/**
 * Cari hesap ekstresindeki satırlardan dönem bazlı hakedişi hesaplar.
 *
 * Formül (ekstredaki her satır için toplanır):
 *   Hesaplanan hakediş = satış − komisyon − kargo − iade kargo − platform hizmet bedeli
 *                        − iade − ceza − diğer kesinti
 *   Yatacak tutar = hesaplanan hakediş − stopaj
 *   Stopaj = (satış / (1 + KDV oranı)) × stopaj oranı, sadece şahıs şirketinde uygulanır
 *
 * Oranlar ve tutarlar parametre/ekstre kaynaklıdır; hiçbir sayı sabit değildir.
 */
export function donemHesapla(input: DonemHesapInput): DonemHesapSonuc {
  const { rows, kdvOrani, stopajOrani } = input;

  let toplamSatis = 0;
  let toplamKomisyon = 0;
  let toplamKomisyonKdv = 0;
  let toplamKargo = 0;
  let toplamIadeKargo = 0;
  let toplamHizmetBedeli = 0;
  let toplamIade = 0;
  let toplamCeza = 0;
  let toplamDigerKesinti = 0;

  for (const row of rows) {
    const tur = detectIslemTur(row.islemTuru, row.aciklama || '');

    switch (tur) {
      case 'satis': {
        const tutar = row.alacak > 0 ? row.alacak : mutlakTutar(row);
        toplamSatis += tutar;
        break;
      }
      case 'komisyon': {
        toplamKomisyon += mutlakTutar(row);
        break;
      }
      case 'komisyon_kdv': {
        toplamKomisyonKdv += mutlakTutar(row);
        break;
      }
      case 'komisyon_iadesi': {
        const tutar = row.alacak > 0 ? row.alacak : mutlakTutar(row);
        toplamKomisyon -= tutar;
        break;
      }
      case 'kargo': {
        toplamKargo += mutlakTutar(row);
        break;
      }
      case 'iade_kargo': {
        toplamIadeKargo += mutlakTutar(row);
        break;
      }
      case 'hizmet_bedeli': {
        toplamHizmetBedeli += mutlakTutar(row);
        break;
      }
      case 'iade': {
        toplamIade += mutlakTutar(row);
        break;
      }
      case 'ceza': {
        toplamCeza += mutlakTutar(row);
        break;
      }
      case 'diger': {
        toplamDigerKesinti += mutlakTutar(row);
        break;
      }
      default:
        break;
    }
  }

  const kdvHaricSatis = kdvOrani > 0 ? toplamSatis / (1 + kdvOrani) : toplamSatis;
  const stopaj = stopajOrani > 0 ? kdvHaricSatis * stopajOrani : 0;

  const hesaplananHakedis =
    toplamSatis -
    toplamKomisyon -
    toplamKargo -
    toplamIadeKargo -
    toplamHizmetBedeli -
    toplamIade -
    toplamCeza -
    toplamDigerKesinti;

  const yatacakTutar = hesaplananHakedis - stopaj;

  const kalemler: KalemDokum[] = [
    { etiket: 'Komisyon', tutar: toplamKomisyon },
    { etiket: 'Kargo', tutar: toplamKargo },
    { etiket: 'İade Kargo Bedeli', tutar: toplamIadeKargo },
    { etiket: 'Platform hizmet bedeli', tutar: toplamHizmetBedeli },
    { etiket: 'İade', tutar: toplamIade },
    { etiket: 'Ceza', tutar: toplamCeza },
    { etiket: 'Diğer kesinti', tutar: toplamDigerKesinti },
    { etiket: 'Stopaj', tutar: stopaj },
  ];

  return {
    toplamSatis,
    toplamKomisyon,
    toplamKomisyonKdv,
    toplamKargo,
    toplamIadeKargo,
    toplamHizmetBedeli,
    toplamIade,
    toplamCeza,
    toplamDigerKesinti,
    stopaj,
    hesaplananHakedis,
    yatacakTutar,
    kalemler,
  };
}

const YUVARLAMA_ESIGI = 0.01;

/**
 * Hesaplanan yatacak tutar ile kullanıcının girdiği yatan tutarı karşılaştırır.
 */
export function donemKarsilastir(
  hesaplananYatacak: number,
  girilenYatan: number
): DonemKarsilastirmaSonuc {
  const fark = hesaplananYatacak - girilenYatan;
  const uyumlu = Math.abs(fark) < YUVARLAMA_ESIGI;

  return {
    hesaplananYatacak,
    girilenYatan,
    fark,
    uyumlu,
    mesaj: uyumlu
      ? 'Dönem tutarları uyumlu'
      : 'Tutarlar uyuşmuyor, aşağıdaki kalemleri kontrol edin',
  };
}
