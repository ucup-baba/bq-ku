'use client';
import { useState } from 'react';
import { ArrowSquareOut, DownloadSimple, UploadSimple, PencilSimple, Trash, Lock } from '@phosphor-icons/react';
import type { BerkasDenganVersi } from '@/lib/db/berkas-lembaga-repo';
import type { HakBerkas } from '@/lib/lembaga/hak-berkas';
import { jenisRahasia, labelJenisBerkas } from '@/lib/lembaga/berkas';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { ambil, kirimJson, ukuranTeks } from './umum';

const kelasTombol = 'tekan inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-bq-garis bg-bq-surface px-3 text-xs font-bold text-bq-tinta hover:border-bq-biru hover:text-bq-biru';

/** Isi lembar detail: pratinjau, data, riwayat versi, dan aksi sesuai hak. */
export function DetailBerkas({ b, hak, onGantiVersi, onUbah, onTerhapus }: {
  b: BerkasDenganVersi; hak: HakBerkas; onGantiVersi: () => void; onUbah: () => void; onTerhapus: () => void;
}) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rahasia = jenisRahasia(b.jenis);
  const bisaBuka = !rahasia || hak.rahasia;
  const bisaKelola = rahasia ? hak.rahasia : hak.kelola;
  const terbaru = b.versi[0];
  const url = (versiId?: string, tampil = false) => `/api/lembaga/berkas/${b.id}/unduh?${new URLSearchParams({ ...(versiId ? { versi: versiId } : {}), ...(tampil ? { tampil: '1' } : {}) })}`;

  const hapus = async () => {
    setBusy(true); setGalat(null);
    try { await ambil(`/api/lembaga/berkas/${b.id}`, kirimJson('DELETE')); onTerhapus(); }
    catch (e) { setGalat(e instanceof Error ? e.message : 'Gagal menghapus.'); }
    finally { setBusy(false); }
  };

  const baris: Array<[string, string | null]> = [
    ['Nomor dokumen', b.nomorDokumen],
    ['Tanggal terbit', b.tanggalTerbit ? formatDateIndonesian(b.tanggalTerbit) : null],
    ['Berlaku sampai', b.berlakuSampai ? formatDateIndonesian(b.berlakuSampai) : rahasia ? null : 'Selamanya'],
    ['Nama penandatangan', b.jenis === 'TANDA_TANGAN' ? b.namaPenandatangan : null],
  ];

  return (
    <div className="space-y-4">
      {!bisaBuka ? (
        <p className="flex items-center gap-2 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
          <Lock size={16} weight="bold" aria-hidden="true" /> Cap dan tanda tangan hanya bisa dibuka Superadmin.
        </p>
      ) : terbaru && terbaru.mime.startsWith('image/') ? (
        <a href={url(undefined, true)} target="_blank" rel="noopener noreferrer" className="flex h-48 items-center justify-center rounded-2xl border border-bq-garis bg-white p-2">
          <img src={url(undefined, true)} alt={`Pratinjau ${labelJenisBerkas(b.jenis)}`} className="max-h-full max-w-full object-contain" />
        </a>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {baris.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className="text-xs text-bq-redup">{k}</dt><dd className="font-bold text-bq-tinta">{v}</dd></div>
        ))}
      </dl>

      {bisaBuka && terbaru && (
        <div className="grid grid-cols-2 gap-2">
          <a href={url(undefined, true)} target="_blank" rel="noopener noreferrer" className={kelasTombol}><ArrowSquareOut size={16} weight="bold" aria-hidden="true" /> Buka</a>
          <a href={url()} className={kelasTombol}><DownloadSimple size={16} weight="bold" aria-hidden="true" /> Unduh</a>
        </div>
      )}

      {bisaBuka && b.versi.length > 0 && (
        <section aria-labelledby="judul-versi" className="space-y-1.5">
          <h3 id="judul-versi" className="text-xs font-extrabold uppercase tracking-wider text-bq-redup">Riwayat versi</h3>
          <ul className="divide-y divide-bq-garis rounded-2xl border border-bq-garis">
            {b.versi.map((v, i) => (
              <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className="font-bold text-bq-tinta">{`v${v.versi}`}</span>
                {i === 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-[#0E9F54] dark:bg-emerald-950/40">berlaku</span>}
                <span className="min-w-0 flex-1 truncate text-bq-redup">{`${formatDateIndonesian(v.createdAt.slice(0, 10))} · ${ukuranTeks(v.ukuran)}`}</span>
                <a href={url(v.id)} aria-label={`Unduh versi ${v.versi}`} className="font-bold text-bq-biru hover:underline">Unduh</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {galat && <PesanGalat pesan={galat} />}
      {bisaKelola && (
        <div className="grid grid-cols-2 gap-2 border-t border-bq-garis pt-3">
          <button type="button" onClick={onGantiVersi} className={kelasTombol}><UploadSimple size={16} weight="bold" aria-hidden="true" /> Ganti versi</button>
          <button type="button" onClick={onUbah} className={kelasTombol}><PencilSimple size={16} weight="bold" aria-hidden="true" /> Ubah data</button>
        </div>
      )}
      {hak.hapus && (!konfirmasi ? (
        <button type="button" onClick={() => setKonfirmasi(true)} className="tekan flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
          <Trash size={16} weight="bold" aria-hidden="true" /> Hapus berkas
        </button>
      ) : (
        <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-bold">{`Hapus berkas ini beserta ${b.versi.length} versinya? Tautan yang memuatnya ikut kehilangan berkas ini.`}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKonfirmasi(false)} disabled={busy} className="rounded-xl border border-bq-garis bg-bq-surface py-2 font-bold text-bq-tinta">Batal</button>
            <button type="button" onClick={hapus} disabled={busy} className="rounded-xl bg-rose-600 py-2 font-bold text-white disabled:opacity-60">{busy ? 'Menghapus…' : 'Ya, hapus'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
