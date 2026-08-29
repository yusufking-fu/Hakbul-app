/*
# HakBul: Shopier Siparişler tablosu

1. Yeni Tablo
- `shopier_siparisler`
  - `id` (uuid, primary key)
  - `shopier_siparis_id` (text, Shopier'den gelen sipariş ID'si, UNIQUE)
  - `musteri_email` (text, Shopier siparişindeki müşteri e-postası)
  - `tutar` (numeric, sipariş tutarı)
  - `tarih` (timestamptz, sipariş tarihi)
  - `eslesme_durumu` (text: bekliyor/eslesti/bulunamadi, varsayılan "bekliyor")
  - `eslesen_kullanici_id` (uuid, kullanicilar tablosuna referans, nullable)
  - `ham_veri` (jsonb, Shopier'den gelen tam webhook verisi)
  - `olusturma_tarihi` (timestamptz, varsayılan now)

2. Güvenlik (RLS)
- RLS etkin.
- Bu tablo yalnızca edge function (service role) tarafından yazılır.
- Kullanıcılar kendi eşleşen siparişlerini görebilir (eslesen_kullanici_id = auth.uid()).
- INSERT/UPDATE/DELETE yalnızca service role üzerinden yapılır (authenticated rolüne yazma izni verilmez).

3. Notlar
- `shopier_siparis_id` üzerinde UNIQUE index, aynı siparişin tekrar işlenmesini engeller.
- Eşleşme bulunamayan siparişler "bekliyor" durumunda kalır, admin tarafından manuel eşleştirilir.
*/

CREATE TABLE IF NOT EXISTS shopier_siparisler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopier_siparis_id text NOT NULL,
  musteri_email text NOT NULL,
  tutar numeric NOT NULL DEFAULT 0,
  tarih timestamptz,
  eslesme_durumu text NOT NULL DEFAULT 'bekliyor',
  eslesen_kullanici_id uuid REFERENCES kullanicilar(id) ON DELETE SET NULL,
  ham_veri jsonb,
  olusturma_tarihi timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopier_siparisler_shopier_id ON shopier_siparisler(shopier_siparis_id);
CREATE INDEX IF NOT EXISTS idx_shopier_siparisler_email ON shopier_siparisler(musteri_email);
CREATE INDEX IF NOT EXISTS idx_shopier_siparisler_eslesme ON shopier_siparisler(eslesme_durumu);

ALTER TABLE shopier_siparisler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_shopier_siparisler" ON shopier_siparisler;
CREATE POLICY "select_own_shopier_siparisler"
ON shopier_siparisler FOR SELECT
TO authenticated USING (eslesen_kullanici_id = auth.uid());