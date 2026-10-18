import { analyzeExcelRows } from '@/lib/excelAnalyze';
import { parseExcelFile, isParseError } from '@/lib/excelParse';
import * as fs from 'fs';

const file = process.argv[2] || './test-ekstre.xlsx';
const buf = fs.readFileSync(file).buffer as ArrayBuffer;
console.log('File:', file);
const result = parseExcelFile(buf);
if (isParseError(result)) { console.error('parse error', result); process.exit(1); }
const sonuc = analyzeExcelRows(result.rows);
console.log('Fark sayisi:', sonuc.farkSayisi);
console.log('Toplam fark:', sonuc.toplamFark.toFixed(2));
console.log('Ceza sayisi:', sonuc.cezaSayisi);
console.log('Ceza toplami:', sonuc.cezaToplami.toFixed(2));
console.log('---');
for (const f of sonuc.farklar) {
  console.log(`#${f.siparisNo} | ${f.farkTuru} | ${f.fark.toFixed(2)} TL | ${f.aciklama}`);
}
