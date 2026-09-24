'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  SignOut, Sun, Moon, CaretRight, WarningCircle, EnvelopeSimple, IdentificationBadge, ArrowsLeftRight,
  Bell, CheckCircle, PaperPlaneTilt, WhatsappLogo, UserCirclePlus, DeviceMobile, Export, PlusSquare,
} from '@phosphor-icons/react';
import { usePasangAplikasi } from '@/components/pwa/usePasangAplikasi';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useNotifikasi } from '@/components/notifikasi/NotifikasiProvider';
import { getRoleLabel } from '@/lib/auth/roles';
import { ROOM_HOME, ROOM_LABEL, type Room } from '@/lib/auth/rooms';
import type { Notifikasi } from '@/lib/notifikasi/jenis';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { InisialUbin } from '@/components/ui/InisialUbin';

const kelasBaris = 'goyang-saat-hover flex items-center justify-between gap-3 rounded-2xl border border-bq-garis p-3.5 transition-colors hover:border-bq-biru';
const kelasJudulBagian = 'block px-1 text-xs font-extrabold uppercase tracking-wider text-bq-redup';

const IKON_NOTIF: Record<Notifikasi['id'], { ikon: typeof Bell; warna: 'hijau' | 'biru' | 'jingga' | 'ungu' }> = {
  'surat-belum-terkirim': { ikon: PaperPlaneTilt, warna: 'jingga' },
  'donatur-tanpa-wa': { ikon: WhatsappLogo, warna: 'hijau' },
  'akun-menunggu': { ikon: UserCirclePlus, warna: 'ungu' },
};

