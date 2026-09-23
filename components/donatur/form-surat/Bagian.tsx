'use client';
import { FloppyDisk, ArrowClockwise } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { terbilang } from '@/lib/utils/terbilang';
import type { JenisDonasi } from '@/lib/db/donatur-repo';
import { PilihDonatur } from '@/components/donatur/PilihDonatur';
import { KELAS_FONT_GAYA } from '@/components/donatur/PratinjauSurat';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasField, kelasLabel } from '@/components/ui/kelas';
import { kelasTombolUtama } from '@/components/ui/Tombol';
import { OPSI_JENIS } from './logika';
import type { FormSuratCtx } from './useFormSurat';

const Galat = ({ pesan }: { pesan?: string }) => (pesan ? <p className="text-xs text-rose-600">{pesan}</p> : null);

export function KotakGalat({ f }: { f: FormSuratCtx }) {
  if (!f.error) return null;
  return (
    <div className="space-y-1">
      <PesanGalat pesan={f.error} />
      {f.nomorUsulan && (
        <button type="button" onClick={f.pakaiNomorUsulan} className="px-1 text-xs font-bold text-rose-700 underline underline-offset-2">
          Pakai nomor usulan otomatis: {f.nomorUsulan}
        </button>
      )}
    </div>
  );
}

export function BagianDonatur({ f }: { f: FormSuratCtx }) {
  return (
    <div className="space-y-2">
      {f.pesanDonaturAwal && <p className="text-xs text-bq-jingga">{f.pesanDonaturAwal}</p>}
      <PilihDonatur value={f.donatur} onChange={f.ubahDonatur} errors={f.donaturFieldErrors} />
      <Galat pesan={f.fieldErrors.donaturId} />
    </div>
  );
}

export function BagianDonasi({ f }: { f: FormSuratCtx }) {
  const e = f.fieldErrors;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={kelasLabel}>Jenis / akad</span>
          <select value={f.jenis} onChange={ev => f.setJenis(ev.target.value as JenisDonasi)} className={kelasField(e.jenis)}>
            {OPSI_JENIS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Galat pesan={e.jenis} />
        </label>
        <label className="space-y-1">
          <span className={kelasLabel}>Bentuk</span>
          <select value={f.bentuk} onChange={ev => f.setBentuk(ev.target.value as 'UANG' | 'BARANG')} className={kelasField()}>
            <option value="UANG">Uang</option>
            <option value="BARANG">Barang</option>
          </select>
        </label>
      </div>
      {f.bentuk === 'UANG' ? (
        <label className="block space-y-1">
          <span className={kelasLabel}>Nominal (Rp)</span>
          <input inputMode="numeric" value={f.nominalTeks} onChange={ev => f.ubahNominal(ev.target.value)} placeholder="0"
            className={twMerge(kelasField(e.nominal), 'font-bold')} />
          <span className="block truncate text-xs italic text-bq-redup">{terbilang(f.nominal || 0)} Rupiah</span>
          <Galat pesan={e.nominal} />
        </label>
      ) : (
        <label className="block space-y-1">
          <span className={kelasLabel}>Deskripsi barang</span>
          <input value={f.deskripsiBarang} onChange={ev => f.setDeskripsiBarang(ev.target.value)}
            placeholder="mis. 50 kg beras" className={kelasField(e.deskripsiBarang)} />
          <Galat pesan={e.deskripsiBarang} />
        </label>
      )}
      <label className="block space-y-1">
        <span className={kelasLabel}>Tanggal diterima</span>
        <input type="date" value={f.tanggalDonasi} onChange={ev => f.setTanggalDonasi(ev.target.value)} className={kelasField(e.tanggal)} />
        <Galat pesan={e.tanggal} />
      </label>
      <label className="block space-y-1">
        <span className={kelasLabel}>Keterangan (opsional)</span>
        <input value={f.keterangan} onChange={ev => f.setKeterangan(ev.target.value)}
          placeholder="mis. Operasional santri penghafal" className={kelasField(e.keterangan)} />
      </label>
    </div>
  );
}

export function BagianSurat({ f }: { f: FormSuratCtx }) {
  const e = f.fieldErrors;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={kelasLabel}>Tanggal surat</span>
          <input type="date" value={f.tanggalSurat} onChange={ev => f.setTanggalSurat(ev.target.value)} className={kelasField(e.tanggalSurat)} />
          <Galat pesan={e.tanggalSurat} />
        </label>
        <label className="block space-y-1">
          <span className={kelasLabel}>Nomor surat</span>
          <input value={f.nomorSurat} onChange={ev => f.ubahNomorSurat(ev.target.value)} className={twMerge(kelasField(e.nomorSurat), 'font-mono')} />
          <Galat pesan={e.nomorSurat} />
          {f.nomorDiedit && f.nomorOtomatis && f.nomorOtomatis !== f.nomorSurat && (
            <button type="button" onClick={f.pakaiNomorOtomatis} className="flex items-center gap-1 text-xs font-bold text-bq-biru underline underline-offset-2">
              <ArrowClockwise size={14} weight="bold" aria-hidden="true" /> Pakai nomor otomatis: {f.nomorOtomatis}
            </button>
          )}
        </label>
      </div>
      <div className="space-y-2">
        <span className={kelasLabel}>Gaya tulisan tangan</span>
        <div role="radiogroup" aria-label="Gaya tulisan tangan" className="grid grid-cols-2 gap-3">
          {(['KALAM', 'PATRICK'] as const).map(g => {
            const aktif = f.gayaTulisan === g;
            return (
              <button key={g} type="button" role="radio" aria-checked={aktif} tabIndex={aktif ? 0 : -1}
                onClick={() => f.setGayaTulisan(g)}
                onKeyDown={ev => {
                  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); f.setGayaTulisan(g === 'KALAM' ? 'PATRICK' : 'KALAM'); }
                }}
                className={`tekan flex min-h-12 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition-colors ${aktif ? 'border-[#0B5FA5] bg-sky-50 dark:bg-sky-950/30' : 'border-bq-garis hover:border-slate-300'}`}>
                <span className="text-xs font-bold text-bq-tinta">{g === 'KALAM' ? 'Kalam (tegas)' : 'Patrick Hand (luwes)'}</span>
                <span className={`${KELAS_FONT_GAYA[g]} max-w-full truncate text-xl text-[#1a3891] dark:text-[#6ba1ff]`}>{f.donatur.nama || 'Pradana'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TombolSimpan({ busy, onClick, type = 'button', className }: {
  busy: boolean; onClick?: () => void; type?: 'button' | 'submit'; className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={busy} className={twMerge(kelasTombolUtama, 'h-12 w-full text-base', className)}>
      <FloppyDisk size={20} weight="bold" aria-hidden="true" />
      <span>{busy ? 'Menyimpan…' : 'Simpan & buat surat'}</span>
    </button>
  );
}

export function KartuBagian({ nomor, judul, sub, warna, children }: {
  nomor: number; judul: string; sub: string; warna: 'biru' | 'hijau' | 'ungu'; children: React.ReactNode;
}) {
  const w = { biru: 'bg-sky-100 text-[#0B5FA5]', hijau: 'bg-emerald-100 text-[#0E9F54]', ungu: 'bg-violet-100 text-violet-700' }[warna];
  return (
    <Kartu className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-black ${w}`}>{nomor}</span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold text-bq-tinta">{judul}</h2>
          <p className="truncate text-xs text-bq-redup">{sub}</p>
        </div>
      </div>
      {children}
    </Kartu>
  );
}
