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
const K_DIGER = ['diger', 'other'];

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

function mutlakTutar(r: ExcelRow): number {
  return Math.abs(r.tutar);
}

// "Barkod / Ürün Adı" -> barkod, ürün adı ayrımı.
function extractBarkod(urunAdi: string | null): string | null {
  if (!urunAdi) return null;
  const idx = urunAdi.indexOf(' / ');
  if (idx < 0) return null;
  const b = urunAdi.slice(0, idx).trim();
  return b || null;
}

function extractUrunAdi(urunAdi: string | null): string | null {
  if (!urunAdi) return null;
  const idx = urunAdi.indexOf(' / ');
  if (idx < 0) return urunAdi;
  const u = urunAdi.slice(idx + 3).trim();
  return u || null;
}

// Aynı tutarlı tekrar eden komisyon satırları oran hesabına girmez.
function uniqueKomisyonTutarlari(order: GroupedOrder): number[] {
  const gorulen = new Set<number>();
  const sonuc: number[] = [];
  for (const r of order.rows) {
    if (detectIslemTur(r.islemTuru, r.aciklama || '') !== 'komisyon') continue;
    const tutar = mutlakTutar(r);
    const anahtar = Math.round(tutar * 100) / 100;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    sonuc.push(tutar);
  }
  return sonuc;
}

interface CheckResult {
  type: DiffType;
  fark: number;
  aciklama: string;
}

