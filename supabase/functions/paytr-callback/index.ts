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

    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY");
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT");

    if (!merchantKey || !merchantSalt) {
      console.error("PayTR environment variables not configured");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const formData = await req.formData();

    const merchantOid = formData.get("merchant_oid") as string;
    const status = formData.get("status") as string;
    const totalAmount = formData.get("total_amount") as string;
    const hash = formData.get("hash") as string;
    const failedReasonCode = formData.get("failed_reason_code") as string | null;
    const failedReasonMsg = formData.get("failed_reason_msg") as string | null;

    console.log("PayTR callback received:", {
      merchant_oid: merchantOid,
      status,
      total_amount: totalAmount,
    });

    if (!merchantOid || !status || !hash) {
      console.error("Missing required fields in PayTR callback");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Hash doğrulama: HMAC-SHA256(merchant_oid + merchant_salt + status + total_amount, merchant_key) base64
    const hashStr = `${merchantOid}${merchantSalt}${status}${totalAmount}`;
    const expectedHash = await hmacSha256Base64(hashStr, merchantKey);

    if (hash !== expectedHash) {
      console.error("PayTR callback hash mismatch:", { expected: expectedHash, received: hash });
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const { data: abonelik, error: findError } = await supabase
      .from("abonelikler")
      .select("id, kullanici_id")
      .eq("paytr_islem_no", merchantOid)
      .maybeSingle();

    if (findError || !abonelik) {
      console.error("Abonelik kaydı bulunamadı:", merchantOid);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    if (status === "success") {
      const now = new Date();
      const bitisTarihi = new Date(now);
      bitisTarihi.setMonth(bitisTarihi.getMonth() + 1);

      await supabase
        .from("abonelikler")
        .update({
          durum: "aktif",
          baslangic_tarihi: now.toISOString(),
          bitis_tarihi: bitisTarihi.toISOString(),
        })
        .eq("id", abonelik.id);

      await supabase
        .from("kullanicilar")
        .update({ abonelik_durumu: "aktif" })
        .eq("id", abonelik.kullanici_id);

      console.log("Abonelik aktif edildi:", merchantOid);
    } else {
      await supabase
        .from("abonelikler")
        .update({ durum: "basarisiz" })
        .eq("id", abonelik.id);

      console.log("Ödeme başarısız:", merchantOid, failedReasonCode, failedReasonMsg);
    }

    // PayTR'ye OK yanıtı döndür — BU ÇOK ÖNEMLİ
    // Olmazsa PayTR tekrar tekrar bildirim gönderir
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("paytr-callback error:", err);
    // Hata durumunda bile OK döndür ki PayTR tekrar denemesin
    return new Response("OK", { status: 200, headers: corsHeaders });
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
