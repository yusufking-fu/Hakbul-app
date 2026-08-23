/*
# HakBul: Kullanıcılar ve Mağazalar tabloları

1. Yeni Tablolar
- `kullanicilar`
  - `id` (uuid, primary key, auth.users ile ilişkili)
  - `email` (text, benzersiz)
  - `olusturma_tarihi` (timestamptz, varsayılan now)
  - `abonelik_durumu` (text, varsayılan "deneme")
- `magazalar`
  - `id` (uuid, primary key)
  - `kullanici_id` (uuid, kullanicilar tablosuna referans, ON DELETE CASCADE)
  - `platform` (text, varsayılan "trendyol")
  - `api_key` (text)
  - `api_secret` (text)
  - `supplier_id` (text)
  - `baglanti_durumu` (text, varsayılan "bekliyor")
  - `olusturma_tarihi` (timestamptz, varsayılan now)

2. Tetikiciler (Triggers)
- `on_auth_user_created`: Yeni bir auth.users kaydı oluşturulduğunda,
  kullanicilar tablosuna otomatik olarak karşılık gelen bir satır ekler.
  Böylece frontend'de manuel profil oluşturma gerekmez.

3. Güvenlik (RLS)
- Her iki tabloda da RLS etkin.
- `kullanicilar`: Her kullanıcı yalnızca kendi satırını görebilir/ekleyebilir/güncelleyebilir/silebilir (auth.uid() = id).
- `magazalar`: Her kullanıcı yalnızca kendi mağazalarını yönetebilir (auth.uid() = kullanici_id).
- `kullanici_id` sütunu `DEFAULT auth.uid()` ile tanımlıdır; böylece
  frontend insert sırasında kullanici_id belirtmese bile oturumdan otomatik dolar.
*/

-- kullanicilar tablosu
CREATE TABLE IF NOT EXISTS kullanicilar (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  olusturma_tarihi timestamptz NOT NULL DEFAULT now(),
  abonelik_durumu text NOT NULL DEFAULT 'deneme'
);

ALTER TABLE kullanicilar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_kullanicilar" ON kullanicilar;
CREATE POLICY "select_own_kullanicilar"
ON kullanicilar FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_kullanicilar" ON kullanicilar;
CREATE POLICY "insert_own_kullanicilar"
ON kullanicilar FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_kullanicilar" ON kullanicilar;
CREATE POLICY "update_own_kullanicilar"
ON kullanicilar FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_kullanicilar" ON kullanicilar;
CREATE POLICY "delete_own_kullanicilar"
ON kullanicilar FOR DELETE
TO authenticated USING (auth.uid() = id);

-- magazalar tablosu
CREATE TABLE IF NOT EXISTS magazalar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kullanici_id uuid NOT NULL DEFAULT auth.uid() REFERENCES kullanicilar(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'trendyol',
  api_key text,
  api_secret text,
  supplier_id text,
  baglanti_durumu text NOT NULL DEFAULT 'bekliyor',
  olusturma_tarihi timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE magazalar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_magazalar" ON magazalar;
CREATE POLICY "select_own_magazalar"
ON magazalar FOR SELECT
TO authenticated USING (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "insert_own_magazalar" ON magazalar;
CREATE POLICY "insert_own_magazalar"
ON magazalar FOR INSERT
TO authenticated WITH CHECK (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "update_own_magazalar" ON magazalar;
CREATE POLICY "update_own_magazalar"
ON magazalar FOR UPDATE
TO authenticated USING (auth.uid() = kullanici_id) WITH CHECK (auth.uid() = kullanici_id);

DROP POLICY IF EXISTS "delete_own_magazalar" ON magazalar;
CREATE POLICY "delete_own_magazalar"
ON magazalar FOR DELETE
TO authenticated USING (auth.uid() = kullanici_id);

-- Trigger: auth.users'a yeni kullanıcı eklendiğinde kullanicilar satırı oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kullanicilar (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
