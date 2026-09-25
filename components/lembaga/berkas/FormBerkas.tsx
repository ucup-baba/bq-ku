'use client';
import { useMemo, useState } from 'react';
import { Check, UploadSimple } from '@phosphor-icons/react';
import type { BerkasDenganVersi } from '@/lib/db/berkas-lembaga-repo';
import { JENIS_BERKAS, jenisRahasia, labelJenisBerkas, validasiUnggah, type JenisBerkas } from '@/lib/lembaga/berkas';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { TombolUtama } from '@/components/ui/Tombol';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasField, kelasLabel } from '@/components/ui/kelas';
import { ambil, kirimJson, ukuranTeks } from './umum';

export type ModeForm = { mode: 'baru'; jenis?: JenisBerkas } | { mode: 'versi'; berkas: BerkasDenganVersi } | { mode: 'ubah'; berkas: BerkasDenganVersi };

const Galat = ({ pesan }: { pesan?: string }) => (pesan ? <span className="text-xs text-rose-600">{pesan}</span> : null);

/** Unggah langsung ke Storage (tiket dari server), lalu daftarkan berkas/versi ke server. */
async function unggahFile(jenis: string, file: File): Promise<{ path: string; namaFile: string; mime: string; ukuran: number }> {
  const tiket = await ambil<{ bucket: string; path: string; token: string }>('/api/lembaga/berkas/unggah-url',
    kirimJson('POST', { jenis, namaFile: file.name, mime: file.type, ukuran: file.size }));
  const { error } = await createBrowserSupabase().storage.from(tiket.bucket).uploadToSignedUrl(tiket.path, tiket.token, file, { contentType: file.type });
  if (error) throw new Error(`Unggah gagal: ${error.message}`);
  return { path: tiket.path, namaFile: file.name, mime: file.type, ukuran: file.size };
}

