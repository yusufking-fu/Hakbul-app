import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Sadece POST istekleri kabul edilir." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const webhookToken = Deno.env.get("SHOPIER_WEBHOOK_TOKEN");
    if (!webhookToken) {
      console.error("SHOPIER_WEBHOOK_TOKEN secret'i yapılandırılmamış.");
      return new Response(
        JSON.stringify({ error: "Webhook token yapılandırması eksik." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Token doğrulama: header veya query parametresi olarak gelebilir
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");

    const providedToken = headerToken || queryToken;

    if (!providedToken || providedToken !== webhookToken) {
      console.error("Shopier webhook token doğrulaması başarısız.");
      return new Response(
        JSON.stringify({ error: "Yetkisiz istek." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Shopier webhook verisinden alanları çıkar (farklı formatları destekle)
    const siparisId = String(
      body.order_id || body.orderId || body.siparis_id || body.id || ""
    );
    const musteriEmail = String(
      body.buyer_email || body.email || body.customer_email || body.musteri_email || ""
    ).toLowerCase().trim();
    const tutar = Number(body.total_price || body.amount || body.tutar || body.price || 0);
    const tarih = body.created_at || body.createdAt || body.order_date || body.tarih || new Date().toISOString();

    if (!siparisId || siparisId === "") {
      console.error("Shopier webhook: sipariş ID eksik.", body);
      return new Response(
        JSON.stringify({ error: "Sipariş ID eksik." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Shopier webhook alındı: sipariş=${siparisId}, email=${musteriEmail}, tutar=${tutar}`);

    // 1. Shopier siparişini kaydet (duplicate kontrolü ile)
    const { data: existingOrder } = await supabase
      .from("shopier_siparisler")
      .select("id, eslesme_durumu")
      .eq("shopier_siparis_id", siparisId)
      .maybeSingle();

    if (existingOrder) {
      console.log(`Shopier sipariş ${siparisId} zaten mevcut, durum: ${existingOrder.eslesme_durumu}`);
      return new Response(
        JSON.stringify({ success: true, message: "Bu sipariş daha önce işlendi.", siparisId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Müşteri e-postasıyla kullanicilar tablosunda eşleşme ara
    let eslesenKullaniciId: string | null = null;
    let eslesmeDurumu = "bekliyor";

    if (musteriEmail) {
      const { data: kullanici, error: kullaniciError } = await supabase
        .from("kullanicilar")
        .select("id, email")
        .eq("email", musteriEmail)
        .maybeSingle();

      if (kullaniciError) {
        console.error("Kullanıcı eşleşme sorgusu hatası:", kullaniciError);
      }

      if (kullanici) {
        eslesenKullaniciId = kullanici.id;
        eslesmeDurumu = "eslesti";
        console.log(`Eşleşme bulundu: ${musteriEmail} -> ${kullanici.id}`);
      } else {
        console.log(`Eşleşme bulunamadı: ${musteriEmail}`);
        eslesmeDurumu = "bekliyor";
      }
    }

    // 3. Shopier sipariş kaydını oluştur
    const { error: insertError } = await supabase
      .from("shopier_siparisler")
      .insert({
        shopier_siparis_id: siparisId,
        musteri_email: musteriEmail || "bilinmiyor",
        tutar,
        tarih,
        eslesme_durumu: eslesmeDurumu,
        eslesen_kullanici_id: eslesenKullaniciId,
        ham_veri: body,
      });

    if (insertError) {
      console.error("Shopier sipariş kaydı hatası:", insertError);
      return new Response(
        JSON.stringify({ error: "Sipariş kaydedilemedi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Eşleşme varsa aboneliği güncelle
    if (eslesenKullaniciId) {
      // Mevcut aktif aboneliği kontrol et
      const { data: aktifAbonelik, error: abonelikError } = await supabase
        .from("abonelikler")
        .select("id, bitis_tarihi, durum")
        .eq("kullanici_id", eslesenKullaniciId)
        .order("olusturma_tarihi", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (abonelikError) {
        console.error("Abonelik sorgu hatası:", abonelikError);
      }

      const now = new Date();

      if (aktifAbonelik && aktifAbonelik.durum === "aktif" && aktifAbonelik.bitis_tarihi) {
        // Mevcut aktif aboneliğin bitiş tarihine 30 gün ekle
        const mevcutBitis = new Date(aktifAbonelik.bitis_tarihi);
        mevcutBitis.setDate(mevcutBitis.getDate() + 30);

        const { error: updateError } = await supabase
          .from("abonelikler")
          .update({
            bitis_tarihi: mevcutBitis.toISOString(),
            durum: "aktif",
          })
          .eq("id", aktifAbonelik.id);

        if (updateError) {
          console.error("Abonelik güncelleme hatası:", updateError);
        } else {
          console.log(`Abonelik ${aktifAbonelik.id} uzatıldı, yeni bitiş: ${mevcutBitis.toISOString()}`);
        }
      } else {
        // Yeni aktif abonelik kaydı oluştur
        const baslangic = now;
        const bitis = new Date(now);
        bitis.setDate(bitis.getDate() + 30);

        const { error: newAbonelikError } = await supabase
          .from("abonelikler")
          .insert({
            kullanici_id: eslesenKullaniciId,
            baslangic_tarihi: baslangic.toISOString(),
            bitis_tarihi: bitis.toISOString(),
            durum: "aktif",
            tutar,
          });

        if (newAbonelikError) {
          console.error("Yeni abonelik oluşturma hatası:", newAbonelikError);
        } else {
          console.log(`Yeni abonelik oluşturuldu: kullanıcı=${eslesenKullaniciId}, bitiş=${bitis.toISOString()}`);
        }
      }

      // kullanicilar tablosunda abonelik_durumu'nu güncelle
      const { error: kullaniciUpdateError } = await supabase
        .from("kullanicilar")
        .update({ abonelik_durumu: "aktif" })
        .eq("id", eslesenKullaniciId);

      if (kullaniciUpdateError) {
        console.error("Kullanıcı abonelik durumu güncelleme hatası:", kullaniciUpdateError);
      }
    } else {
      console.log(`Eşleşme yok, sipariş ${siparisId} bekliyor durumunda bırakıldı.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        siparisId,
        eslesmeDurumu,
        eslesti: eslesenKullaniciId !== null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shopier-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Webhook işlenirken hata oluştu." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
