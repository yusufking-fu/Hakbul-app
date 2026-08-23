// Hakediş hesaplama motoru
// Trendyol hakedişinden kesilecek kalemleri hesaplar ve beklenen ödeme tutarını bulur.

export type SirketTuru = 'sahis' | 'limited';

export type FarkTuru = 'komisyon' | 'desi' | 'iade' | 'diger';

export interface SiparisInput {
  satis_tutari: number;
  kargo_tutari: number;
  komisyon_orani: number; // yüzde olarak, örn 0.18
  iade_durumu: boolean;
}

export interface HakedisSonuc {
  komisyonTutari: number;
  komisyonKdv: number;
  kargoBedeli: number;
  hizmetBedeli: number;
  stopajMatrahi: number;
  stopajTutari: number;
  beklenenHakedis: number;
}

// Sabit hizmet bedeli (TL) — ileride ayarlanabilir
export const HIZMET_BEDELI = 10;

// KDV oranı (komisyon KDV'si için)
const KDV_ORANI = 0.2;

// Stopaj oranı (şahıs şirketlerinde uygulanır)
const STOPAJ_ORANI = 0.01;

/**
 * Bir sipariş için beklenen hakediş tutarını hesaplar.
 *
 * Adımlar:
 * 1. Komisyon tutarı = satış tutarı × komisyon oranı
 * 2. Komisyon KDV'si = komisyon tutarı × 0.20
 * 3. Kargo bedeli = siparişin kargo tutarı
 * 4. Hizmet bedeli = sabit 10 TL
 * 5. Stopaj (sadece şahıs şirketleri için):
 *    - Stopaj matrahı = (satış tutarı - kargo tutarı) / 1.20
 *    - Stopaj tutarı = stopaj matrahı × 0.01
 *    - Limited/anonim şirketlerde stopaj = 0
 * 6. Beklenen hakediş = satış - komisyon - komisyon KDV - kargo - hizmet bedeli - stopaj
 */
export function hakedisHesapla(siparis: SiparisInput, sirketTuru: SirketTuru): HakedisSonuc {
  // 1. Komisyon tutarı
  const komisyonTutari = siparis.satis_tutari * siparis.komisyon_orani;

  // 2. Komisyon KDV'si (%20)
  const komisyonKdv = komisyonTutari * KDV_ORANI;

  // 3. Kargo bedeli
  const kargoBedeli = siparis.kargo_tutari;

  // 4. Hizmet bedeli (sabit)
  const hizmetBedeli = HIZMET_BEDELI;

  // 5. Stopaj hesapla
  let stopajMatrahi = 0;
  let stopajTutari = 0;

  if (sirketTuru === 'sahis') {
    // Stopaj matrahı = (satış - kargo) / 1.20
    stopajMatrahi = (siparis.satis_tutari - siparis.kargo_tutari) / 1.2;
    stopajTutari = stopajMatrahi * STOPAJ_ORANI;
  }
  // Limited/anonim şirketlerde stopaj yok

  // 6. Beklenen hakediş
  const beklenenHakedis =
    siparis.satis_tutari -
    komisyonTutari -
    komisyonKdv -
    kargoBedeli -
    hizmetBedeli -
    stopajTutari;

  return {
    komisyonTutari,
    komisyonKdv,
    kargoBedeli,
    hizmetBedeli,
    stopajMatrahi,
    stopajTutari,
    beklenenHakedis,
  };
}

export interface FarkSonuc {
  beklenenTutar: number;
  gercekTutar: number;
  fark: number;
  farkTuru: FarkTuru;
  uyumlu: boolean;
}

/**
 * Beklenen tutar ile gerçek tutarı karşılaştırır ve farkı bulur.
 * Fark türünü tespit etmeye çalışır.
 */
export function farkHesapla(
  beklenenTutar: number,
  gercekTutar: number,
  siparis: SiparisInput
): FarkSonuc {
  const fark = beklenenTutar - gercekTutar;
  const uyumlu = Math.abs(fark) < 0.01;

  let farkTuru: FarkTuru = 'diger';

  if (!uyumlu) {
    if (siparis.iade_durumu) {
      farkTuru = 'iade';
    } else {
      // Komisyon oranı farkı en yaygın neden
      farkTuru = 'komisyon';
    }
  }

  return {
    beklenenTutar,
    gercekTutar,
    fark,
    farkTuru,
    uyumlu,
  };
}
