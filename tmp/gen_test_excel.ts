import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Gerçekçi Trendyol cari hesap ekstresi örneği
// 20 satır, satış/komisyon/kargo/iade/ceza dahil
// Bilinçli hatalar: 
//   1) İade edilmiş siparişte komisyon iadesi eksik (sipariş 3081245702)
//   2) Mükerrer komisyon kesintisi (sipariş 3081245719)
//   3) Sipariş numarası olmayan kesinti (orphan)

const rows = [
  // Başlık satırı olmayacak — ilk 2 satır dummy bilgi, 3. satır başlık
  ['Trendyol A.Ş.', '', '', '', '', '', ''],
  ['Cari Hesap Ekstresi', '', '', '', '', '', ''],
  ['İşlem Tarihi', 'İşlem Türü', 'Sipariş No', 'Ürün Adı', 'Belge No', 'Borç', 'Açıklama'],
  
  // Sipariş 1: Normal satış + komisyon + kargo + hizmet bedeli (uyumlu)
  ['2026-08-01', 'Satış Bedeli', '3081245700', 'Pamuklu Basic T-Shirt (Beyaz, M)', 'INV-001', '', '249.90', 'Satış tutarı'],
  ['2026-08-01', 'Komisyon Bedeli', '3081245700', 'Pamuklu Basic T-Shirt (Beyaz, M)', 'KOM-001', '44.98', '', 'Komisyon %18'],
  ['2026-08-01', 'Kargo Bedeli', '3081245700', 'Pamuklu Basic T-Shirt (Beyaz, M)', 'KRG-001', '29.90', '', 'Kargo'],
  ['2026-08-01', 'Hizmet Bedeli', '3081245700', 'Pamuklu Basic T-Shirt (Beyaz, M)', 'HZM-001', '10.00', '', 'Hizmet bedeli'],

  // Sipariş 2: Normal satış + komisyon + kargo (uyumlu)
  ['2026-08-02', 'Satış Bedeli', '3081245701', 'Termos Çelik Su Matarası 1L', 'INV-002', '', '349.00', 'Satış tutarı'],
  ['2026-08-02', 'Komisyon Bedeli', '3081245701', 'Termos Çelik Su Matarası 1L', 'KOM-002', '52.35', '', 'Komisyon %15'],
  ['2026-08-02', 'Kargo Bedeli', '3081245701', 'Termos Çelik Su Matarası 1L', 'KRG-002', '34.90', '', 'Kargo'],
  ['2026-08-02', 'Hizmet Bedeli', '3081245701', 'Termos Çelik Su Matarası 1L', 'HZM-002', '10.00', '', 'Hizmet bedeli'],

  // Sipariş 3: İade edilmiş, komisyon iadesi EKSİK (bilinçli hata 1)
  ['2026-08-03', 'Satış Bedeli', '3081245702', 'Akıllı Saat Sportif Kayış', 'INV-003', '', '899.00', 'Satış tutarı'],
  ['2026-08-03', 'Komisyon Bedeli', '3081245702', 'Akıllı Saat Sportif Kayış', 'KOM-003', '107.88', '', 'Komisyon %12'],
  ['2026-08-03', 'Kargo Bedeli', '3081245702', 'Akıllı Saat Sportif Kayış', 'KRG-003', '0.00', '', 'Kargo (bedava)'],
  ['2026-08-03', 'Hizmet Bedeli', '3081245702', 'Akıllı Saat Sportif Kayış', 'HZM-003', '10.00', '', 'Hizmet bedeli'],
  ['2026-08-05', 'İade Bedeli', '3081245702', 'Akıllı Saat Sportif Kayış', 'IAD-003', '899.00', '', 'İade'],
  // KOMİSYON İADESİ OLMALI AMA YOK — hata 1

  // Sipariş 4: Mükerrer komisyon (bilinçli hata 2)
  ['2026-08-04', 'Satış Bedeli', '3081245719', 'Kadın Yüksek Bel Jean Pantolon', 'INV-004', '', '599.00', 'Satış tutarı'],
  ['2026-08-04', 'Komisyon Bedeli', '3081245719', 'Kadın Yüksek Bel Jean Pantolon', 'KOM-004', '119.80', '', 'Komisyon %20'],
  ['2026-08-04', 'Komisyon Bedeli', '3081245719', 'Kadın Yüksek Bel Jean Pantolon', 'KOM-004B', '119.80', '', 'Komisyon %20 (MÜKERRER)'],
  ['2026-08-04', 'Kargo Bedeli', '3081245719', 'Kadın Yüksek Bel Jean Pantolon', 'KRG-004', '39.90', '', 'Kargo'],
  ['2026-08-04', 'Hizmet Bedeli', '3081245719', 'Kadın Yüksek Bel Jean Pantolon', 'HZM-004', '10.00', '', 'Hizmet bedeli'],

  // Ceza / operasyonel kesinti
  ['2026-08-06', 'Operasyonel Ceza', '', '', 'CEZ-001', '50.00', '', 'İptal edilen sipariş cezası'],
  ['2026-08-07', 'Ceza Kesintisi', '', '', 'CEZ-002', '25.00', '', 'Geçikme cezası'],
];

const worksheet = XLSX.utils.aoa_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Cari Hesap');
XLSX.writeFile(workbook, 'test-ekstre.xlsx');
console.log('test-ekstre.xlsx created');