function checkOrder(order: GroupedOrder, referansOran: number | null): CheckResult[] {
  const results: CheckResult[] = [];
  const komisyonRows = order.rows.filter(
    (r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'komisyon'
  );
  const iadeRows = order.rows.filter(
    (r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'iade'
  );

  // Kural 3: iade satışı var, komisyon iadesi yok → iade tutarı × referans oran
  if (order.hasIade && !order.hasKomisyonIadesi && referansOran !== null) {
    const iadeTutari = iadeRows.reduce((s, r) => s + mutlakTutar(r), 0);
    const fark = iadeTutari * referansOran;
    if (fark >= 0.01) {
      results.push({
        type: 'iade',
        fark,
        aciklama: `İade satışı var ancak komisyon iadesi yok. İade tutarı ${iadeTutari.toFixed(2)} TL × komisyon oranı %${(referansOran * 100).toFixed(1)}.`,
      });
    }
  }

  // Kural 2: aynı siparişte aynı tutarda tekrar eden komisyon satırı
  const sayac = new Map<number, number>();
  for (const r of komisyonRows) {
    const anahtar = Math.round(mutlakTutar(r) * 100) / 100;
    sayac.set(anahtar, (sayac.get(anahtar) || 0) + 1);
  }
  for (const [tutar, adet] of sayac) {
    if (adet >= 2 && tutar > 0.01) {
      const fark = tutar * (adet - 1);
      results.push({
        type: 'mukerrer',
        fark,
        aciklama: `Siparişte ${adet} adet aynı tutarda komisyon kesintisi var (${tutar.toFixed(2)} TL). Fazla kesinti: ${fark.toFixed(2)} TL.`,
      });
    }
  }

  return results;
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
        urunAdi: extractUrunAdi(row.urunAdi),
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
    if (!order.urunAdi) order.urunAdi = extractUrunAdi(row.urunAdi);
    if (!order.barkod) order.barkod = extractBarkod(row.urunAdi);
    if (!order.islemTurleri.includes(detTur)) order.islemTurleri.push(detTur);
    if (detTur === 'iade') order.hasIade = true;
    if (detTur === 'komisyon') order.hasKomisyon = true;
    if (detTur === 'komisyon_iadesi') order.hasKomisyonIadesi = true;
    if (detTur === 'kargo') order.hasKargo = true;
  }

  const groupedOrders = Array.from(orderMap.values());
  const farklar: FarkSonuc[] = [];

  // Global referans oran: tüm siparişlerdeki en sık görülen komisyon oranı
  const oranBilgisi: { order: GroupedOrder; oran: number; satis: number }[] = [];
  for (const order of groupedOrders) {
    const satis = order.rows
      .filter((r) => detectIslemTur(r.islemTuru, r.aciklama || '') === 'satis')
      .reduce((s, r) => s + mutlakTutar(r), 0);
    if (satis <= 0.01) continue;
    const komisyon = uniqueKomisyonTutarlari(order).reduce((s, t) => s + t, 0);
    oranBilgisi.push({ order, oran: komisyon / satis, satis });
  }

  // Referans oran: en sık görülen oran. Eşit sıklıkta ise toplam satış tutarı
  // en büyük olan oran. Hâlâ eşitse (ör. aynı satış tutarı) referans belirsizdir,
  // komisyon oranı farkı yazılmaz.
  const oranSayac = new Map<number, { adet: number; satisToplam: number }>();
  for (const b of oranBilgisi) {
    const k = Math.round(b.oran * 10000) / 10000;
    const cur = oranSayac.get(k) || { adet: 0, satisToplam: 0 };
    cur.adet += 1;
    cur.satisToplam += b.satis;
    oranSayac.set(k, cur);
  }
  let referansOran: number | null = null;
  let enCokAdet = 0;
  let enBuyukSatis = 0;
  for (const [oran, { adet, satisToplam }] of [...oranSayac.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    if (adet > enCokAdet || (adet === enCokAdet && satisToplam > enBuyukSatis)) {
      enCokAdet = adet;
      enBuyukSatis = satisToplam;
      referansOran = oran;
    } else if (adet === enCokAdet && satisToplam === enBuyukSatis) {
      referansOran = null;
    }
  }

  // Kural 1: sipariş oranı referanstan farklıysa fark yaz
  if (referansOran !== null) {
    for (const b of oranBilgisi) {
      const k = Math.round(b.oran * 10000) / 10000;
      if (k === referansOran) continue;
      const fark = Math.abs((b.oran - referansOran) * b.satis);
      if (fark < 0.01) continue;
      farklar.push({
        id: `excel-fark-${b.order.siparisNo}-komisyon-oran`,
        siparisNo: b.order.siparisNo,
        urunAdi: b.order.urunAdi,
        farkTuru: 'komisyon',
        fark,
        beklenenTutar: referansOran * b.satis,
        gercekTutar: b.oran * b.satis,
        aciklama: `Komisyon oranı %${(b.oran * 100).toFixed(1)}, referans oran %${(referansOran * 100).toFixed(1)}. Fazla kesinti: ${fark.toFixed(2)} TL.`,
      });
    }
  }

  // Kural 2 ve 3: sipariş bazlı kontroller
  for (const order of groupedOrders) {
    for (const issue of checkOrder(order, referansOran)) {
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

  // Kural 4: sipariş numarası boş ceza → ceza/operasyonel toplamı
  for (const row of cezaRows) {
    if (row.siparisNo && row.siparisNo.trim()) continue;
    const tutar = mutlakTutar(row);
    if (tutar <= 0.01) continue;
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

  // Kural 5: sipariş numarası boş "Diğer Kesinti" → ayrı fark, ceza toplamına girmez
  for (const row of noOrderRows) {
    if (detectIslemTur(row.islemTuru, row.aciklama || '') !== 'diger') continue;
    const tutar = mutlakTutar(row);
    if (tutar <= 0.01) continue;
    farklar.push({
      id: `excel-fark-orphan-${row.rawRowIndex}`,
      siparisNo: '—',
      urunAdi: row.urunAdi,
      farkTuru: 'diger',
      fark: tutar,
      beklenenTutar: 0,
      gercekTutar: 0,
      aciklama: `Sipariş numarası olmayan kesinti: ${row.islemTuru || row.aciklama || ''}`,
    });
  }

  const toplamFark = farklar.reduce((s, f) => s + Math.abs(f.fark), 0);
  const cezaSayisi = cezaRows.filter(
    (r) => !(r.siparisNo && r.siparisNo.trim()) && mutlakTutar(r) > 0.01
  ).length;

  return {
    groupedOrders,
    farklar,
    toplamFark,
    farkSayisi: farklar.length,
    cezaSayisi,
    cezaToplami,
  };
}
