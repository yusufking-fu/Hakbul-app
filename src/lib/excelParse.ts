import * as XLSX from 'xlsx';

export interface ExcelRow {
  islemTarihi: string | null;
  islemTuru: string;
  siparisNo: string | null;
  urunAdi: string | null;
  belgeNo: string | null;
  borc: number;
  alacak: number;
  tutar: number;
  aciklama: string | null;
  rawRowIndex: number;
}

export interface ParsedExcel {
  rows: ExcelRow[];
  headerRowIndex: number;
  detectedColumns: Record<string, string>;
}

export interface ParseError {
  field: string;
  message: string;
}

function normalize(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

const COLUMN_ALIASES: Record<string, string[]> = {
  islemTarihi: ['islemtarihi', 'tarih', 'islemtarihsaat', 'kayittarihi', 'belgetarihi', 'valuedate', 'transactiondate', 'date'],
  islemTuru: ['islemturu', 'islemcins', 'hareketcinsi', 'tip', 'type', 'aciklamatur', 'cins', 'hareket'],
  siparisNo: ['siparisno', 'siparisnumarasi', 'ordernumber', 'orderno', 'orderid', 'siparis', 'order', 'sipariskodu'],
  urunAdi: ['urunadi', 'urun', 'barkod', 'barkodno', 'productname', 'product', 'urunadiurun', 'stokkodu', 'sku'],
  belgeNo: ['belgeno', 'belgno', 'faturano', 'faturanumarasi', 'dekotno', 'dekontno', 'evrakno', 'documentno', 'invoiceno', 'referansno', 'referans'],
  borc: ['borc', 'borcalacak', 'debit', 'cikis', 'cikistutari', 'odenen', 'kesinti', 'borctutari'],
  alacak: ['alacak', 'credit', 'gelir', 'gelirtutari', 'alacaktutari', 'tahsilat', 'yatirilan'],
  tutar: ['tutar', 'islemtutari', 'tutartl', 'amount', 'value', 'bakiye', 'netutar', 'islemtutar'],
  aciklama: ['aciklama', 'not', 'description', 'desc', 'notlar', 'detay', 'ack'],
};

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalizedHeaders = headers.map((h) => ({ original: h, norm: normalize(h) }));
  for (const alias of aliases) {
    const exact = normalizedHeaders.find((h) => h.norm === alias);
    if (exact) return exact.original;
  }
  for (const alias of aliases) {
    const partial = normalizedHeaders.find((h) => h.norm.includes(alias) || alias.includes(h.norm));
    if (partial) return partial.original;
  }
  return null;
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((c) => normalize(String(c || '')));
  let matches = 0;
  for (const aliases of Object.values(COLUMN_ALIASES)) {
    if (normalized.some((n) => aliases.some((a) => n === a || (n.length > 2 && (n.includes(a) || a.includes(n)))))) {
      matches++;
    }
  }
  return matches >= 3;
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (val == null) return 0;
  const str = String(val).trim().replace(/\s/g, '');
  if (!str || str === '-') return 0;
  const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function decodeCsvText(data: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(data);
  if (/[\u00c0-\u00ff]/.test(utf8) && /Ã|Ä°|Å|Ä±|Ã§|Ã¼|Ã¶/.test(utf8)) {
    return new TextDecoder('windows-1254').decode(data);
  }
  return utf8;
}

export function parseExcelFile(data: ArrayBuffer): ParsedExcel | ParseError {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as string[][];

  if (rawRows.length === 0) {
    return { field: 'dosya', message: 'Dosya boş görünüyor.' };
  }

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, rawRows.length); i++) {
    if (isHeaderRow(rawRows[i])) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headers = rawRows[headerRowIndex].map((h) => String(h || '').trim());

  const detected: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const col = findColumn(headers, aliases);
    if (col) detected[field] = col;
  }

  if (!detected.siparisNo && !detected.islemTuru) {
    return { field: 'siparisNo', message: 'Sipariş numarası sütunu bulunamadı.' };
  }

  if (!detected.tutar && !detected.borc && !detected.alacak) {
    return { field: 'tutar', message: 'Tutar sütunu bulunamadı.' };
  }

  const colIndex: Record<string, number> = {};
  for (const [field, colName] of Object.entries(detected)) {
    const idx = headers.indexOf(colName);
    if (idx >= 0) colIndex[field] = idx;
  }

  const rows: ExcelRow[] = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (!raw || raw.every((c) => !String(c || '').trim())) continue;

    const get = (field: string): string => {
      const idx = colIndex[field];
      return idx != null ? String(raw[idx] ?? '').trim() : '';
    };

    const borc = detected.borc ? parseNumber(raw[colIndex.borc]) : 0;
    const alacak = detected.alacak ? parseNumber(raw[colIndex.alacak]) : 0;
    const tutar = detected.tutar ? parseNumber(raw[colIndex.tutar]) : (alacak - borc);

    rows.push({
      islemTarihi: get('islemTarihi') || null,
      islemTuru: get('islemTuru') || '',
      siparisNo: get('siparisNo') || null,
      urunAdi: get('urunAdi') || null,
      belgeNo: get('belgeNo') || null,
      borc,
      alacak,
      tutar,
      aciklama: get('aciklama') || null,
      rawRowIndex: i,
    });
  }

  if (rows.length === 0) {
    return { field: 'veri', message: 'Dosyada veri satırı bulunamadı.' };
  }

  return { rows, headerRowIndex, detectedColumns: detected };
}

export function isParseError(result: ParsedExcel | ParseError): result is ParseError {
  return (result as ParseError).field !== undefined && (result as ParseError).message !== undefined;
}
