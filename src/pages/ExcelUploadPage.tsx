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
                    {formatTL(analiz.cezaToplami)}
                  </p>
                  <p className="mt-0.5 text-xs text-hb-muted">Ceza</p>
                </div>
              </div>
            )}
