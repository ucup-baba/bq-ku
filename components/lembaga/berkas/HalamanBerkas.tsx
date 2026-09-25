'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShareNetwork, UploadSimple, Plus } from '@phosphor-icons/react';
import type { BerkasDenganVersi, TautanBagikan } from '@/lib/db/berkas-lembaga-repo';
import type { HakBerkas } from '@/lib/lembaga/hak-berkas';
import { JENIS_BERKAS, labelJenisBerkas, jenisRahasia, type JenisBerkas } from '@/lib/lembaga/berkas';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TombolIkon, TombolUtama } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { KartuBerkas } from './KartuBerkas';
import { FormBerkas, type ModeForm } from './FormBerkas';
import { DetailBerkas } from './DetailBerkas';
import { FormTautan } from './FormTautan';
import { DaftarTautan } from './DaftarTautan';
import { CatatanAkses } from './CatatanAkses';
import { ambil } from './umum';

type Tab = 'berkas' | 'tautan' | 'akses';
type Lembar = null | { jenis: 'detail'; berkas: BerkasDenganVersi } | { jenis: 'form'; m: ModeForm } | { jenis: 'tautan' };

const labelBerkas = (b: BerkasDenganVersi) => (b.jenis === 'LAINNYA' ? b.namaLainnya ?? 'Lainnya' : labelJenisBerkas(b.jenis));