export function FormBerkas({ m, jenisTerpakai, lihatRahasia, onSelesai }: {
  m: ModeForm; jenisTerpakai: Set<string>; lihatRahasia: boolean; onSelesai: () => void;
}) {
  const b = m.mode === 'baru' ? null : m.berkas;
  const [jenis, setJenis] = useState<JenisBerkas>(b?.jenis ?? (m.mode === 'baru' ? m.jenis : undefined) ?? 'LAINNYA');
  const [namaLainnya, setNamaLainnya] = useState(b?.namaLainnya ?? '');
  const [nomor, setNomor] = useState(b?.nomorDokumen ?? '');
  const [terbit, setTerbit] = useState(b?.tanggalTerbit ?? '');
  const [selamanya, setSelamanya] = useState(b ? !b.berlakuSampai : false);
  const [sampai, setSampai] = useState(b?.berlakuSampai ?? '');
  const [penandatangan, setPenandatangan] = useState(b?.namaPenandatangan ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [galat, setGalat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pratinjau = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  const pilihanJenis = JENIS_BERKAS.filter(j => j.kunci === 'LAINNYA' || !jenisTerpakai.has(j.kunci) || j.kunci === jenis)
    .filter(j => lihatRahasia || !j.rahasia);
  const butuhFile = m.mode !== 'ubah';
  const rahasia = jenisRahasia(jenis);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault(); setGalat(null); setFields({});
    if (butuhFile) {
      if (!file) { setFields({ file: 'Pilih berkas' }); return; }
      const g = validasiUnggah({ jenis, mime: file.type, ukuran: file.size });
      if (g) { setFields({ file: g }); return; }
    }
    if (!rahasia && !selamanya && !sampai && m.mode !== 'versi') { setFields({ berlakuSampai: 'Isi tanggal, atau centang "Berlaku selamanya"' }); return; }
    setBusy(true);
    try {
      const data = { namaLainnya, nomorDokumen: nomor, tanggalTerbit: terbit, berlakuSampai: selamanya || rahasia ? '' : sampai, namaPenandatangan: penandatangan };
      if (m.mode === 'ubah') await ambil(`/api/lembaga/berkas/${m.berkas.id}`, kirimJson('PATCH', data));
      else {
        const f = await unggahFile(jenis, file!);
        if (m.mode === 'versi') await ambil(`/api/lembaga/berkas/${m.berkas.id}/versi`, kirimJson('POST', f));
        else await ambil('/api/lembaga/berkas', kirimJson('POST', { data: { jenis, ...data }, file: f }));
      }
      onSelesai();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Gagal menyimpan berkas.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={kirim} className="space-y-4">
      {galat && <PesanGalat pesan={galat} />}
      {m.mode === 'baru' ? (
        <label className="block space-y-1">
          <span className={kelasLabel}>Jenis berkas</span>
          <select value={jenis} onChange={e => setJenis(e.target.value as JenisBerkas)} className={kelasField()}>
            {pilihanJenis.map(j => <option key={j.kunci} value={j.kunci}>{j.label}</option>)}
          </select>
        </label>
      ) : (
        <p className="text-sm font-bold text-bq-tinta">{jenis === 'LAINNYA' ? b?.namaLainnya : labelJenisBerkas(jenis)}</p>
      )}

      {m.mode !== 'versi' && (
        <>
          {jenis === 'LAINNYA' && (
            <label className="block space-y-1">
              <span className={kelasLabel}>Nama berkas</span>
              <input value={namaLainnya} onChange={e => setNamaLainnya(e.target.value)} required placeholder="Mis. MoU dengan SMP IT" className={kelasField(fields.namaLainnya)} />
            </label>
          )}
          {jenis === 'TANDA_TANGAN' && (
            <label className="block space-y-1">
              <span className={kelasLabel}>Nama penandatangan (tercetak di surat)</span>
              <input value={penandatangan} onChange={e => setPenandatangan(e.target.value)} required placeholder="Mis. Aris Eko Purwanto, S.T" className={kelasField()} />
            </label>
          )}
          {!rahasia && (
            <label className="block space-y-1">
              <span className={kelasLabel}>Nomor dokumen (opsional)</span>
              <input value={nomor} onChange={e => setNomor(e.target.value)} className={kelasField()} />
            </label>
          )}
          {!rahasia && (
            <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={kelasLabel}>Tanggal terbit</span>
              <input type="date" value={terbit} onChange={e => setTerbit(e.target.value)} className={kelasField()} />
            </label>
            <label className="block space-y-1">
              <span className={kelasLabel}>Berlaku sampai</span>
              <input type="date" value={sampai} onChange={e => setSampai(e.target.value)} disabled={selamanya} className={kelasField(fields.berlakuSampai)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-bq-tinta">
            <input type="checkbox" checked={selamanya} onChange={e => setSelamanya(e.target.checked)} className="h-4 w-4 accent-[#0E9F54]" />
            Berlaku selamanya (mis. akta)
          </label>
          <Galat pesan={fields.berlakuSampai} />
            </>
          )}
        </>
      )}

      {butuhFile && (
        <label className="block space-y-1">
          <span className={kelasLabel}>{rahasia ? 'File PNG berlatar transparan' : 'File (PDF, JPG, atau PNG · maks. 10 MB)'}</span>
          <input type="file" accept={rahasia ? 'image/png' : 'application/pdf,image/jpeg,image/png'} onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-bold dark:file:bg-slate-800" />
          {file && <span className="block text-xs text-bq-redup">{`${file.name} · ${ukuranTeks(file.size)}`}</span>}
          <Galat pesan={fields.file} />
          {pratinjau && (
            <span className="mt-2 flex h-40 items-center justify-center rounded-2xl border border-bq-garis bg-white p-2">
              <img src={pratinjau} alt="Pratinjau berkas" className="max-h-full max-w-full object-contain" />
            </span>
          )}
          {rahasia && m.mode !== 'baru' && <span className="block text-xs text-bq-redup">Surat yang belum terkirim akan memakai versi baru ini.</span>}
        </label>
      )}

      <TombolUtama type="submit" ikon={butuhFile ? UploadSimple : Check} disabled={busy} className="h-12 w-full">
        {busy ? 'Menyimpan…' : m.mode === 'ubah' ? 'Simpan perubahan' : m.mode === 'versi' ? 'Unggah versi baru' : 'Unggah berkas'}
      </TombolUtama>
    </form>
  );
}
