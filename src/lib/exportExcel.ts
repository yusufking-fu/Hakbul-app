import * as XLSX from 'xlsx';
import { DisputeOrder, diffTypeLabels } from '@/types/dispute';
import { formatTL } from '@/lib/format';

export function exportDisputeExcel(orders: DisputeOrder[]) {
  const rows = orders.map((order, index) => ({
    'Sıra No': index + 1,
    'Sipariş No': order.orderNumber,
    'Ürün Adı': order.productName,
    'Fark Türü': diffTypeLabels[order.diffType],
    'Fark Tutarı (₺)': order.diffAmount.toFixed(2),
  }));

  const total = orders.reduce((sum, order) => sum + order.diffAmount, 0);
  rows.push({
    'Sıra No': '' as unknown as number,
    'Sipariş No': '',
    'Ürün Adı': '',
    'Fark Türü': 'TOPLAM',
    'Fark Tutarı (₺)': formatTL(total),
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 42 },
    { wch: 20 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cari Hesap Ekstresi');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `hakbul-itiraz-taslagi-${today}.xlsx`);
}
