/*
# HakBul: Abonelikler tablosu

1. Yeni Tablo
- `abonelikler`
  - `id` (uuid, primary key)
  - `kullanici_id` (uuid, kullanicilar tablosuna referans, ON DELETE CASCADE)
  - `paytr_islem_no` (text, PayTR merchant_oid)
  - `baslangic_tarihi` (timestamptz)
  - `bitis_tarihi` (timestamptz, bir ay sonrası)
  - `durum` (text: deneme/aktif/iptal/basarisiz, varsayılan deneme)
  - `tutar` (numeric, ödeme tutarı)
  - `olusturma_tarihi` (timestamptz, varsayılan now)

2. Güvenlik (RLS)
- RLS etkin.
- Her kullanıcı sadece kendi aboneliklerini görebilir/yönetebilir (auth.uid() = kullanici_id).
- INSERT: kullanici_id DEFAULT auth.uid() ile otomatik dolar.
*/

CREATE TABLE IF NOT EXISTS abonelikler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id uuid NOT NULL DEFAULT auth.uid() REFERENCES kullanicilar(id) ON DELETE CASCADE,
  paytr_islem_no text,
  baslangic_tarihi timestamptz,
  bitis_tarihi timestamptz,
  durum text NOT NULL DEFAULT 'deneme',
  tutar numeric NOT NULL DEFAULT 0,
  olusturma_tarihi timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE abonelikler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_abonelikler" ON abonelikler;
CREATE POLICY "select_own_abonelikler"
ON abonelikler FOR SELECT
TO authenticated USING (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "insert_own_abonelikler" ON abonelikler;
CREATE POLICY "insert_own_abonelikler"
ON abonelikler FOR INSERT
TO authenticated WITH CHECK (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "update_own_abonelikler" ON abonelikler;
CREATE POLICY "update_own_abonelikler"
ON abonelikler FOR UPDATE
TO authenticated USING (auth.uid() = kullanici_id) WITH CHECK (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "delete_own_abonelikler" ON abonelikler;
CREATE POLICY "delete_own_abonelikler"
ON abonelikler FOR DELETE
TO authenticated USING (auth.uid() = kullanici_id);

CREATE INDEX IF NOT EXISTS idx_abonelikler_kullanici_id ON abonelikler(kullanici_id);
