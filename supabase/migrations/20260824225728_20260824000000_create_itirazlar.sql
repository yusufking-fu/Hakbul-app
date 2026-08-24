/*
# HakBul: İtirazlar tablosu

1. Yeni Tablo
- `itirazlar`
  - `id` (uuid, primary key)
  - `kullanici_id` (uuid, kullanicilar referansı, ON DELETE CASCADE, DEFAULT auth.uid())
  - `fark_kalem_id` (uuid, fark_kalemleri referansı, ON DELETE CASCADE, UNIQUE)
    - UNIQUE constraint: aynı fark kalemi için yalnızca bir itiraz oluşturulabilir
  - `magaza_id` (uuid, magazalar referansı, ON DELETE CASCADE)
  - `durum` (text: acik/tamamlandi/reddedildi, varsayılan "acik")
  - `toplam_tutar` (numeric, itiraz edilen toplam tutar)
  - `aciklama` (text, kullanıcının eklediği not)
  - `olusturma_tarihi` (timestamptz, varsayılan now)
  - `guncelleme_tarihi` (timestamptz, varsayılan now)

2. Güvenlik (RLS)
- RLS etkin.
- Her kullanıcı yalnızca kendi itirazlarını görebilir/yönetebilir (auth.uid() = kullanici_id).
- kullanici_id DEFAULT auth.uid() ile otomatik dolar.

3. Notlar
- `fark_kalem_id` üzerindeki UNIQUE constraint, aynı fark kalemi için
  tekrar itiraz oluşturulmasını veritabanı seviyesinde engeller.
- İtiraz taslağı oluşturulurken seçilen her fark kalemi için ayrı itiraz kaydı açılır.
*/

CREATE TABLE IF NOT EXISTS itirazlar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id uuid NOT NULL DEFAULT auth.uid() REFERENCES kullanicilar(id) ON DELETE CASCADE,
  fark_kalem_id uuid NOT NULL REFERENCES fark_kalemleri(id) ON DELETE CASCADE,
  magaza_id uuid NOT NULL REFERENCES magazalar(id) ON DELETE CASCADE,
  durum text NOT NULL DEFAULT 'acik',
  toplam_tutar numeric NOT NULL DEFAULT 0,
  aciklama text,
  olusturma_tarihi timestamptz NOT NULL DEFAULT now(),
  guncelleme_tarihi timestamptz NOT NULL DEFAULT now()
);

-- Aynı fark kalemi için birden fazla itirazı engelle
CREATE UNIQUE INDEX IF NOT EXISTS idx_itirazlar_fark_kalem_unique ON itirazlar(fark_kalem_id);

ALTER TABLE itirazlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_itirazlar" ON itirazlar;
CREATE POLICY "select_own_itirazlar"
ON itirazlar FOR SELECT
TO authenticated USING (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "insert_own_itirazlar" ON itirazlar;
CREATE POLICY "insert_own_itirazlar"
ON itirazlar FOR INSERT
TO authenticated WITH CHECK (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "update_own_itirazlar" ON itirazlar;
CREATE POLICY "update_own_itirazlar"
ON itirazlar FOR UPDATE
TO authenticated USING (auth.uid() = kullanici_id) WITH CHECK (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "delete_own_itirazlar" ON itirazlar;
CREATE POLICY "delete_own_itirazlar"
ON itirazlar FOR DELETE
TO authenticated USING (auth.uid() = kullanici_id);

CREATE INDEX IF NOT EXISTS idx_itirazlar_kullanici_id ON itirazlar(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_itirazlar_magaza_id ON itirazlar(magaza_id);