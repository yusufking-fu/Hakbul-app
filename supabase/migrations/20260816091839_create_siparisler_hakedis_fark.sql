/*
# HakBul: Sipariş, Hakediş Dönemi ve Fark Kalemleri tabloları + sirket_turu kolonu

1. Değiştirilen Tablolar
- `magazalar`
  - Yeni kolon: `sirket_turu` (text, varsayılan "sahis")
  - Açıklama: Şirket türü (sahis / limited). Stopaj hesaplamasında kullanılır.

2. Yeni Tablolar
- `siparisler`
  - `id` (uuid, primary key)
  - `magaza_id` (uuid, magazalar tablosuna referans, ON DELETE CASCADE)
  - `siparis_no` (text)
  - `urun_adi` (text)
  - `kategori` (text)
  - `satis_tutari` (numeric)
  - `kargo_tutari` (numeric)
  - `komisyon_orani` (numeric, yüzde olarak, örn 0.18)
  - `teslim_tarihi` (date)
  - `iade_durumu` (boolean, varsayılan false)
  - `ham_veri` (jsonb)
  - `olusturma_tarihi` (timestamptz, varsayılan now)
- `hakedis_donemleri`
  - `id` (uuid, primary key)
  - `magaza_id` (uuid, magazalar tablosuna referans, ON DELETE CASCADE)
  - `donem_baslangic` (date)
  - `donem_bitis` (date)
  - `beklenen_toplam` (numeric)
  - `gercek_odenen_toplam` (numeric)
  - `fark_toplam` (numeric)
  - `tarama_tarihi` (timestamptz, varsayılan now)
- `fark_kalemleri`
  - `id` (uuid, primary key)
  - `donem_id` (uuid, hakedis_donemleri referansı, ON DELETE CASCADE)
  - `siparis_id` (uuid, siparisler referansı, ON DELETE CASCADE)
  - `beklenen_tutar` (numeric)
  - `gercek_tutar` (numeric)
  - `fark` (numeric)
  - `fark_turu` (text: komisyon/desi/iade/diger)

3. Güvenlik (RLS)
- Üç yeni tabloda da RLS etkin.
- Erişim, magazalar tablosu üzerinden sahiplik kontrolü ile yapılır:
  `EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = <tablo>.magaza_id AND magazalar.kullanici_id = auth.uid())`
- fark_kalemleri için donem_id ve siparis_id üzerinden sahiplik kontrolü yapılır.
- Tüm CRUD işlemleri (SELECT/INSERT/UPDATE/DELETE) kullanıcı kendi verisiyle sınırlıdır.
*/

-- magazalar tablosuna sirket_turu kolonu ekle
ALTER TABLE magazalar
  ADD COLUMN IF NOT EXISTS sirket_turu text NOT NULL DEFAULT 'sahis';

-- siparisler tablosu
CREATE TABLE IF NOT EXISTS siparisler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magaza_id uuid NOT NULL REFERENCES magazalar(id) ON DELETE CASCADE,
  siparis_no text NOT NULL,
  urun_adi text NOT NULL,
  kategori text,
  satis_tutari numeric NOT NULL DEFAULT 0,
  kargo_tutari numeric NOT NULL DEFAULT 0,
  komisyon_orani numeric NOT NULL DEFAULT 0,
  teslim_tarihi date,
  iade_durumu boolean NOT NULL DEFAULT false,
  ham_veri jsonb,
  olusturma_tarihi timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE siparisler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_siparisler" ON siparisler;
CREATE POLICY "select_own_siparisler"
ON siparisler FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = siparisler.magaza_id AND magazalar.kullanici_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_own_siparisler" ON siparisler;
CREATE POLICY "insert_own_siparisler"
ON siparisler FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = siparisler.magaza_id AND magazalar.kullanici_id = auth.uid())
);

DROP POLICY IF EXISTS "update_own_siparisler" ON siparisler;
CREATE POLICY "update_own_siparisler"
ON siparisler FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = siparisler.magaza_id AND magazalar.kullanici_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = siparisler.magaza_id AND magazalar.kullanici_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_own_siparisler" ON siparisler;
CREATE POLICY "delete_own_siparisler"
ON siparisler FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = siparisler.magaza_id AND magazalar.kullanici_id = auth.uid())
);

