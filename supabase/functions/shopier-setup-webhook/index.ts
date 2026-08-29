const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const shopierPat = Deno.env.get("SHOPIER_PAT");
    if (!shopierPat) {
      console.error("SHOPIER_PAT secret'i yapılandırılmamış.");
      return new Response(
        JSON.stringify({ error: "SHOPIER_PAT secret eksik. Supabase dashboard'dan ekleyin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/shopier-webhook`;

    console.log("Shopier webhook kaydı başlatılıyor...");
    console.log("Webhook URL:", webhookUrl);

    const response = await fetch("https://api.shopier.com/v1/webhooks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${shopierPat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "order.created",
        url: webhookUrl,
      }),
    });

    const responseStatus = response.status;
    const responseText = await response.text();

    console.log("=== Shopier Webhook Kayıt Yanıtı ===");
    console.log("HTTP Status:", responseStatus);
    console.log("Response Body:", responseText);

    let responseData: unknown = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Token varsa özellikle logla
    if (responseData && typeof responseData === "object") {
      const parsed = responseData as Record<string, unknown>;
      if (parsed.token) {
        console.log("=== Shopier Webhook Token ===");
        console.log("Token:", parsed.token);
      }
      if (parsed.webhook_token) {
        console.log("=== Shopier Webhook Token ===");
        console.log("webhook_token:", parsed.webhook_token);
      }
    }

    if (!response.ok) {
      console.error("Shopier webhook kaydı başarısız:", responseStatus, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          status: responseStatus,
          shopierResponse: responseData,
          webhookUrl,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: responseStatus,
        shopierResponse: responseData,
        webhookUrl,
        message: "Webhook kaydedildi. Shopier yanıtındaki token değerini Supabase Secrets'a SHOPIER_WEBHOOK_TOKEN olarak ekleyin.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("shopier-setup-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Webhook kurulumu sırasında hata oluştu.", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