/** Halaman Akun (menggantikan laci akun): profil, notifikasi, pindah ruangan, tema, kelola pengguna, keluar. */
export function HalamanAkun({ room }: { room: Room }) {
  const { user, roles, rooms, canManageUsers, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { daftar, muatUlang } = useNotifikasi();
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [keluar, setKeluar] = useState(false);
  const { status: statusPasang, pasang } = usePasangAplikasi();
  const [caraIos, setCaraIos] = useState(false);

  // Halaman ini tempat notifikasi dibaca: selalu ambil yang terbaru.
  useEffect(() => { muatUlang(); }, [muatUlang]);

  const superadmin = roles.includes('SUPERADMIN');
  const ruangLain = rooms.find(r => r !== room);
  const gelap = theme === 'dark';

  const handleKeluar = async () => {
    try { setKeluar(true); await logout(); } catch (err) { console.error('Logout error:', err); setKeluar(false); }
  };

  const tombolKeluar = (() => {
    if (!konfirmasiKeluar) {
      return (
        <button type="button" onClick={() => setKonfirmasiKeluar(true)}
          className="tekan flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <SignOut size={18} weight="bold" aria-hidden="true" /> Keluar dari akun
        </button>
      );
    }
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center dark:border-rose-800 dark:bg-rose-950/60">
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
          <WarningCircle size={18} weight="fill" aria-hidden="true" /> Yakin ingin keluar?
        </p>
        <p className="text-xs text-rose-600/90 dark:text-rose-400">Anda perlu masuk lagi dengan akun Google yang terdaftar.</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setKonfirmasiKeluar(false)} disabled={keluar}
            className="rounded-xl border border-bq-garis bg-bq-surface px-3 py-2.5 text-xs font-bold text-bq-tinta">
            Batal
          </button>
          <button type="button" onClick={handleKeluar} disabled={keluar}
            className="rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">
            {keluar ? 'Mengeluarkan…' : 'Ya, keluar'}
          </button>
        </div>
      </div>
    );
  })();

  return (
    <div className="space-y-4 md:space-y-5">
      <KepalaHalaman judul="Akun" sub="Profil, notifikasi, dan pengaturan." />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Kartu className="flex items-center gap-4 p-4">
            <InisialUbin nama={user?.nama || 'Pengguna'} indeks={1} className="h-14 w-14 rounded-2xl text-lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-extrabold text-bq-tinta">{user?.nama || 'Pengguna BQ-ku'}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-bq-redup">
                <EnvelopeSimple size={13} aria-hidden="true" />
                <span className="truncate">{user?.email}</span>
              </p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${superadmin ? 'bg-emerald-50 text-[#0E9F54] dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-sky-50 text-[#0B5FA5] dark:bg-sky-950/40 dark:text-sky-300'}`}>
                {roles.map(getRoleLabel).join(' · ')}
              </span>
            </div>
          </Kartu>

          <div className="hidden lg:block">{tombolKeluar}</div>
        </div>

        <div className="space-y-5">
          <section aria-labelledby="judul-notif" className="space-y-2.5">
            <h2 id="judul-notif" className={kelasJudulBagian}>Notifikasi</h2>
            {daftar === null ? (
              <div className="h-[72px] animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            ) : daftar.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-bq-garis p-3.5">
                <IkonUbin ikon={CheckCircle} warna="hijau" />
                <span>
                  <span className="block text-sm font-bold text-bq-tinta">Semua beres</span>
                  <span className="block text-xs text-bq-redup">Tidak ada yang perlu ditindaklanjuti.</span>
                </span>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {daftar.map(n => {
                  const g = IKON_NOTIF[n.id];
                  const beda = n.ruang !== 'akun' && n.ruang !== room;
                  return (
                    <li key={n.id}>
                      <Link href={n.href} className={kelasBaris}>
                        <span className="flex min-w-0 items-center gap-3">
                          <IkonUbin ikon={g.ikon} warna={g.warna} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-bq-tinta">{n.judul}</span>
                            <span className="block truncate text-xs text-bq-redup">
                              {beda && <span className="font-semibold">{ROOM_LABEL[n.ruang as Room]} · </span>}{n.sub}
                            </span>
                          </span>
                        </span>
                        <CaretRight size={16} weight="bold" className="shrink-0 text-bq-redup" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="judul-pengaturan" className="space-y-2.5">
            <h2 id="judul-pengaturan" className={kelasJudulBagian}>Akses &amp; pengaturan</h2>

            {statusPasang !== 'tersembunyi' && (
              <div className="rounded-2xl border border-bq-garis p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <IkonUbin ikon={DeviceMobile} warna="hijau" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-bq-tinta">Pasang aplikasi BQ-ku</span>
                      <span className="block text-xs text-bq-redup">Buka langsung dari layar utama, tanpa browser</span>
                    </span>
                  </span>
                  {statusPasang === 'bisa-dipasang' ? (
                    <button type="button" onClick={pasang}
                      className="tekan shrink-0 rounded-xl bg-[#0E9F54] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0c8a49]">
                      Pasang
                    </button>
                  ) : (
                    <button type="button" onClick={() => setCaraIos(v => !v)} aria-expanded={caraIos}
                      className="tekan shrink-0 rounded-xl border border-bq-garis px-3.5 py-2 text-xs font-bold text-bq-tinta hover:bg-slate-100 dark:hover:bg-slate-800">
                      Caranya
                    </button>
                  )}
                </div>
                {statusPasang === 'ios' && caraIos && (
                  <ol className="mt-3 space-y-2 border-t border-bq-garis pt-3 text-xs text-bq-tinta">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-[#0E9F54] dark:bg-emerald-950/40">1</span>
                      Buka halaman ini di <strong>Safari</strong>, lalu ketuk tombol Bagikan <Export size={16} weight="bold" aria-label="(ikon Bagikan)" />
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-[#0E9F54] dark:bg-emerald-950/40">2</span>
                      Pilih <strong>Tambahkan ke Layar Utama</strong> <PlusSquare size={16} weight="bold" aria-hidden="true" />
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-[#0E9F54] dark:bg-emerald-950/40">3</span>
                      Ketuk <strong>Tambah</strong> — ikon BQ muncul di layar utama
                    </li>
                  </ol>
                )}
              </div>
            )}

            {ruangLain && (
              <Link href={ROOM_HOME[ruangLain]} className={kelasBaris}>
                <span className="flex items-center gap-3">
                  <IkonUbin ikon={ArrowsLeftRight} warna="biru" />
                  <span>
                    <span className="block text-sm font-bold text-bq-tinta">Pindah ke {ROOM_LABEL[ruangLain]}</span>
                    <span className="block text-xs text-bq-redup">Sekarang di {ROOM_LABEL[room]}</span>
                  </span>
                </span>
                <CaretRight size={16} weight="bold" className="text-bq-redup" aria-hidden="true" />
              </Link>
            )}

            {canManageUsers && (
              <Link href="/pengguna" className={kelasBaris}>
                <span className="flex items-center gap-3">
                  <IkonUbin ikon={IdentificationBadge} warna="ungu" />
                  <span>
                    <span className="block text-sm font-bold text-bq-tinta">Kelola pengguna</span>
                    <span className="block text-xs text-bq-redup">Izinkan email panitia &amp; atur peran</span>
                  </span>
                </span>
                <CaretRight size={16} weight="bold" className="text-bq-redup" aria-hidden="true" />
              </Link>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-bq-garis p-3.5">
              <span className="flex items-center gap-3">
                <IkonUbin ikon={gelap ? Moon : Sun} warna="jingga" />
                <span>
                  <span className="block text-sm font-bold text-bq-tinta">Tema tampilan</span>
                  <span className="block text-xs text-bq-redup">{gelap ? 'Mode gelap aktif' : 'Mode terang aktif'}</span>
                </span>
              </span>
              <button type="button" onClick={toggleTheme}
                className="tekan rounded-xl border border-bq-garis px-3.5 py-2 text-xs font-bold text-bq-tinta hover:bg-slate-100 dark:hover:bg-slate-800">
                Ganti {gelap ? 'terang' : 'gelap'}
              </button>
            </div>
          </section>

          <div className="lg:hidden">{tombolKeluar}</div>
        </div>
      </div>
    </div>
  );
}
