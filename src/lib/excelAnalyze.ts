import { ExcelRow } from '@/lib/excelParse';
import { DiffType } from '@/types/dispute';

export interface GroupedOrder {
  siparisNo: string;
  urunAdi: string | null;
  barkod: string | null;
  rows: ExcelRow[];
  toplamBorc: number;
  toplamAlacak: number;
  netTutar: number;
  islemTurleri: string[];
  hasIade: boolean;
  hasKomisyon: boolean;
  hasKomisyonIadesi: boolean;
  hasKargo: boolean;
  hasCeza: boolean;
}

export interface FarkSonuc {
  id: string;
  siparisNo: string;
  urunAdi: string | null;
  farkTuru: DiffType;
  fark: number;
  beklenenTutar: number;
  gercekTutar: number;
  aciklama: string;
}

export interface AnalizSonuc {
  groupedOrders: GroupedOrder[];
  farklar: FarkSonuc[];
  toplamFark: number;
  farkSayisi: number;
  cezaSayisi: number;
  cezaToplami: number;
}

function normalizeTur(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function islemTurMatch(tur: string, keywords: string[]): boolean {
  const n = normalizeTur(tur);
  return keywords.some((k) => n.includes(k));
}

const K_SATIS = ['satis', 'satisbedeli', 'urunsatis', 'cariosatis'];
const K_KOMISYON = ['komisyon', 'komisyonbedeli'];
const K_KOMISYON_IADE = ['komisyoniade', 'iadekomisyon', 'komisyoniade'];
const K_KARGO = ['kargo', 'kargobedeli', 'kargoucreti'];
const K_IADE = ['iade', 'iadebedeli', 'uruniade'];
const K_IADE_KARGO = ['iadekargo', 'kargoiade'];
const K_HIZMET = ['hizmet', 'hizmetbedeli', 'islemucreti'];
const K_CEZA = ['ceza', 'cezakesintisi', 'operasyonel', 'mudahale', 'iptalceza', 'gecikme'];
const K_DIGER = ['diger', 'other', 'aciklama'];

function detectIslemTur(tur: string, aciklama: string): string {
  const combined = `${tur} ${aciklama}`;
  if (islemTurMatch(combined, K_KOMISYON_IADE)) return 'komisyon_iadesi';
  if (islemTurMatch(combined, K_KOMISYON)) return 'komisyon';
  if (islemTurMatch(combined, K_IADE_KARGO)) return 'iade_kargo';
  if (islemTurMatch(combined, K_IADE)) return 'iade';
  if (islemTurMatch(combined, K_KARGO)) return 'kargo';
  if (islemTurMatch(combined, K_HIZMET)) return 'hizmet_bedeli';
  if (islemTurMatch(combined, K_SATIS)) return 'satis';
  if (islemTurMatch(combined, K_CEZA)) return 'ceza';
  if (islemTurMatch(combined, K_DIGER)) return 'diger';
  return 'diger';
}

interface OrderKomisyonInfo {
  siparisNo: string;
  urunAdi: string | null;
  barkod: string | null;
  satisTutari: number;
  komisyonTutari: number;
  oran: number | null;
}

export function analyzeExcelRows(rows: ExcelRow[]): AnalizSonuc {
  const orderMap = new Map<string, GroupedOrder>();
  const cezaRows: ExcelRow[] = [];
  const noOrderRows: ExcelRow[] = [];
  let cezaToplami = 0;

  for (const row of rows) {
    const detTur = detectIslemTur(row.islemTuru, row.aciklama || '');

    if (detTur === 'ceza') {
      cezaRows.push(row);
      continue;
    }

    if (!row.siparisNo || !row.siparisNo.trim()) {
      noOrderRows.push(row);
      continue;
    }

    const key = row.siparisNo.trim();
    if (!orderMap.has(key)) {
      orderMap.set(key, {
        siparisNo: key,
        urunAdi: row.urunAdi,
        barkod: row.urunAdi,
        rows: [],
        toplamBorc: 0,
        toplamAlacak: 0,
        netTutar: 0,
        islemTurleri: [],
        hasIade: false,
        hasKomisyon: false,
        hasKomisyonIadesi: false,
        hasKargo: false,
        hasCeza: false,
      });
    }

    const order = orderMap.get(key)!;
    order.rows.push(row);
    order.toplamBorc += row.borc;
    order.toplamAlacak += row.alacak;
    order.netTutar += row.tutar;

    if (!order.urunAdi && row.urunAdi) order.urunAdi = row.urunAdi;

    if (!order.islemTurleri.includes(detTur)) {
      order.islemTurleri.push(detTur);
    }

    if (detTur === 'iade' || detTur === 'iade_kargo') order.hasIade = true;
    if (detTur === 'komisyon') order.hasKomisyon = true;
    if (detTur === 'komisyon_iadesi') order.hasKomisyonIadesi = true;
    if (detTur === 'kargo') order.hasKargo = true;
  }

  const groupedOrders = Array.from(orderMap.values());
  const farklar: FarkSonuc[] = [];

  // Per-order checks
  const komisyonInfoList: OrderKomisyonInfo[] = [];

  for (const order of groupedOrders) {
    const issues = checkOrder(order);
    for (const issue of issues) {
      farklar.push({
        id: `excel-fark-${order.siparisNo}-${issue.type}-${farklar.length}`,
        siparisNo: order.siparisNo,
        urunAdi: order.urunAdi,
        farkTuru: issue.type,
        fark: issue.fark,
        beklenenTutar: 0,
        gercekTutar: 0,
        aciklama: issue.aciklama,
      });
    }

    // Collect commission rate info for cross-order comparison
    const satisRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'satis');
    const komisyonRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon');
    if (satisRows.length > 0 && komisyonRows.length > 0) {
      const satisTutari = satisRows.reduce((s, r) => s + r.alacak, 0);
      const komisyonTutari = komisyonRows.reduce((s, r) => s + r.borc, 0);
      if (satisTutari > 0.01) {
        komisyonInfoList.push({
          siparisNo: order.siparisNo,
          urunAdi: order.urunAdi,
          barkod: order.barkod,
          satisTutari,
          komisyonTutari,
          oran: komisyonTutari / satisTutari,
        });
      }
    }
  }

  // Cross-order check: same barkod, different commission rates
  const barkodMap = new Map<string, OrderKomisyonInfo[]>();
  for (const info of komisyonInfoList) {
    if (!info.barkod) continue;
    const key = info.barkod;
    if (!barkodMap.has(key)) barkodMap.set(key, []);
    barkodMap.get(key)!.push(info);
  }

  for (const [barkod, infos] of barkodMap) {
    if (infos.length < 2) continue;
    const oranlar = infos.map((i) => i.oran!);
    const minOran = Math.min(...oranlar);
    const maxOran = Math.max(...oranlar);
    if (maxOran - minOran > 0.02) {
      const beklenenOran = minOran;
      for (const info of infos) {
        if (info.oran! > beklenenOran + 0.01) {
          const beklenenKomisyon = info.satisTutari * beklenenOran;
          const fazlaKesinti = info.komisyonTutari - beklenenKomisyon;
          if (fazlaKesinti > 0.5) {
            farklar.push({
              id: `excel-fark-${info.siparisNo}-komisyon-oran-${farklar.length}`,
              siparisNo: info.siparisNo,
              urunAdi: info.urunAdi,
              farkTuru: 'komisyon',
              fark: fazlaKesinti,
              beklenenTutar: beklenenKomisyon,
              gercekTutar: info.komisyonTutari,
              aciklama: `Aynı ürün (${barkod}) için farklı komisyon oranı: %${(info.oran! * 100).toFixed(1)} vs %${(beklenenOran * 100).toFixed(1)}. Fazla kesilen: ${fazlaKesinti.toFixed(2)} TL.`,
            });
          }
        }
      }
    }
  }

  // Ceza rows → fark listesi
  for (const row of cezaRows) {
    const tutar = row.borc > 0 ? row.borc : (row.tutar < 0 ? Math.abs(row.tutar) : 0);
    if (tutar > 0.01) {
      cezaToplami += tutar;
      farklar.push({
        id: `excel-fark-ceza-${row.rawRowIndex}`,
        siparisNo: '—',
        urunAdi: null,
        farkTuru: 'ceza',
        fark: tutar,
        beklenenTutar: 0,
        gercekTutar: 0,
        aciklama: row.aciklama || row.islemTuru || 'Ceza/Operasyonel kesinti',
      });
    }
  }

  // No-order rows (non-ceza, non-satis) → fark listesi
  for (const row of noOrderRows) {
    const detTur = detectIslemTur(row.islemTuru, row.aciklama || '');
    if (detTur === 'satis') continue;
    const tutar = row.borc > 0 ? row.borc : (row.tutar < 0 ? Math.abs(row.tutar) : 0);
    if (tutar > 0.01) {
      farklar.push({
        id: `excel-fark-orphan-${row.rawRowIndex}`,
        siparisNo: '—',
        urunAdi: row.urunAdi,
        farkTuru: 'diger',
        fark: tutar,
        beklenenTutar: 0,
        gercekTutar: 0,
        aciklama: `Sipariş numarası olmayan kesinti: ${row.islemTuru || row.aciklama || 'Belirsiz'}`,
      });
    }
  }

  const cezaSayisi = cezaRows.filter((r) => {
    const t = r.borc > 0 ? r.borc : (r.tutar < 0 ? Math.abs(r.tutar) : 0);
    return t > 0.01;
  }).length;

  const toplamFark = farklar.reduce((s, f) => s + Math.abs(f.fark), 0);

  return {
    groupedOrders,
    farklar,
    toplamFark,
    farkSayisi: farklar.length,
    cezaSayisi,
    cezaToplami,
  };
}

