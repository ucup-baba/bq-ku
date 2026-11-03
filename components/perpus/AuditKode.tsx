'use client';
import { useEffect, useState } from 'react';
import { Sparkle, CheckCircle, DownloadSimple } from '@phosphor-icons/react';
import type { Buku } from '@/lib/perpus/tipe';
import { KELAS_DDC } from '@/lib/perpus/ddc';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama, kelasTombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';

type Usulan = { kelasDdc: string; alasan: string; yakin: number };
const UKURAN_BATCH = 10;
const SEJALAN = 3;

export function AuditKode() {
  const [buku, setBuku] = useState<Buku[]>([]);
  const [pilihan, setPilihan] = useState<Record<string, string>>({});
  const [usulan, setUsulan] = useState<Record<string, Usulan>>({});
  const [centang, setCentang] = useState<Set<string>>(new Set());
  const [progres, setProgres] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/buku?status=perlu_audit');
    const d = await res.json();
    if (!res.ok) { setGalat(d.error || 'Gagal memuat'); return; }
    setBuku(d.data);
  };
  useEffect(() => { muat(); }, []);

  /**
   * Hanya buku yang belum punya usulan; SEJALAN batch dikirim bersamaan. Batch yang gagal (mis. Gemini 503)
   * dilewati agar sisanya tetap jalan; tekan tombol lagi untuk mencoba yang tersisa. Batas AI habis → berhenti.
   */
  const usulkanSemua = async () => {
    setGalat(null);
    const sisa = buku.filter(b => !usulan[b.id]);
    const batch: Buku[][] = [];
    for (let i = 0; i < sisa.length; i += UKURAN_BATCH) batch.push(sisa.slice(i, i + UKURAN_BATCH));
    let selesai = 0, gagal = 0, berhenti: string | null = null;
    const kerjakan = async (isi: Buku[]) => {
      if (berhenti) return;
      try {
        const res = await fetch('/api/perpus/klasifikasi', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buku: isi.map(b => ({ judul: b.judul, penulis: b.penulis })) }),
        });
        const d = await res.json();
        if (res.status === 429) { berhenti = d.error || 'Batas AI tercapai'; return; }
        if (!res.ok) { gagal += isi.length; return; }
        const baru: Record<string, Usulan> = {};
        isi.forEach((b, j) => { if (d.data[j]) baru[b.id] = d.data[j]; });
        setUsulan(p => ({ ...p, ...baru }));
        setPilihan(p => ({ ...Object.fromEntries(Object.entries(baru).map(([id, u]) => [id, u.kelasDdc])), ...p }));
        setCentang(p => new Set([...p, ...Object.entries(baru).filter(([, u]) => u.yakin >= 0.8).map(([id]) => id)]));
      } catch {
        gagal += isi.length;
      } finally {
        selesai += isi.length;
        setProgres(`AI ${selesai}/${sisa.length}…`);
      }
    };
    setProgres(`AI 0/${sisa.length}…`);
    for (let i = 0; i < batch.length; i += SEJALAN) await Promise.all(batch.slice(i, i + SEJALAN).map(kerjakan));
    setProgres(null);
    if (berhenti) setGalat(berhenti);
    else if (gagal) setGalat(`${gagal} buku belum mendapat usulan (AI sedang sibuk). Tekan "Usulkan" lagi untuk mencoba sisanya.`);
  };
  const belumDiusulkan = buku.filter(b => !usulan[b.id]).length;

  const terapkan = async () => {
    const items = [...centang].filter(id => pilihan[id]).map(id => ({ id, kelasDdc: pilihan[id] }));
    if (!items.length) return;
    setProgres(`Menerapkan ${items.length} nomor…`); setGalat(null);
    const res = await fetch('/api/perpus/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
    const d = await res.json();
    setProgres(null);
    if (!res.ok) { setGalat(d.error || 'Gagal menerapkan'); return; }
    setCentang(new Set());
    await muat();
  };

  const ubahCentang = (id: string, v: boolean) => setCentang(p => { const s = new Set(p); if (v) s.add(id); else s.delete(id); return s; });

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Audit kode" sub={`${buku.length} buku perlu dipindah ke DDC baku`} subTampilDiHp
        aksi={/* <a> biasa: next/link akan mem-prefetch rute API CSV */
          <a href="/api/perpus/label" download className={kelasTombolUtama}><DownloadSimple size={18} weight="bold" aria-hidden /> Label CSV</a>} />
      <div className="flex flex-wrap gap-2">
        <TombolUtama ikon={Sparkle} onClick={usulkanSemua} disabled={!!progres || !belumDiusulkan}>
          {belumDiusulkan === buku.length ? 'Usulkan semua (AI)' : `Usulkan ${belumDiusulkan} sisanya (AI)`}
        </TombolUtama>
        <TombolUtama ikon={CheckCircle} onClick={terapkan} disabled={!!progres || !centang.size}>Terapkan {centang.size} terpilih</TombolUtama>
        {progres && <span className="self-center text-sm text-bq-redup">{progres}</span>}
      </div>
      <p className="text-xs text-bq-redup">Usulan dengan keyakinan ≥ 80% otomatis dicentang. Periksa sisanya satu per satu.</p>
      {galat && <PesanGalat pesan={galat} />}
      <div className="space-y-2">
        {buku.map(b => (
          <Kartu key={b.id} className="p-3 space-y-2">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={centang.has(b.id)} onChange={e => ubahCentang(b.id, e.target.checked)} aria-label={`Pilih ${b.judul}`} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-bq-tinta">{b.judul}</p>
                <p className="text-xs text-bq-redup">{b.penulis || '—'} · lama: <span className="font-mono">{b.nomorPanggilLama || '—'}</span>{b.catatanAudit ? ` · ${b.catatanAudit}` : ''}</p>
                {usulan[b.id] && <p className="text-xs text-bq-redup">AI: {usulan[b.id].alasan} ({Math.round(usulan[b.id].yakin * 100)}%)</p>}
              </div>
            </div>
            <select className={kelasInput} value={pilihan[b.id] ?? ''} aria-label={`Kelas ${b.judul}`}
              onChange={e => { setPilihan(p => ({ ...p, [b.id]: e.target.value })); ubahCentang(b.id, !!e.target.value); }}>
              <option value="">Pilih kelas…</option>
              {KELAS_DDC.map(k => <option key={k.kode} value={k.kode}>{k.kode} — {k.id}</option>)}
            </select>
          </Kartu>
        ))}
      </div>
    </div>
  );
}
