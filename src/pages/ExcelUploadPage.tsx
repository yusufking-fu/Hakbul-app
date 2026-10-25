import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  Zap, FileUp, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatTL } from '@/lib/format';
import { parseExcelFile, isParseError, ParseError } from '@/lib/excelParse';
import { analyzeExcelRows, AnalizSonuc } from '@/lib/excelAnalyze';
import { DiffType, diffTypeLabels } from '@/types/dispute';

type Step = 'idle' | 'parsing' | 'parsed' | 'uploading' | 'saving' | 'done' | 'error';

export default function ExcelUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [parseError, setParseError] = useState<ParseError | null>(null);
  const [analiz, setAnaliz] = useState<AnalizSonuc | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setStep('parsing');
    setParseError(null);
    setAnaliz(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      setFileData(buffer);

      const result = parseExcelFile(buffer);

      if (isParseError(result)) {
        setParseError(result);
        setStep('error');
        return;
      }

      const sonuc = analyzeExcelRows(result.rows);
      setAnaliz(sonuc);
      setStep('parsed');
    } catch {
      setParseError({ field: 'dosya', message: 'Dosya okunamadı. .xlsx, .xls veya .csv formatında olduğundan emin olun.' });
      setStep('error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!analiz || !fileData) return;

    setStep('uploading');
    setSaveError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        navigate('/giris');
        return;
      }

      const file = new File([fileData], fileName || 'ekstre.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const formData = new FormData();
      formData.append('file', file);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadRes = await fetch(`${supabaseUrl}/functions/v1/excel-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }));
        setSaveError(`Dosya yüklenemedi: ${errBody.error || uploadRes.statusText}`);
        setStep('parsed');
        return;
      }

      setStep('saving');

      const userId = user?.id || sessionData.session?.user?.id;
      if (!userId) {
        navigate('/giris');
        return;
      }

      // Create a magaza for Excel flow if none exists
      const { data: existingMagaza } = await supabase
        .from('magazalar')
        .select('id')
        .eq('kullanici_id', userId)
        .maybeSingle();

      let magazaId = existingMagaza?.id;

      if (!magazaId) {
        const { data: newMagaza, error: magazaErr } = await supabase
          .from('magazalar')
          .insert({
            kullanici_id: userId,
            platform: 'trendyol',
            baglanti_durumu: 'excel',
          })
          .select()
          .single();

        if (magazaErr || !newMagaza) {
          setSaveError('Mağaza kaydı oluşturulamadı.');
          setStep('parsed');
          return;
        }
        magazaId = newMagaza.id;
      }

      // Create hakedis donemi
      const now = new Date();
      const donemBaslangic = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
      const { data: donem, error: donemErr } = await supabase
        .from('hakedis_donemleri')
        .insert({
          magaza_id: magazaId,
          donem_baslangic: donemBaslangic.toISOString().slice(0, 10),
          donem_bitis: now.toISOString().slice(0, 10),
          beklenen_toplam: 0,
          gercek_odenen_toplam: 0,
          fark_toplam: analiz.toplamFark,
        })
        .select()
        .single();

      if (donemErr || !donem) {
        setSaveError('Hakediş dönemi oluşturulamadı.');
        setStep('parsed');
        return;
      }

      // Group farklar by siparisNo and create siparisler + fark_kalemleri
      const siparisMap = new Map<string, string>();

      // Create a catch-all siparis for orphan farklar (siparisNo = '—')
      const hasOrphan = analiz.farklar.some((f) => f.siparisNo === '—');
      if (hasOrphan) {
        const { data: orphanSiparis, error: orphanErr } = await supabase
          .from('siparisler')
          .insert({
            magaza_id: magazaId,
            siparis_no: `ORPHAN-${Date.now()}`,
            urun_adi: 'Sipariş karşılığı olmayan kesintiler',
            kategori: null,
            satis_tutari: 0,
            kargo_tutari: 0,
            komisyon_orani: 0,
            teslim_tarihi: null,
            iade_durumu: false,
            ham_veri: { kaynak: 'excel', dosya: fileName },
          })
          .select()
          .single();

        if (orphanErr || !orphanSiparis) {
          setSaveError('Sipariş kaydı oluşturulamadı.');
          setStep('parsed');
          return;
        }
        siparisMap.set('—', orphanSiparis.id);
      }

      for (const fark of analiz.farklar) {
        if (fark.siparisNo === '—') continue;
        if (siparisMap.has(fark.siparisNo)) continue;

        const { data: siparis, error: siparisErr } = await supabase
          .from('siparisler')
          .insert({
            magaza_id: magazaId,
            siparis_no: fark.siparisNo,
            urun_adi: fark.urunAdi || 'Bilinmeyen ürün',
            kategori: null,
            satis_tutari: 0,
            kargo_tutari: 0,
            komisyon_orani: 0,
            teslim_tarihi: null,
            iade_durumu: false,
            ham_veri: { kaynak: 'excel', dosya: fileName },
          })
          .select()
          .single();

        if (siparisErr || !siparis) {
          setSaveError('Sipariş kaydı oluşturulamadı.');
          setStep('parsed');
          return;
        }
        siparisMap.set(fark.siparisNo, siparis.id);
      }

      // Create fark_kalemleri
      const fallbackSiparisId = Array.from(siparisMap.values())[0] || '';
      const farkKayitlari = analiz.farklar.map((f) => ({
        donem_id: donem.id,
        siparis_id: siparisMap.get(f.siparisNo) || fallbackSiparisId,
        beklenen_tutar: 0,
        gercek_tutar: 0,
        fark: f.fark,
        fark_turu: f.farkTuru,
      })).filter((k) => k.siparis_id);

      if (farkKayitlari.length > 0) {
        const { error: farkErr } = await supabase.from('fark_kalemleri').insert(farkKayitlari);
        if (farkErr) {
          setSaveError(`Fark kalemleri kaydedilemedi: ${farkErr.message}`);
          setStep('parsed');
          return;
        }
      }

              setStep('done');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setSaveError(`Beklenmeyen bir hata oluştu: ${(err as Error).message || 'Bilinmeyen hata'}`);
      setStep('parsed');
    }
  };

  const periodLabel = new Date().toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  const uniqueOrderCount = new Set(
    (analiz?.farklar ?? []).filter((f) => f.siparisNo && f.siparisNo !== '—').map((f) => f.siparisNo)
  ).size;

  const resultCardTitle = parseError
    ? 'Dosya tamamlanamadı'
    : 'Kontrol tamamlandı';

  const resultCardMessage = parseError
    ? "Trendyol'dan Cari Hesap Ekstresi'ni yeniden indirip tekrar yükleyin."
    : analiz && analiz.farklar.length > 0
      ? `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} döneminde ${uniqueOrderCount || analiz.farklar.length} siparişte toplam ₺${formatTL(analiz.toplamFark)} tutarsızlık bulduk. Detayları görmek ve Trendyol'a itiraz taslağını almak için sonuçları kaydedin.`
      : `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} döneminde incelediğimiz ${Math.max(analiz?.groupedOrders.length ?? 1, 1)} işlemde tutarsızlık bulunmadı.`;

  return (
    month: 'long',
    year: 'numeric',
  });

  const uniqueOrderCount = new Set(
    (analiz?.farklar ?? []).filter((f) => f.siparisNo && f.siparisNo !== '—').map((f) => f.siparisNo)
  ).size;

  const resultCardTitle = parseError
    ? 'Dosya tamamlanamadı'
    : 'Kontrol tamamlandı';

  const resultCardMessage = parseError
    ? "Trendyol'dan Cari Hesap Ekstresi'ni yeniden indirip tekrar yükleyin."
    : analiz && analiz.farklar.length > 0
      ? `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} döneminde ${uniqueOrderCount || analiz.farklar.length} siparişte toplam ₺${formatTL(analiz.toplamFark)} tutarsızlık bulduk. Detayları görmek ve Trendyol'a itiraz taslağını almak için sonuçları kaydedin.`
      : `${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} döneminde incelediğimiz ${Math.max(analiz?.groupedOrders.length ?? 1, 1)} işlemde tutarsızlık bulunmadı.`;

  return (
    <div className="min-h-screen bg-hb-bg px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/kontrol-sec"
          className="mb-8 inline-flex items-center gap-2 text-sm text-hb-muted transition-colors hover:text-hb-text"
        >
          <ArrowLeft size={16} />
          Geri
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-hb-text">Excel ile kontrol</h1>
          <p className="mt-2 text-sm leading-relaxed text-hb-muted">
            Trendyol panelinden <strong className="font-medium text-hb-text">Finans &gt; Cari Hesap Ekstresi</strong>'ni
            indirip buraya yükleyin. Sistem otomatik analiz eder.
          </p>
        </div>

        {/* Upload area */}
        {step === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-hb-border bg-hb-surface p-12 text-center transition-colors hover:border-hb-primary"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-hb-primary/10 text-hb-primary">
              <FileUp size={32} />
            </div>
            <p className="font-serif text-lg font-semibold text-hb-text">Dosya yükle</p>
            <p className="mt-2 text-sm text-hb-muted">
              .xlsx, .xls veya .csv · Sürükle bırak ya da tıkla
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}

        {/* Parsing */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center py-20">
            <Loader2 size={32} className="animate-spin text-hb-primary" />
            <p className="mt-4 text-sm text-hb-muted">Dosya analiz ediliyor…</p>
                      {/* Summary */}
            <div className="rounded-2xl border border-hb-border bg-hb-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm text-hb-muted">
                <CheckCircle2 size={16} className="text-hb-primary" />
                {fileName} yüklendi
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-hb-secondary">
                    {analiz.farkSayisi}
                  </p>
                  <p className="mt-1 text-xs text-hb-muted">Fark sayısı</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-hb-primary">
                    {formatTL(analiz.toplamFark)}
                  </p>
                  <p className="mt-1 text-xs text-hb-muted">Toplam fark</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-hb-muted">
                    {analiz.cezaSayisi}
                  </p>
                  <p className="mt-1 text-xs text-hb-muted">Ceza/operasyonel</p>
                </div>
              </div>
            </div>

            {((analiz.farklar.length > 0) || parseError) && (
              <div className="rounded-2xl border border-hb-primary/30 bg-hb-primary/5 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hb-primary/10 text-hb-primary">
                    {parseError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hb-muted">
                      {resultCardTitle}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-hb-text">{resultCardMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fark listesi */}
            {analiz.farklar.length > 0 && (
              </div>
            </div>
          </div>
        )}

        {/* Parsed — show results */}
        {(step === 'parsed' || step === 'uploading' || step === 'saving') && analiz && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-2xl border border-hb-border bg-hb-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm text-hb-muted">
                <CheckCircle2 size={16} className="text-hb-primary" />
                {fileName} yüklendi
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-hb-secondary">
                    {analiz.farkSayisi}
                  </p>
                  <p className="mt-1 text-xs text-hb-muted">Fark sayısı</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-hb-primary">
                    {formatTL(analiz.toplamFark)}
                  </p>
                  <p className="mt-1 text-xs text-hb-muted">Toplam fark</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums text-hb-muted">
                    {analiz.cezaSayisi}
                  </p>
                  <p className="mt-1 text-xs text-hb-muted">Ceza/operasyonel</p>
                </div>
              </div>
            </div>

            {/* Fark listesi */}
            {analiz.farklar.length > 0 && (
              <div className="rounded-2xl border border-hb-border bg-hb-surface overflow-hidden">
                <div className="border-b border-hb-border px-5 py-3.5">
                  <h2 className="font-serif text-base font-semibold text-hb-text">Tespit edilen farklar</h2>
                </div>
                <div className="divide-y divide-hb-border max-h-[28rem] overflow-y-auto">
                  {analiz.farklar.map((f) => (
                    <div key={f.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-hb-text">
                            {f.urunAdi || (f.farkTuru === 'ceza' ? 'Ceza/Operasyonel' : 'Bilinmeyen ürün')}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {f.siparisNo !== '—' && (
                              <span className="font-mono text-xs tabular-nums text-hb-muted">
                                #{f.siparisNo}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diffTypeStyle(f.farkTuru)}`}>
                              {diffTypeLabels[f.farkTuru] ?? 'Diğer'}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-hb-muted">{f.aciklama}</p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-hb-secondary">
                          {formatTL(f.fark)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-start gap-2.5 rounded-xl border border-hb-border bg-hb-bg/40 px-4 py-3.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-hb-primary" />
              <p className="text-xs leading-relaxed text-hb-muted">
                Dosyanız yalnızca analiz ve hizmeti geliştirmek için kullanılır, üçüncü kişilerle paylaşılmaz.
              </p>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={step === 'uploading' || step === 'saving'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-hb-primary px-6 py-4 text-base font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {step === 'uploading' || step === 'saving' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {step === 'uploading' ? 'Dosya saklanıyor…' : 'Sonuçlar kaydediliyor…'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Sonuçları kaydet ve devam et
                </>
              )}
            </button>

            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-hb-secondary/30 bg-hb-secondary/10 px-3 py-2.5 text-sm text-hb-secondary">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-hb-primary/10 text-hb-primary">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-serif text-xl font-semibold text-hb-text">Tamamlandı!</h2>
            <p className="mt-2 text-sm text-hb-muted">Dashboard'a yönlendiriliyorsun…</p>
            <Loader2 size={18} className="mt-4 animate-spin text-hb-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

function diffTypeStyle(type: DiffType): string {
  switch (type) {
    case 'komisyon': return 'bg-hb-secondary/10 text-hb-secondary';
    case 'desi': return 'bg-hb-primary/10 text-hb-primary';
    case 'iade': return 'bg-amber-500/10 text-amber-600';
    case 'mukerrer': return 'bg-orange-500/10 text-orange-600';
    case 'ceza': return 'bg-red-500/10 text-red-600';
    default: return 'bg-hb-muted/15 text-hb-muted';
  }
}
