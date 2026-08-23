import { supabase } from '@/lib/supabase';

export interface SyncOrdersResult {
  success: boolean;
  ordersCount?: number;
  message?: string;
  error?: string;
  status?: number;
}

/**
 * Trendyol siparişlerini edge function üzerinden çeker.
 * Başarısız olursa mock veriye geri dönülebilir.
 */
export async function syncTrendyolOrders(magazaId: string): Promise<SyncOrdersResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return { success: false, error: 'Oturum bulunamadı.' };
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trendyol-sync`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'sync-orders',
      magazaId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || data.detail || 'Trendyol API bağlantısı başarısız.',
      status: response.status,
    };
  }

  return {
    success: true,
    ordersCount: data.ordersCount,
    message: data.message,
  };
}

export interface FinanceTestResult {
  success: boolean;
  results?: {
    settlements?: {
      status: number;
      statusText?: string;
      bodyKeys?: string[];
      sample?: string;
      body?: string;
      error?: string;
    };
    otherFinancials?: {
      status: number;
      statusText?: string;
      bodyKeys?: string[];
      sample?: string;
      body?: string;
      error?: string;
    };
  };
  error?: string;
}

/**
 * Finans endpoint'lerini test eder ve durum kodlarını döndürür.
 */
export async function testFinanceEndpoints(magazaId: string): Promise<FinanceTestResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return { success: false, error: 'Oturum bulunamadı.' };
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trendyol-sync`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'test-finance',
      magazaId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: data.error || 'Finans endpoint testi başarısız.' };
  }

  return { success: true, results: data.results };
}