interface CheckResult {
  type: DiffType;
  fark: number;
  aciklama: string;
}

function checkOrder(order: GroupedOrder): CheckResult[] {
  const results: CheckResult[] = [];
  const komisyonRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon');
  const komisyonIadeRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon_iadesi');
  const iadeRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'iade');

  // 1) İade edilmiş siparişte komisyon iadesinin eksik olması
  if (order.hasIade && !order.hasKomisyonIadesi && order.hasKomisyon) {
    const komisyonTutari = komisyonRows.reduce((s, r) => s + r.borc, 0);
    if (komisyonTutari > 0.01) {
      results.push({
        type: 'iade',
        fark: komisyonTutari,
        aciklama: 'İade satışı var ancak komisyon iadesi yok. Komisyon tutarının iadesi alacak olarak görünmüyor.',
      });
    }
  }

  // 2) Mükerrer komisyon kesintisi (aynı tutarda iki komisyon)
  if (komisyonRows.length >= 2) {
    const tutarMap = new Map<number, number>();
    for (const r of komisyonRows) {
      const key = Math.round(r.borc * 100) / 100;
      tutarMap.set(key, (tutarMap.get(key) || 0) + 1);
    }
    for (const [tutar, count] of tutarMap) {
      if (count >= 2 && tutar > 0.5) {
        results.push({
          type: 'mukerrer',
          fark: tutar * (count - 1),
          aciklama: `Siparişte ${count} adet aynı tutarda (${tutar.toFixed(2)} TL) komisyon kesintisi. İkincisi mükerrer olabilir.`,
        });
        break;
      }
    }
    // Fallback: if no exact match but total minus max is significant
    if (results.filter((r) => r.type === 'mukerrer').length === 0) {
      const komisyonTutarlari = komisyonRows.map((r) => r.borc);
      const toplamKomisyon = komisyonTutarlari.reduce((s, t) => s + t, 0);
      const enBuyuk = Math.max(...komisyonTutarlari);
      if (toplamKomisyon - enBuyuk > 0.5) {
        results.push({
          type: 'mukerrer',
          fark: toplamKomisyon - enBuyuk,
          aciklama: `${komisyonRows.length} adet komisyon kesintisi bulunuyor. Mükerrer komisyon olabilir.`,
        });
      }
    }
  }

  // 3) Mükerrer kargo kesintisi
  const kargoRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'kargo');
  if (kargoRows.length > 1) {
    const kargoTutarlari = kargoRows.map((r) => r.borc);
    const toplamKargo = kargoTutarlari.reduce((s, t) => s + t, 0);
    const enBuyuk = Math.max(...kargoTutarlari);
    if (toplamKargo - enBuyuk > 0.5) {
      results.push({
        type: 'mukerrer',
        fark: toplamKargo - enBuyuk,
        aciklama: `${kargoRows.length} adet kargo kesintisi bulunuyor. Mükerrer kargo olabilir.`,
      });
    }
  }

  // 4) İade kargo kesintisi var ama iade bedeli yok
  const iadeKargoRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'iade_kargo');
  if (iadeKargoRows.length > 0 && iadeRows.length === 0 && !order.hasIade) {
    const iadeKargoTutari = iadeKargoRows.reduce((s, r) => s + r.borc, 0);
    results.push({
      type: 'iade',
      fark: iadeKargoTutari,
      aciklama: 'İade kargo kesintisi var ancak iade işlemi bulunamadı.',
    });
  }

  return results;
}
