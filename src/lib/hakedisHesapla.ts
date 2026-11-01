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
  toplamHizmetBedeli: number;
  toplamIade: number;
  toplamCeza: number;
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
 *   Hesaplanan hakediş = satış (KDV dahil) − komisyon (KDV dahil) − kargo
 *                        − platform hizmet bedeli − iade − ceza
 *   Yatacak tutar = hesaplanan hakediş − stopaj
 *   Stopaj = (KDV hariç satış) × stopaj oranı
 *   KDV hariç satış = satış / (1 + KDV oranı)
 *
 * Oranlar ve tutarlar parametre/ekstre kaynaklıdır; hiçbir sayı sabit değildir.
 */
export function donemHesapla(input: DonemHesapInput): DonemHesapSonuc {
  const { rows, kdvOrani, stopajOrani } = input;

  let toplamSatis = 0;
  let toplamKomisyon = 0;
  let toplamKomisyonKdv = 0;
  let toplamKargo = 0;
  let toplamHizmetBedeli = 0;
  let toplamIade = 0;
  let toplamCeza = 0;

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
