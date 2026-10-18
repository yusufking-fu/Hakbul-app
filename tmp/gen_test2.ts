import * as XLSX from 'xlsx';

// Kullanicinin test_cari_ekstre_2.xlsx dosyasinin tarifi:
// Siparis 2000000001: %15 komisyon (250 satis, 37.50 komisyon) -> fark OLMAMALI
// Siparis 2000000002: %20 komisyon (250 satis, 50 komisyon) -> fark OLMAMALI
// Siparis 2000000003: mukerrer komisyon (300 satis, 60 + 60 komisyon) -> 60 TL mukerrer fark
// Siparis 2000000004: 200 iade var, komisyon iadesi yok -> 200 x %15 = 30 TL iade farki
// Ceza: 100 TL (siparis no bos)
// Diger kesinti: 50 TL (siparis no bos)
//
// Kullanici raporu: 4 fark, toplam 290 TL, ceza 100 TL.
// Beklenen (kurallara gore): mukerrer 60 + iade 30 + ceza 100 + diger 50 = 240 TL, 4 fark.

const rows: (string | number)[][] = [
  ['Islem Tarihi', 'Islem Turu', 'Siparis Numarasi', 'Barkod / Urun Adi', 'Belge / Fatura / Dekont No', 'Borc / Alacak (Tutar)', 'Aciklama'],
  // 2000000001: %15
  ['2026-10-01', 'Satis Bedeli', '2000000001', '8690001 / Urun A', 'INV-1', 250, 'Satis'],
  ['2026-10-01', 'Komisyon Bedeli', '2000000001', '8690001 / Urun A', 'KOM-1', -37.50, 'Komisyon'],
  // 2000000002: %20
  ['2026-10-02', 'Satis Bedeli', '2000000002', '8690002 / Urun B', 'INV-2', 250, 'Satis'],
  ['2026-10-02', 'Komisyon Bedeli', '2000000002', '8690002 / Urun B', 'KOM-2', -50, 'Komisyon'],
  // 2000000003: mukerrer komisyon (300 satis, 60 + 60)
  ['2026-10-03', 'Satis Bedeli', '2000000003', '8690003 / Urun C', 'INV-3', 300, 'Satis'],
  ['2026-10-03', 'Komisyon Bedeli', '2000000003', '8690003 / Urun C', 'KOM-3a', -60, 'Komisyon'],
  ['2026-10-03', 'Komisyon Bedeli', '2000000003', '8690003 / Urun C', 'KOM-3b', -60, 'Komisyon'],
  // 2000000004: 200 iade, komisyon iadesi yok
  ['2026-10-04', 'Satis Bedeli', '2000000004', '8690004 / Urun D', 'INV-4', 400, 'Satis'],
  ['2026-10-04', 'Komisyon Bedeli', '2000000004', '8690004 / Urun D', 'KOM-4', -60, 'Komisyon (%15)'],
  ['2026-10-05', 'Iade Bedeli', '2000000004', '8690004 / Urun D', 'IAD-4', -200, 'Iade'],
  // Ceza (siparis no bos)
  ['2026-10-06', 'Operasyonel Ceza', '', '', 'CEZ-1', -100, 'Ceza'],
  // Diger kesinti (siparis no bos)
  ['2026-10-07', 'Diger Kesinti', '', '', 'DGR-1', -50, 'Diger kesinti'],
];

const worksheet = XLSX.utils.aoa_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Cari Hesap');
XLSX.writeFile(workbook, 'test-ekstre-2.xlsx');
console.log('test-ekstre-2.xlsx created');
