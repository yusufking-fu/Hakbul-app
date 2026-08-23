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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const merchantId = Deno.env.get("PAYTR_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY");
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT");

    if (!merchantId || !merchantKey || !merchantSalt) {
      console.error("PayTR environment variables not configured");
      return new Response(
        JSON.stringify({ error: "PayTR yapılandırması eksik. Lütfen PayTR bilgilerini kontrol edin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { email, origin } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-posta adresi gerekli." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData } = await supabase
      .from("kullanicilar")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "Kullanıcı bulunamadı." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantOid = `HB${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const paymentAmount = "50000";
    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // PayTR iFrame API sepet formatı
    const userBasket = JSON.stringify([
      ["HakBul Aylık Abonelik", "500.00", 1],
    ]);

    // Hash string: merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode
    const noInstallment = "0";
    const maxInstallment = "0";
    const currency = "TL";
    const testMode = "0";

    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;

    // paytr_token = HMAC-SHA256(hashStr + merchant_salt, merchant_key) base64
    const paytrToken = await hmacSha256Base64(hashStr + merchantSalt, merchantKey);

    const merchantOkUrl = `${origin || "https://hakbul.com"}/abonelik/basarili`;
    const merchantFailUrl = `${origin || "https://hakbul.com"}/abonelik/basarisiz`;

    const formData = new URLSearchParams();
    formData.append("merchant_id", merchantId);
    formData.append("user_ip", userIp);
    formData.append("merchant_oid", merchantOid);
    formData.append("email", email);
    formData.append("payment_amount", paymentAmount);
    formData.append("paytr_token", paytrToken);
    formData.append("user_basket", userBasket);
    formData.append("debug_on", "1");
    formData.append("no_installment", noInstallment);
    formData.append("max_installment", maxInstallment);
    formData.append("user_name", email.split("@")[0]);
    formData.append("user_address", "Adres bilgisi");
    formData.append("user_phone", "05555555555");
    formData.append("merchant_ok_url", merchantOkUrl);
    formData.append("merchant_fail_url", merchantFailUrl);
    formData.append("timeout_limit", "30");
    formData.append("currency", currency);
    formData.append("test_mode", testMode);
    formData.append("lang", "tr");

    const paytrResponse = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const paytrData = await paytrResponse.json();

    if (paytrData.status !== "success" || !paytrData.token) {
      console.error("PayTR get-token failed:", paytrData);
      return new Response(
        JSON.stringify({
          error: paytrData.reason || "PayTR token alınamadı.",
          detail: paytrData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const bitisTarihi = new Date(now);
    bitisTarihi.setMonth(bitisTarihi.getMonth() + 1);

    await supabase.from("abonelikler").insert({
      kullanici_id: userData.id,
      paytr_islem_no: merchantOid,
      baslangic_tarihi: now.toISOString(),
      bitis_tarihi: bitisTarihi.toISOString(),
      durum: "basarisiz",
      tutar: 500,
    });

    return new Response(
      JSON.stringify({ success: true, token: paytrData.token, merchantOid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("paytr-baslat error:", err);
    return new Response(
      JSON.stringify({ error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hmacSha256Base64(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
