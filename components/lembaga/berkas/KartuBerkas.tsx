'use client';
import { Lock, UploadSimple, CaretRight } from '@phosphor-icons/react';
import type { BerkasDenganVersi } from '@/lib/db/berkas-lembaga-repo';
import { labelJenisBerkas, jenisRahasia, statusMasaBerlaku, sisaHari, type JenisBerkas } from '@/lib/lembaga/berkas';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { kelasKartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { IKON_JENIS, TAMPILAN_STATUS } from './umum';

/**
 * Satu kartu per jenis berkas. `berkas` null = belum pernah diunggah.
 * Pengurus melihat berkas rahasia tanpa versi (disaring RLS) → ditampilkan "hanya Superadmin".
 */
export function KartuBerkas({ jenis, berkas, bolehUnggah, lihatRahasia, hariIni, onBuka, onUnggah }: {
  jenis: JenisBerkas; berkas: BerkasDenganVersi | null; bolehUnggah: boolean; lihatRahasia: boolean; hariIni: Date;
  onBuka: (b: BerkasDenganVersi) => void; onUnggah: (jenis: JenisBerkas) => void;
}) {
  const g = IKON_JENIS[jenis] ?? IKON_JENIS.LAINNYA;
  const rahasia = jenisRahasia(jenis);
  const judul = jenis === 'LAINNYA' ? berkas?.namaLainnya ?? 'Lainnya' : labelJenisBerkas(jenis);
  const terbaru = berkas?.versi[0];

  if (!berkas) {
    return (
      <div className={kelasKartu('biasa', 'flex items-center gap-3 border-dashed p-3.5 opacity-90')}>
        <IkonUbin ikon={g.ikon} warna="abu" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-sm font-bold text-bq-tinta">{judul}{rahasia && <Lock size={13} weight="bold" aria-label="rahasia" />}</span>
          <span className="block truncate text-xs text-bq-redup">Belum diunggah</span>
        </span>
        {bolehUnggah && (!rahasia || lihatRahasia) && (
          <button type="button" onClick={() => onUnggah(jenis)} aria-label={`Unggah ${judul}`}
            className="tekan inline-flex h-9 items-center gap-1.5 rounded-xl border border-bq-garis px-3 text-xs font-bold text-bq-tinta hover:border-bq-biru hover:text-bq-biru">
            <UploadSimple size={14} weight="bold" aria-hidden="true" /> Unggah
          </button>
        )}
      </div>
    );
  }

  const status = statusMasaBerlaku(berkas.berlakuSampai, hariIni);
  const st = TAMPILAN_STATUS[status];
  const sisa = berkas.berlakuSampai ? sisaHari(berkas.berlakuSampai, hariIni) : null;
  const keterangan = rahasia && !lihatRahasia
    ? 'Tersimpan · hanya Superadmin yang bisa membuka'
    : [berkas.nomorDokumen, terbaru ? `v${terbaru.versi}` : null, jenis === 'TANDA_TANGAN' ? berkas.namaPenandatangan : null].filter(Boolean).join(' · ') || '—';

  return (
    <button type="button" onClick={() => onBuka(berkas)} aria-label={`Detail ${judul}`}
      className={kelasKartu('biasa', 'goyang-saat-hover flex w-full items-center gap-3 p-3.5 text-left transition-transform duration-200 hover:-translate-y-0.5')}>
      <IkonUbin ikon={g.ikon} warna={g.warna} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-bold text-bq-tinta">{judul}{rahasia && <Lock size={13} weight="bold" aria-label="rahasia" />}</span>
        <span className="block truncate text-xs text-bq-redup">{keterangan}</span>
        {status !== 'tanpa-batas' && berkas.berlakuSampai && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.kelas}`}>{st.label}</span>
            <span className="text-[11px] text-bq-redup">
              {status === 'kedaluwarsa' ? `sejak ${formatDateIndonesian(berkas.berlakuSampai)}`
                : status === 'berlaku' ? `s.d. ${formatDateIndonesian(berkas.berlakuSampai)}` : `${sisa} hari lagi`}
            </span>
          </span>
        )}
      </span>
      <CaretRight size={16} weight="bold" className="shrink-0 text-bq-redup" aria-hidden="true" />
    </button>
  );
}