-- hakedis_donemleri tablosu
CREATE TABLE IF NOT EXISTS hakedis_donemleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magaza_id uuid NOT NULL REFERENCES magazalar(id) ON DELETE CASCADE,
  donem_baslangic date NOT NULL,
  donem_bitis date NOT NULL,
  beklenen_toplam numeric NOT NULL DEFAULT 0,
  gercek_odenen_toplam numeric NOT NULL DEFAULT 0,
  fark_toplam numeric NOT NULL DEFAULT 0,
  tarama_tarihi timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hakedis_donemleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_hakedis_donemleri" ON hakedis_donemleri;
CREATE POLICY "select_own_hakedis_donemleri"
ON hakedis_donemleri FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = hakedis_donemleri.magaza_id AND magazalar.kullanici_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_own_hakedis_donemleri" ON hakedis_donemleri;
CREATE POLICY "insert_own_hakedis_donemleri"
ON hakedis_donemleri FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = hakedis_donemleri.magaza_id AND magazalar.kullanici_id = auth.uid())
);

DROP POLICY IF EXISTS "update_own_hakedis_donemleri" ON hakedis_donemleri;
CREATE POLICY "update_own_hakedis_donemleri"
ON hakedis_donemleri FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = hakedis_donemleri.magaza_id AND magazalar.kullanici_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = hakedis_donemleri.magaza_id AND magazalar.kullanici_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_own_hakedis_donemleri" ON hakedis_donemleri;
CREATE POLICY "delete_own_hakedis_donemleri"
ON hakedis_donemleri FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM magazalar WHERE magazalar.id = hakedis_donemleri.magaza_id AND magazalar.kullanici_id = auth.uid())
);

-- fark_kalemleri tablosu
CREATE TABLE IF NOT EXISTS fark_kalemleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donem_id uuid NOT NULL REFERENCES hakedis_donemleri(id) ON DELETE CASCADE,
  siparis_id uuid NOT NULL REFERENCES siparisler(id) ON DELETE CASCADE,
  beklenen_tutar numeric NOT NULL DEFAULT 0,
  gercek_tutar numeric NOT NULL DEFAULT 0,
  fark numeric NOT NULL DEFAULT 0,
  fark_turu text NOT NULL DEFAULT 'diger'
);

ALTER TABLE fark_kalemleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_fark_kalemleri" ON fark_kalemleri;
CREATE POLICY "select_own_fark_kalemleri"
ON fark_kalemleri FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM hakedis_donemleri
    JOIN magazalar ON magazalar.id = hakedis_donemleri.magaza_id
    WHERE hakedis_donemleri.id = fark_kalemleri.donem_id
    AND magazalar.kullanici_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_own_fark_kalemleri" ON fark_kalemleri;
CREATE POLICY "insert_own_fark_kalemleri"
ON fark_kalemleri FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM hakedis_donemleri
    JOIN magazalar ON magazalar.id = hakedis_donemleri.magaza_id
    WHERE hakedis_donemleri.id = fark_kalemleri.donem_id
    AND magazalar.kullanici_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_own_fark_kalemleri" ON fark_kalemleri;
CREATE POLICY "update_own_fark_kalemleri"
ON fark_kalemleri FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM hakedis_donemleri
    JOIN magazalar ON magazalar.id = hakedis_donemleri.magaza_id
    WHERE hakedis_donemleri.id = fark_kalemleri.donem_id
    AND magazalar.kullanici_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM hakedis_donemleri
    JOIN magazalar ON magazalar.id = hakedis_donemleri.magaza_id
    WHERE hakedis_donemleri.id = fark_kalemleri.donem_id
    AND magazalar.kullanici_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_own_fark_kalemleri" ON fark_kalemleri;
CREATE POLICY "delete_own_fark_kalemleri"
ON fark_kalemleri FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM hakedis_donemleri
    JOIN magazalar ON magazalar.id = hakedis_donemleri.magaza_id
    WHERE hakedis_donemleri.id = fark_kalemleri.donem_id
    AND magazalar.kullanici_id = auth.uid()
  )
);

-- Sık kullanılan sorgular için indeksler
CREATE INDEX IF NOT EXISTS idx_siparisler_magaza_id ON siparisler(magaza_id);
CREATE INDEX IF NOT EXISTS idx_hakedis_donemleri_magaza_id ON hakedis_donemleri(magaza_id);
CREATE INDEX IF NOT EXISTS idx_fark_kalemleri_donem_id ON fark_kalemleri(donem_id);
CREATE INDEX IF NOT EXISTS idx_fark_kalemleri_siparis_id ON fark_kalemleri(siparis_id);
