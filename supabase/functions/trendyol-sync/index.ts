import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  action: "sync-orders" | "test-finance";
  magazaId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, magazaId }: SyncRequest = await req.json();

    // Mağaza bilgilerini getir
    const { data: magaza, error: magazaError } = await supabase
      .from("magazalar")
      .select("id, kullanici_id, supplier_id, api_key, api_secret, sirket_turu")
      .eq("id", magazaId)
      .single();

    if (magazaError || !magaza) {
      return new Response(
        JSON.stringify({ error: "Mağaza bulunamadı." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { supplier_id, api_key, api_secret } = magaza;

    if (!supplier_id || !api_key || !api_secret) {
      return new Response(
        JSON.stringify({ error: "API bilgileri eksik." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic Auth header
    const basicAuth = btoa(`${api_key}:${api_secret}`);
    const authHeaders = {
      "Authorization": `Basic ${basicAuth}`,
      "User-Agent": "HakBul/1.0",
      "Accept": "application/json",
    };

    // Son 30 günün timestamp'leri
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    if (action === "sync-orders") {
      // Sipariş çekme
      const ordersUrl = `https://apigw.trendyol.com/integration/order/sellers/${supplier_id}/orders?status=Delivered&startDate=${thirtyDaysAgo}&endDate=${now}&size=50`;

      const ordersResponse = await fetch(ordersUrl, { headers: authHeaders });
      const ordersStatus = ordersResponse.status;

      if (ordersStatus !== 200) {
        const errorBody = await ordersResponse.text();
        // Bağlantı durumu güncelle
        await supabase
          .from("magazalar")
          .update({ baglanti_durumu: "hata" })
          .eq("id", magazaId);

        return new Response(
          JSON.stringify({
            error: `Trendyol sipariş API'si ${ordersStatus} döndürdü.`,
            status: ordersStatus,
            detail: errorBody.slice(0, 500),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ordersData = await ordersResponse.json();
      const trendyolOrders = ordersData.content || ordersData.orders || [];

      if (trendyolOrders.length === 0) {
        return new Response(
          JSON.stringify({
            message: "Son 30 günde teslim edilmiş sipariş bulunamadı.",
            ordersCount: 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Siparişleri veritabanına kaydet
      const siparisKayitlari = trendyolOrders.map((order: any) => {
        // Trendyol order yapısından alanları çıkar
        const lines = order.lines || order.orderLines || [];
        const firstLine = lines[0] || {};

        return {
          magaza_id: magazaId,
          siparis_no: String(order.orderNumber || order.id || ""),
          urun_adi: String(firstLine.productName || firstLine.title || "Bilinmeyen ürün"),
          kategori: String(firstLine.categoryName || firstLine.category || ""),
          satis_tutari: Number(firstLine.salePrice || firstLine.price || 0),
          kargo_tutari: Number(order.cargoPrice || firstLine.cargoPrice || 0),
          komisyon_orani: Number(firstLine.commissionRate || order.commissionRate || 0.18) / 100,
          teslim_tarihi: order.deliveryDate || order.shipmentDate || null,
          iade_durumu: Boolean(order.hasReturn || firstLine.hasReturn || false),
          ham_veri: order,
        };
      });

      const { error: insertError } = await supabase
        .from("siparisler")
        .insert(siparisKayitlari);

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Siparişler kaydedilemedi: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Bağlantı durumu güncelle
      await supabase
        .from("magazalar")
        .update({ baglanti_durumu: "baglandi" })
        .eq("id", magazaId);

      return new Response(
        JSON.stringify({
          success: true,
          ordersCount: siparisKayitlari.length,
          message: `${siparisKayitlari.length} sipariş çekildi ve kaydedildi.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test-finance") {
      const results: any = {};

      // a) Settlements endpoint
      const settlementsUrl = `https://apigw.trendyol.com/integration/finance/che/sellers/${supplier_id}/settlements`;
      try {
        const settlementsRes = await fetch(settlementsUrl, { headers: authHeaders });
        results.settlements = {
          status: settlementsRes.status,
          statusText: settlementsRes.statusText,
        };
        if (settlementsRes.status === 200) {
          const settlementsBody = await settlementsRes.json();
          results.settlements.bodyKeys = Object.keys(settlementsBody);
          results.settlements.sample = JSON.stringify(settlementsBody).slice(0, 2000);
        } else {
          results.settlements.body = (await settlementsRes.text()).slice(0, 500);
        }
      } catch (err: any) {
        results.settlements = { error: err.message };
      }

      // b) Other financials endpoint
      const otherFinUrl = `https://apigw.trendyol.com/integration/finance/che/sellers/${supplier_id}/otherfinancials?transactionType=PaymentOrder`;
      try {
        const otherFinRes = await fetch(otherFinUrl, { headers: authHeaders });
        results.otherFinancials = {
          status: otherFinRes.status,
          statusText: otherFinRes.statusText,
        };
        if (otherFinRes.status === 200) {
          const otherFinBody = await otherFinRes.json();
          results.otherFinancials.bodyKeys = Object.keys(otherFinBody);
          results.otherFinancials.sample = JSON.stringify(otherFinBody).slice(0, 2000);
        } else {
          results.otherFinancials.body = (await otherFinRes.text()).slice(0, 500);
        }
      } catch (err: any) {
        results.otherFinancials = { error: err.message };
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Geçersiz action." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
