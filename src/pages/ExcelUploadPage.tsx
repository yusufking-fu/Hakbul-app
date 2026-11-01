import { useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  FileUp, ShieldCheck, Calculator, Receipt, Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatTL } from '@/lib/format';
import { parseExcelFile, isParseError, ParseError, ExcelRow } from '@/lib/excelParse';
import { analyzeExcelRows, AnalizSonuc } from '@/lib/excelAnalyze';
import { donemHesapla, donemKarsilastir, DonemHesapSonuc, DonemKarsilastirmaSonuc } from '@/lib/donemHesapla';
import { diffTypeLabels, DiffType } from '@/types/dispute';

type Step = 'idle' | 'parsing' | 'parsed' | 'uploading' | 'saving' | 'done' | 'error';

// Stopaj oranı — şahıs şirketleri için %1, diğerleri için 0
const STOPAJ_ORANI_SAHIS = 0.01;
const STOPAJ_ORANI_DIGER = 0;

export default function ExcelUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [parseError, setParseError] = useState<ParseError | null>(null);
  const [parsedRows, setParsedRows] = useState<ExcelRow[] | null>(null);
  const [analiz, setAnaliz] = useState<AnalizSonuc | null>(null);

  // Kullanıcı girişleri
  const [yatanTutar, setYatanTutar] = useState<string>('');
  const [kdvOrani, setKdvOrani] = useState<string>('20');
  const [sirketTuru, setSirketTuru] = useState<'sahis' | 'diger'>('sahis');

  const [saveError, setSaveError] = useState<string | null>(null);

  // Dönem hesaplama
  const donemSonuc = useMemo<DonemHesapSonuc | null>(() => {
    if (!parsedRows) return null;
    const kdv = parseFloat(kdvOrani) / 100;
    const stopaj = sirketTuru === 'sahis' ? STOPAJ_ORANI_SAHIS : STOPAJ_ORANI_DIGER;
    return donemHesapla({ rows: parsedRows, kdvOrani: kdv, stopajOrani: stopaj });
  }, [parsedRows, kdvOrani, sirketTuru]);

  const karsilastirma = useMemo<DonemKarsilastirmaSonuc | null>(() => {
    if (!donemSonuc) return null;
    const yatan = parseFloat(yatanTutar.replace(',', '.'));
    if (isNaN(yatan)) return null;
    return donemKarsilastir(donemSonuc.yatacakTutar, yatan);
  }, [donemSonuc, yatanTutar]);

  const handleFile = useCallback(async (file: File) => {
    setStep('parsing');
    setParseError(null);
    setAnaliz(null);
    setParsedRows(null);
    setYatanTutar('');
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

      setParsedRows(result.rows);
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
    if (!analiz || !fileData || !donemSonuc || !karsilastirma) return;

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
        headers: { Authorization: `Bearer ${token}` },
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

      // Mağaza bul veya oluştur
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

      // Hakediş dönemi oluştur
      const now = new Date();
      const donemBaslangic = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
      const { data: donem, error: donemErr } = await supabase
        .from('hakedis_donemleri')
        .insert({
          magaza_id: magazaId,
          donem_baslangic: donemBaslangic.toISOString().slice(0, 10),
          donem_bitis: now.toISOString().slice(0, 10),
          beklenen_toplam: donemSonuc.yatacakTutar,
          gercek_odenen_toplam: parseFloat(yatanTutar.replace(',', '.')),
          fark_toplam: karsilastirma.fark,
        })
        .select()
        .single();

      if (donemErr || !donem) {
        setSaveError('Hakediş dönemi oluşturulamadı.');
        setStep('parsed');
        return;
      }

      // Dönem ödemesini kaydet (kullanıcının girdiği yatan tutar)
      await supabase
        .from('donem_odemeleri')
        .upsert({
          donem_id: donem.id,
          kullanici_id: userId,
          yatan_tutar: parseFloat(yatanTutar.replace(',', '.')),
        });

      // Sipariş ve fark kalemlerini kaydet (mevcut akış)
      const siparisMap = new Map<string, string>();

      const hasOrphan = analiz.farklar.some((f) => f.siparisNo === '—');
      if (hasOrphan) {
        const { data: orphanSiparis } = await supabase
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

        if (orphanSiparis) {
          siparisMap.set('—', orphanSiparis.id);
        }
      }

      for (const fark of analiz.farklar) {
        if (fark.siparisNo === '—') continue;
        if (siparisMap.has(fark.siparisNo)) continue;

        const { data: siparis } = await supabase
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

        if (siparis) {
          siparisMap.set(fark.siparisNo, siparis.id);
        }
      }

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
        await supabase.from('fark_kalemleri').insert(farkKayitlari);
      }

      setStep('done');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setSaveError(`Beklenmeyen bir hata oluştu: ${(err as Error).message || 'Bilinmeyen hata'}`);
      setStep('parsed');
    }
  };

  const canSave = donemSonuc !== null && karsilastirma !== null && step === 'parsed';

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
            indirip buraya yükleyin. Sistem, yatması gereken tutarı hesaplar ve gerçek yatan tutarla karşılaştırır.
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
            <p className="font-serif text-lg font-semibold text-hb-text">Cari hesap ekstresi yükle</p>
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
            <p className="mt-4 text-sm text-hb-muted">Ekstre okunuyor…</p>
          </div>
        )}

        {/* Parse error */}
        {step === 'error' && parseError && (
          <div className="rounded-2xl border border-hb-secondary/30 bg-hb-secondary/5 p-8">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="mt-0.5 shrink-0 text-hb-secondary" />
              <div>
                <h2 className="font-serif text-lg font-semibold text-hb-text">Dosya okunamadı</h2>
                <p className="mt-2 text-sm leading-relaxed text-hb-muted">
                  {parseError.field === 'siparisNo' && 'Sipariş numarası sütunu bulunamadı. '}
                  {parseError.field === 'tutar' && 'Tutar sütunu bulunamadı. '}
                  {parseError.message}
                </p>
                <p className="mt-3 text-sm text-hb-muted">
                  Bu dosyayı otomatik okuyamadık. API ile bağlanarak devam edebilirsiniz.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => { setStep('idle'); setParseError(null); }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-hb-border px-5 py-2.5 text-sm font-semibold text-hb-text transition-colors hover:border-hb-muted"
                  >
                    Başka dosya dene
                  </button>
                  <Link
                    to="/magaza-baglantisi"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-hb-primary px-5 py-2.5 text-sm font-semibold text-hb-bg shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    API ile devam et
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parsed — show results */}
        {(step === 'parsed' || step === 'uploading' || step === 'saving') && donemSonuc && (
          <div className="space-y-6">
            {/* Dosya bilgisi */}
            <div className="flex items-center gap-2 text-sm text-hb-muted">
              <CheckCircle2 size={16} className="text-hb-primary" />
              {fileName} yüklendi
            </div>

            {/* Dönem ayarları */}
            <div className="rounded-2xl border border-hb-border bg-hb-surface p-6">
              <h2 className="font-serif text-base font-semibold text-hb-text">Dönem ayarları</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-hb-muted">Ürün KDV oranı (%)</label>
                  <input
                    type="text"
                    value={kdvOrani}
                    onChange={(e) => setKdvOrani(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-hb-border bg-hb-bg px-3 py-2.5 text-sm text-hb-text focus:border-hb-primary focus:outline-none"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-hb-muted">Şirket türü</label>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      onClick={() => setSirketTuru('sahis')}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        sirketTuru === 'sahis'
                          ? 'border-hb-primary bg-hb-primary/10 text-hb-primary'
            : 'border-hb-border bg-hb-bg text-hb-muted hover:border-hb-muted'
                      }`}
                    >
                      Şahıs şirketi
                    </button>
                    <button
                      onClick={() => setSirketTuru('diger')}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        sirketTuru === 'diger'
                          ? 'border-hb-primary bg-hb-primary/10 text-hb-primary'
                          : 'border-hb-border bg-hb-bg text-hb-muted hover:border-hb-muted'
                      }`}
                    >
                      Limited / Anonim
                    </button>
                  </div>
                  {sirketTuru === 'sahis' && (
                    <p className="mt-1.5 text-xs text-hb-muted">Stopaj %1 uygulanır</p>
                  )}
                  {sirketTuru === 'diger' && (
                    <p className="mt-1.5 text-xs text-hb-muted">Stopaj uygulanmaz</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hesaplanan tutarlar özeti */}
            <div className="rounded-2xl border border-hb-border bg-hb-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-medium text-hb-muted">
                <Calculator size={16} className="text-hb-primary" />
                Hesaplanan tutarlar
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-hb-muted">Toplam satış (KDV dahil)</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-hb-text">
                    {formatTL(donemSonuc.toplamSatis)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-hb-muted">Hesaplanan hakediş</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-hb-text">
                    {formatTL(donemSonuc.hesaplananHakedis)}
                  </p>
                </div>
                <div className="sm:col-span-2 rounded-xl border border-hb-primary/20 bg-hb-primary/5 p-4">
                  <p className="text-xs font-medium text-hb-primary">Yatması gereken tutar (stopaj sonrası)</p>
                  <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-hb-primary">
                    {formatTL(donemSonuc.yatacakTutar)}
                  </p>
                </div>
              </div>
            </div>

            {/* Yatan tutar girişi */}
            <div className="rounded-2xl border border-hb-border bg-hb-surface p-6">
              <label className="flex items-center gap-2 text-sm font-medium text-hb-text">
                <Receipt size={16} className="text-hb-primary" />
                Trendyol'un hesabınıza yatırdığı tutar
              </label>
              <p className="mt-1 text-xs text-hb-muted">
                Trendyol panelinden <strong>Finans &gt; Ödemeler</strong> ekranından alınan tutarı girin.
              </p>
              <div className="mt-3 relative">
                        <input
                  type="text"
                  value={yatanTutar}
                  onChange={(e) => setYatanTutar(e.target.value)}
                  className="w-full rounded-lg border border-hb-border bg-hb-bg px-3 py-3 pr-12 text-lg font-mono tabular-nums text-hb-text focus:border-hb-primary focus:outline-none"
                  placeholder="0,00"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-hb-muted">₺</span>
              </div>
            </div>

            {/* Karşılaştırma sonucu */}
            {karsilastirma && (
              <div className={`rounded-2xl border p-6 sm:p-8 ${
                karsilastirma.uyumlu
                  ? 'border-hb-primary/30 bg-hb-primary/5'
                  : 'border-hb-secondary/30 bg-hb-secondary/5'
              }`}>
                <div className="flex items-start gap-3">
                  {karsilastirma.uyumlu ? (
                    <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-hb-primary" />
                  ) : (
                    <AlertCircle size={24} className="mt-0.5 shrink-0 text-hb-secondary" />
                  )}
                  <div className="flex-1">
                    <h2 className={`font-serif text-lg font-semibold ${
                      karsilastirma.uyumlu ? 'text-hb-primary' : 'text-hb-secondary'
                    }`}>
                      {karsilastirma.mesaj}
                    </h2>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-hb-muted">Hesaplanan yatacak</p>
                        <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-hb-text">
                          {formatTL(karsilastirma.hesaplananYatacak)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-hb-muted">Girilen yatan</p>
                        <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-hb-text">
                          {formatTL(karsilastirma.girilenYatan)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-hb-muted">Fark</p>
                        <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                          Math.abs(karsilastirma.fark) < 0.01 ? 'text-hb-primary' : 'text-hb-secondary'
                        }`}>
                          {formatTL(Math.abs(karsilastirma.fark))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Farkın kalem bazlı dökümü */}
            {karsilastirma && !karsilastirma.uyumlu && donemSonuc && (
              <div className="rounded-2xl border border-hb-border bg-hb-surface overflow-hidden">
                <div className="border-b border-hb-border px-5 py-3.5">
                  <h2 className="font-serif text-base font-semibold text-hb-text">Farkın kalem bazlı dökümü</h2>
                  <p className="mt-0.5 text-xs text-hb-muted">Ekstreden hesaplanan kesinti kalemleri</p>
                      </div>
                <div className="divide-y divide-hb-border">
                  {donemSonuc.kalemler.map((kalem, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <span className="text-sm text-hb-text">{kalem.etiket}</span>
                      <span className={`font-mono text-sm font-semibold tabular-nums ${
                        kalem.tutar !== 0 ? 'text-hb-secondary' : 'text-hb-muted'
                      }`}>
                        {formatTL(kalem.tutar)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-hb-border bg-hb-bg/40 px-5 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-hb-text">Yatması gereken tutar</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-hb-primary">
                      {formatTL(donemSonuc.yatacakTutar)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Kesinti detayı — mevcut kontrol sonuçları */}
            {analiz && analiz.farklar.length > 0 && (
              <div className="rounded-2xl border border-hb-border bg-hb-surface overflow-hidden">
                <div className="border-b border-hb-border px-5 py-3.5">
                  <h2 className="font-serif text-base font-semibold text-hb-text">Kesinti detayı</h2>
                  <p className="mt-0.5 text-xs text-hb-muted">Komisyon oranı sapması, mükerrer komisyon, iade eksikliği, ceza ve açıklanamayan kesinti kontrolleri</p>
                </div>
                <div className="divide-y divide-hb-border max-h-80 overflow-y-auto">
                  {analiz.farklar.map((f) => (
                    <div key={f.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
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

            {/* Toplam fark özeti */}
            {analiz && (
              <div className="grid grid-cols-3 gap-4 rounded-xl border border-hb-border bg-hb-surface p-5">
                <div>
                  <p className="font-mono text-xl font-semibold tabular-nums text-hb-secondary">
                    {analiz.farkSayisi}
                  </p>
                  <p className="mt-0.5 text-xs text-hb-muted">Fark sayısı</p>
                </div>
              <div>
                  <p className="font-mono text-xl font-semibold tabular-nums text-hb-primary">
                    {formatTL(analiz.toplamFark)}
                  </p>
                  <p className="mt-0.5 text-xs text-hb-muted">Toplam fark</p>
                </div>
                <div>
                  <p className="font-mono text-xl font-semibold tabular-nums text-hb-muted">
                    {analiz.cezaSayisi}
                  </p>
                  <p className="mt-0.5 text-xs text-hb-muted">Ceza/operasyonel</p>
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

            {/* Info note */}
            <div className="flex items-start gap-2.5 rounded-xl border border-hb-border bg-hb-bg/40 px-4 py-3.5">
              <Info size={16} className="mt-0.5 shrink-0 text-hb-muted" />
              <p className="text-xs leading-relaxed text-hb-muted">
                "Yatması gereken tutar" ekstredeki kalemlerden hesaplanır. "Yatan tutar"ı Trendyol panelinden manuel girersiniz. Sistem ikisini karşılaştırır ve uyuşmazlık varsa hangi kalemden kaynaklandığını gösterir.
              </p>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!canSave || step === 'uploading' || step === 'saving'}
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
