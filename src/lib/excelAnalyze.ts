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

function extractBarkod(urunAdi: string | null): string | null {
  if (!urunAdi) return null;
  const trimmed = urunAdi.trim();
  const idx = trimmed.indexOf(' / ');
  if (idx >= 0) {
    const barkod = trimmed.slice(0, idx).trim();
    return barkod || null;
  }
  return trimmed || null;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getDuplicateCommissionExtra(rows: ExcelRow[]): number {
  const counts = new Map<number, number>();

  for (const row of rows) {
    const amount = Math.abs(row.borc);
    if (amount <= 0.01) continue;
    const key = roundCurrency(amount);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let extra = 0;
  for (const [amount, count] of counts) {
    if (count >= 2) {
      extra += amount * (count - 1);
    }
  }

  return extra;
}

function getMostCommonRate(rates: number[]): number | null {
  if (!rates.length) return null;

  const counts = new Map<number, number>();
  for (const rate of rates) {
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const key = Number(rate.toFixed(6));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (counts.size === 0) return null;

  let bestRate: number | null = null;
  let bestCount = -1;
  for (const [rate, count] of counts) {
    if (count > bestCount || (count === bestCount && bestRate === null)) {
      bestRate = rate;
      bestCount = count;
    }
  }

  return bestRate;
}

interface OrderKomisyonInfo {
  siparisNo: string;
  urunAdi: string | null;
  barkod: string | null;
  satisTutari: number;
  komisyonTutari: number;
  oran: number | null;
}

function getOrderCommissionInfo(order: GroupedOrder): OrderKomisyonInfo | null {
  const satisRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'satis');
  const komisyonRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon');

  if (satisRows.length === 0 || komisyonRows.length === 0) return null;

  const satisTutari = satisRows.reduce((sum, row) => sum + Math.abs(row.alacak), 0);
  const komisyonTutariToplam = komisyonRows.reduce((sum, row) => sum + Math.abs(row.borc), 0);
  const duplicateExtra = getDuplicateCommissionExtra(komisyonRows);
  const komisyonTutari = Math.max(0, komisyonTutariToplam - duplicateExtra);

  if (satisTutari <= 0.01 || komisyonTutari <= 0.01) return null;

  return {
    siparisNo: order.siparisNo,
    urunAdi: order.urunAdi,
    barkod: order.barkod,
    satisTutari,
    komisyonTutari,
    oran: komisyonTutari / satisTutari,
  };
}

function getReferenceCommissionRate(groupedOrders: GroupedOrder[]): number | null {
  const infos = groupedOrders
    .map((order) => getOrderCommissionInfo(order))
    .filter((info): info is OrderKomisyonInfo => info !== null && info.oran !== null);

  if (infos.length === 0) return null;

  const rates = infos.map((info) => info.oran!).filter((rate) => Number.isFinite(rate) && rate > 0);
  return getMostCommonRate(rates);
}

export function analyzeExcelRows(rows: ExcelRow[]): AnalizSonuc {
  const orderMap = new Map<string, GroupedOrder>();
  const cezaRows: ExcelRow[] = [];
  const noOrderRows: ExcelRow[] = [];
  let cezaToplami = 0;

  for (const row of rows) {
    const detTur = detectIslemTur(row.islemTuru, row.aciklama || '');

    if (detTur === 'ceza') {
      if (!row.siparisNo || !row.siparisNo.trim()) {
        cezaRows.push(row);
        continue;
      }
    }

    if (!row.siparisNo || !row.siparisNo.trim()) {
      if (detTur !== 'ceza') {
        noOrderRows.push(row);
      }
      continue;
    }

    const key = row.siparisNo.trim();
    if (!orderMap.has(key)) {
      orderMap.set(key, {
        siparisNo: key,
        urunAdi: row.urunAdi,
        barkod: extractBarkod(row.urunAdi),
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
    if (!order.barkod) order.barkod = extractBarkod(row.urunAdi);

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

  const referenceRate = getReferenceCommissionRate(groupedOrders);

  for (const order of groupedOrders) {
    const issues = checkOrder(order, referenceRate);
    for (const issue of issues) {
      // Use the order.siparisNo of the order where the issue was detected
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
  }

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

  const cezaSayisi = cezaRows.filter((row) => {
    const tutar = row.borc > 0 ? row.borc : (row.tutar < 0 ? Math.abs(row.tutar) : 0);
    return tutar > 0.01;
  }).length;

  const toplamFark = farklar.reduce((sum, item) => sum + Math.abs(item.fark), 0);

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

function checkOrder(order: GroupedOrder, referenceRate: number | null): CheckResult[] {
  const results: CheckResult[] = [];
  const komisyonRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon');
  const komisyonIadeRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon_iadesi');
  const iadeRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'iade');

  // Kural: Komisyon oranı farkı (her sipariş kendi oranı ile global referansı karşılaştırır)
  if (referenceRate !== null) {
    const orderInfo = getOrderCommissionInfo(order);
    if (orderInfo && orderInfo.oran !== null) {
      const diffRate = orderInfo.oran - referenceRate;
      const fark = diffRate * orderInfo.satisTutari;
      if (Math.abs(fark) >= 0.01) {
        results.push({
          type: 'komisyon',
          fark: Math.abs(fark),
          aciklama: `Order oranı (${orderInfo.oran.toFixed(6)}) ile referans oran (${referenceRate.toFixed(6)}) arasındaki fark.`,
        });
      }
    }
  }

  // Kural: Aynı siparişte aynı tutarlı ikinci/çoklu komisyonlar mükerrer olarak raporlanır ve oran hesabına dahil edilmez
  if (komisyonRows.length >= 2) {
    const counts = new Map<number, number>();
    for (const row of komisyonRows) {
      const amount = roundCurrency(Math.abs(row.borc));
      counts.set(amount, (counts.get(amount) ?? 0) + 1);
    }

    for (const [amount, count] of counts) {
      if (count >= 2 && amount > 0.5) {
        results.push({
          type: 'mukerrer',
          fark: amount * (count - 1),
          aciklama: `Siparişte aynı tutarda ${count} komisyon kesintisi bulundu; fazlalık mükerrer kabul edildi.`,
        });
      }
    }
  }

  // Kural: İade satışında komisyon iadesi eksikse, iade tutarı × referans oran kadar fark yaz
  if (order.hasIade && !order.hasKomisyonIadesi && order.hasKomisyon) {
    const iadeTutari = iadeRows.reduce((sum, row) => sum + Math.abs(row.alacak), 0);
    if (referenceRate !== null && iadeTutari > 0.01) {
      const fark = iadeTutari * referenceRate;
      results.push({
        type: 'iade',
        fark,
        aciklama: `İade satışı var fakat komisyon iadesi yok; iade tutarı × referans oran hesaplandı.`,
      });
    }
  }

  // Kargo tekrarları
  const kargoRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'kargo');
  if (kargoRows.length > 1) {
    const tutarlar = kargoRows.map((r) => Math.abs(r.borc));
    const toplamKargo = tutarlar.reduce((s, v) => s + v, 0);
    const enBuyuk = Math.max(...tutarlar);
    if (toplamKargo - enBuyuk > 0.5) {
      results.push({
        type: 'mukerrer',
        fark: toplamKargo - enBuyuk,
        aciklama: `Mükerrer kargo kesintisi tespit edildi.`,
      });
    }
  }

  // İade kargo ama iade yok
  const iadeKargoRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'iade_kargo');
  if (iadeKargoRows.length > 0 && iadeRows.length === 0 && !order.hasIade) {
    const iadeKargoTutari = iadeKargoRows.reduce((sum, row) => sum + Math.abs(row.borc), 0);
    results.push({
      type: 'iade',
      fark: iadeKargoTutari,
      aciklama: 'İade kargo kesintisi var ancak iade işlemi bulunamadı.',
    });
  }

  return results;
}
