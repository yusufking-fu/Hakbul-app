import { ExcelRow } from '@/lib/excelParse';
import { DiffType } from '@/types/dispute';

export interface GroupedOrder {
  siparisNo: string;
  urunAdi: string | null;
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

export interface CezaKalemi {
  aciklama: string;
  tutar: number;
  islemTuru: string;
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
  cezalar: CezaKalemi[];
  toplamFark: number;
  farkSayisi: number;
  cezaToplami: number;
  cezaSayisi: number;
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

export function analyzeExcelRows(rows: ExcelRow[]): AnalizSonuc {
  const orderMap = new Map<string, GroupedOrder>();
  const cezalar: CezaKalemi[] = [];
  const noOrderRows: ExcelRow[] = [];

  for (const row of rows) {
    const detTur = detectIslemTur(row.islemTuru, row.aciklama || '');

    if (detTur === 'ceza') {
      cezalar.push({
        aciklama: row.aciklama || row.islemTuru || 'Ceza/Operasyonel kesinti',
        tutar: row.borc > 0 ? row.borc : (row.tutar < 0 ? Math.abs(row.tutar) : 0),
        islemTuru: row.islemTuru,
      });
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

  for (const order of groupedOrders) {
    const issues = checkOrder(order);
    for (const issue of issues) {
      farklar.push({
        id: `excel-fark-${order.siparisNo}-${issue.type}`,
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

  for (const row of noOrderRows) {
    const detTur = detectIslemTur(row.islemTuru, row.aciklama || '');
    if (detTur === 'satis' || detTur === 'diger') {
      if (row.borc > 0.01 || (row.tutar < -0.01)) {
        farklar.push({
          id: `excel-fark-orphan-${row.rawRowIndex}`,
          siparisNo: '—',
          urunAdi: row.urunAdi,
          farkTuru: 'diger',
          fark: row.borc > 0 ? row.borc : Math.abs(row.tutar),
          beklenenTutar: 0,
          gercekTutar: 0,
          aciklama: `Sipariş numarası olmayan kesinti: ${row.islemTuru || row.aciklama || 'Belirsiz'}`,
        });
      }
    }
  }

  const toplamFark = farklar.reduce((s, f) => s + Math.abs(f.fark), 0);
  const cezaToplami = cezalar.reduce((s, c) => s + c.tutar, 0);

  return {
    groupedOrders,
    farklar,
    cezalar,
    toplamFark,
    farkSayisi: farklar.length,
    cezaToplami,
    cezaSayisi: cezalar.length,
  };
}

interface CheckResult {
  type: DiffType;
  fark: number;
  aciklama: string;
}

function checkOrder(order: GroupedOrder): CheckResult[] {
  const results: CheckResult[] = [];
  const satisRows = order.rows.filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'satis');
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
        aciklama: 'İade edilmiş siparişte komisyon iadesi eksik. Komisyon tutarının iadesi alacak olarak görünmüyor.',
      });
    }
  }

  // 2) Mükerrer komisyon kesintisi
  if (komisyonRows.length > 1) {
    const komisyonTutarlari = komisyonRows.map((r) => r.borc);
    const toplamKomisyon = komisyonTutarlari.reduce((s, t) => s + t, 0);
    const enBuyuk = Math.max(...komisyonTutarlari);
    if (toplamKomisyon - enBuyuk > 0.5) {
      results.push({
        type: 'komisyon',
        fark: toplamKomisyon - enBuyuk,
        aciklama: `${komisyonRows.length} adet komisyon kesintisi bulunuyor. Mükerrer komisyon olabilir.`,
      });
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
        type: 'diger',
        fark: toplamKargo - enBuyuk,
        aciklama: `${kargoRows.length} adet kargo kesintisi bulunuyor. Mükerrer kargo olabilir.`,
      });
    }
  }

  // 4) Aynı ürün/satış için tutarsız komisyon oranı (aynı sipariş içinde değil, global kontrol gerekir — burada sadece komisyon oranı tahmin edilemiyorsa flag'le)
  if (satisRows.length > 0 && komisyonRows.length > 0) {
    const satisTutari = satisRows.reduce((s, r) => s + r.alacak, 0);
    const komisyonTutari = komisyonRows.reduce((s, r) => s + r.borc, 0);
    if (satisTutari > 0) {
      const oran = komisyonTutari / satisTutari;
      if (oran > 0.35) {
        results.push({
          type: 'komisyon',
          fark: komisyonTutari - satisTutari * 0.25,
          aciklama: `Komisyon oranı %${(oran * 100).toFixed(1)} — beklenen aralığın (%15-25) üzerinde.`,
        });
      }
    }
  }

  // 5) İade kargo kesintisi var ama iade bedeli yok
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