/** /lembaga/berkas — berkas legal yayasan, tautan bagikan, dan catatan akses. */
export function HalamanBerkas({ hariIni = new Date() }: { hariIni?: Date }) {
  const [tab, setTab] = useState<Tab>('berkas');
  const [data, setData] = useState<{ berkas: BerkasDenganVersi[]; hak: HakBerkas } | null>(null);
  const [tautan, setTautan] = useState<TautanBagikan[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [lembar, setLembar] = useState<Lembar>(null);
  const [saring, setSaring] = useState<{ berkasId?: string; tautanId?: string }>({});

  const muat = useCallback(async () => {
    setGalat(null);
    try {
      const [d, t] = await Promise.all([
        ambil<{ berkas: BerkasDenganVersi[]; hak: HakBerkas }>('/api/lembaga/berkas'),
        ambil<TautanBagikan[]>('/api/lembaga/tautan'),
      ]);
      setData(d); setTautan(t);
      return d;
    } catch (e) { setGalat(e instanceof Error ? e.message : 'Gagal memuat berkas lembaga.'); return null; }
  }, []);
  useEffect(() => { muat(); }, [muat]);

  const hak = data?.hak;
  const perJenis = useMemo(() => new Map((data?.berkas ?? []).filter(b => b.jenis !== 'LAINNYA').map(b => [b.jenis, b])), [data]);
  const lainnya = (data?.berkas ?? []).filter(b => b.jenis === 'LAINNYA');
  const peta = useMemo(() => Object.fromEntries((data?.berkas ?? []).map(b => [b.id, labelBerkas(b)])), [data]);
  const penerima = useMemo(() => Object.fromEntries((tautan ?? []).map(t => [t.id, t.penerima])), [tautan]);

  const tutup = () => setLembar(null);
  /** Tutup lembar & muat ulang; bila `bukaLagi`, buka kembali detail berkas itu dengan data TERBARU (bukan salinan lama). */
  const selesai = async (bukaLagi?: string) => {
    setLembar(null);
    const d = await muat();
    const b = bukaLagi ? d?.berkas.find(x => x.id === bukaLagi) : undefined;
    if (b) setLembar({ jenis: 'detail', berkas: b });
  };
  const judulLembar = !lembar ? '' : lembar.jenis === 'tautan' ? 'Bagikan berkas'
    : lembar.jenis === 'detail' ? labelBerkas(lembar.berkas)
    : lembar.m.mode === 'baru' ? 'Unggah berkas' : lembar.m.mode === 'versi' ? 'Ganti versi' : 'Ubah data berkas';

  return (
    <div className="space-y-3 md:space-y-5">
      <KepalaHalaman judul="Berkas lembaga" sub="SK, akta, NPWP, izin, cap & tanda tangan yayasan."
        aksi={hak?.kelola ? <>
          <TombolIkon ikon={ShareNetwork} label="Bagikan berkas" onClick={() => setLembar({ jenis: 'tautan' })} />
          <TombolUtama ikon={UploadSimple} onClick={() => setLembar({ jenis: 'form', m: { mode: 'baru' } })} className="hidden sm:inline-flex">Unggah</TombolUtama>
          <TombolIkon ikon={UploadSimple} label="Unggah berkas" varian="utama" onClick={() => setLembar({ jenis: 'form', m: { mode: 'baru' } })} className="sm:hidden" />
        </> : undefined} />

      <ChipPilihan<Tab> label="Bagian berkas lembaga" nilai={tab} onPilih={setTab}
        opsi={[
          { value: 'berkas', label: 'Berkas', jumlah: data?.berkas.filter(b => b.versi.length > 0 || jenisRahasia(b.jenis)).length },
          { value: 'tautan', label: 'Tautan bagikan', labelPendek: 'Tautan', jumlah: tautan?.length },
          { value: 'akses', label: 'Catatan akses', labelPendek: 'Catatan' },
        ]} />

      {hak && !hak.kelola && tab !== 'akses' && (
        <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-bq-redup dark:bg-slate-800/60">
          Kamu bisa melihat dan mengunduh berkas. Unggah dan bagikan sedang dinonaktifkan Superadmin.
        </p>
      )}
      {galat && <PesanGalat pesan={galat} />}

      {tab === 'berkas' && (!data ? <div className="h-40 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" /> : (
        <ul className="bergilir grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 [&>li>*]:h-full">
          {JENIS_BERKAS.filter(j => j.kunci !== 'LAINNYA').map(j => (
            <li key={j.kunci}>
              <KartuBerkas jenis={j.kunci} berkas={perJenis.get(j.kunci) ?? null} bolehUnggah={!!hak?.kelola} lihatRahasia={!!hak?.rahasia} hariIni={hariIni}
                onBuka={b => setLembar({ jenis: 'detail', berkas: b })} onUnggah={(jenis: JenisBerkas) => setLembar({ jenis: 'form', m: { mode: 'baru', jenis } })} />
            </li>
          ))}
          {lainnya.map(b => (
            <li key={b.id}>
              <KartuBerkas jenis="LAINNYA" berkas={b} bolehUnggah={!!hak?.kelola} lihatRahasia={!!hak?.rahasia} hariIni={hariIni}
                onBuka={x => setLembar({ jenis: 'detail', berkas: x })} onUnggah={() => {}} />
            </li>
          ))}
          {hak?.kelola && (
            <li>
              <button type="button" onClick={() => setLembar({ jenis: 'form', m: { mode: 'baru', jenis: 'LAINNYA' } })}
                className="tekan flex h-full min-h-[72px] w-full items-center justify-center gap-2 rounded-kartu border-2 border-dashed border-bq-garis text-sm font-bold text-bq-redup hover:border-bq-biru hover:text-bq-biru">
                <Plus size={16} weight="bold" aria-hidden="true" /> Berkas lain
              </button>
            </li>
          )}
        </ul>
      ))}

      {tab === 'tautan' && (
        <DaftarTautan tautan={tautan} bolehKelola={!!hak?.kelola} onBerubah={() => { muat(); }}
          onLihatCatatan={id => { setSaring({ tautanId: id }); setTab('akses'); }} />
      )}

      {tab === 'akses' && (
        <CatatanAkses saring={saring} labelBerkas={peta} penerimaTautan={penerima}
          labelSaring={saring.tautanId ? `Tautan: ${penerima[saring.tautanId] ?? '—'}` : saring.berkasId ? `Berkas: ${peta[saring.berkasId] ?? '—'}` : null}
          onHapusSaring={() => setSaring({})} />
      )}

      <LembarBawah buka={!!lembar} onTutup={tutup} judul={judulLembar}>
        {lembar?.jenis === 'detail' && hak && (
          <>
            <DetailBerkas b={lembar.berkas} hak={hak}
              onGantiVersi={() => setLembar({ jenis: 'form', m: { mode: 'versi', berkas: lembar.berkas } })}
              onUbah={() => setLembar({ jenis: 'form', m: { mode: 'ubah', berkas: lembar.berkas } })}
              onTerhapus={() => selesai()} />
            <button type="button" onClick={() => { setSaring({ berkasId: lembar.berkas.id }); setTab('akses'); tutup(); }}
              className="tekan mt-3 h-10 w-full rounded-xl text-xs font-bold text-bq-biru hover:bg-slate-50 dark:hover:bg-slate-800/60">
              Lihat catatan akses berkas ini
            </button>
          </>
        )}
        {lembar?.jenis === 'form' && (
          <FormBerkas m={lembar.m} jenisTerpakai={new Set(perJenis.keys())} lihatRahasia={!!hak?.rahasia}
            onSelesai={() => selesai(lembar.m.mode === 'baru' ? undefined : lembar.m.berkas.id)} />
        )}
        {lembar?.jenis === 'tautan' && data && <FormTautan berkas={data.berkas} onSelesai={() => selesai()} />}
      </LembarBawah>
    </div>
  );
}
