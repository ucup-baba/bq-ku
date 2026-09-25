'use client';

import React from 'react';
import { Baloo_2 } from 'next/font/google';
import { User, GraduationCap, BookOpen, Star, IdentificationCard, Buildings, Check, MapPin, PencilSimple } from '@phosphor-icons/react';
import { calculateAge, formatDateIndonesian, samarkanNik, rapikanAlamat, rapikanNamaTempat, rapikanNamaOrang } from '@/lib/utils/formatters';

/** Huruf judul poster; hanya dimuat di halaman yang memakai poster. */
const baloo = Baloo_2({ subsets: ['latin'], variable: '--font-baloo', display: 'swap' });

export interface SantriPosterCvProps {
  santri: {
    id: string;
    namaLengkap: string;
    namaPanggilan?: string | null;
    nik: string;
    noKk?: string | null;
    nisn?: string | null;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: 'IKHWAN' | 'AKHWAT';
    jenjang: string;
    kelas: string;
    sekolahSekarang: string;
    asalSekolahSebelumnya?: string | null;
    namaAyah?: string | null;
    namaIbu?: string | null;
    kontakWali?: string | null;
    pekerjaanOrtu?: string | null;
    alamat?: string | null;
    ringkasanTentang?: string | null;
    riwayatTahfidz?: string | null;
    keahlian?: string | null;
    fotoFormalUrl?: string | null;
    fotoProfilUrl?: string | null;
    documents?: Array<{
      id: string;
      kategori: string;
      nomorDokumen?: string | null;
      fileUrl: string;
      statusVerifikasi: string;
      catatanVerifikasi?: string | null;
    }>;
  };
}

export function SantriPosterCv({ santri }: SantriPosterCvProps) {
  const skillsList: string[] = santri.keahlian
    ? (typeof santri.keahlian === 'string' ? JSON.parse(santri.keahlian) : santri.keahlian)
    : [];
  const fotoUtama = santri.fotoProfilUrl || santri.fotoFormalUrl;
  const umur = calculateAge(santri.tanggalLahir);
  const alumni = santri.jenjang === 'ALUMNI';
  const labelKelas = alumni
    ? (santri.kelas.toLowerCase().includes('lulus') ? santri.kelas : `Lulus ${santri.kelas}`)
    : `Kelas ${santri.kelas}`;
  const sekolahSekarang = rapikanNamaTempat(santri.sekolahSekarang);
  const orangTua = santri.namaAyah || santri.namaIbu ? `${rapikanNamaOrang(santri.namaAyah) || '-'} / ${rapikanNamaOrang(santri.namaIbu) || '-'}` : '-';

  return (
    <div className={`poster-wadah mx-auto w-full max-w-4xl ${baloo.variable}`}>
      <article
        data-gender={santri.jenisKelamin}
        className="poster-kertas relative overflow-hidden rounded-[1.75rem] border border-bq-garis px-5 pb-8 pt-6 shadow-kartu poster-lebar:px-10 poster-lebar:pb-10 poster-lebar:pt-9"
      >
        {/* Kepala: logo, catatan, badge */}
        <header className="flex flex-col gap-4 poster-lebar:flex-row poster-lebar:items-start poster-lebar:justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="Logo Baitul Qowwam" className="h-12 w-12 rounded-xl shadow-[0_3px_0_#0b3d2a] poster-lebar:h-14 poster-lebar:w-14" />
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-baloo)] text-xl font-extrabold leading-none tracking-wide text-poster-hijau poster-lebar:text-2xl">BAITUL QOWWAM</span>
              <span className="font-handwriting text-base leading-tight text-poster-tinta2 poster-lebar:text-lg">Luhur budinya, dalam ilmunya, tangguh juangnya</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 font-[family-name:var(--font-baloo)] text-base font-extrabold poster-lebar:shrink-0 poster-lebar:flex-nowrap poster-lebar:pt-1">
            <span className="-rotate-3 rounded-[10px] border-2 border-[#1c2536] bg-poster-aksen-lembut px-3 py-0.5 text-[#1c2536] shadow-[2px_2px_0_#1c2536]">{santri.jenisKelamin}</span>
            <span className="rotate-2 rounded-[10px] border-2 border-[#1c2536] bg-[#bfdbfe] px-3 py-0.5 uppercase text-[#1c2536] shadow-[2px_2px_0_#1c2536]">{santri.jenjang} · {labelKelas}</span>
            {umur && <span className="-rotate-2 rounded-[10px] border-2 border-[#1c2536] bg-[#d9f99d] px-3 py-0.5 text-[#1c2536] shadow-[2px_2px_0_#1c2536]">{umur.text}</span>}
          </div>
        </header>

        {/* Hero: polaroid + nama */}
        <section className="mt-8 flex flex-col items-center gap-10 poster-lebar:mt-10 poster-lebar:grid poster-lebar:grid-cols-[260px_minmax(0,1fr)] poster-lebar:items-center poster-lebar:gap-12">
          <div className="relative w-56 poster-lebar:ml-3 poster-lebar:w-[250px]">
            <div className="absolute -inset-2 rotate-3 rounded-lg bg-poster-aksen-lembut" />
            <div className="relative -rotate-2 bg-poster-polaroid p-3 pb-11 shadow-[0_14px_30px_var(--pk-bayang)]">
              <div className="flex aspect-[4/5] items-end justify-center overflow-hidden bg-[#fde68a]">
                {fotoUtama ? (
                  <img src={fotoUtama} alt={santri.namaLengkap} className="h-full w-full object-cover" />
                ) : (
                  <User size={120} weight="fill" className="mb-2 text-[#f59e0b]" aria-hidden />
                )}
              </div>
              {santri.namaPanggilan && (
                <span className="absolute inset-x-0 bottom-2 text-center font-handwriting text-xl font-bold text-[#475569]">“{santri.namaPanggilan}”</span>
              )}
            </div>
            <div className="absolute -top-4 left-6 flex -rotate-[5deg] items-center gap-1.5 bg-poster-aksen px-3.5 py-1.5 text-white shadow-[0_3px_0_rgba(28,37,54,.25)]">
              <span className="font-[family-name:var(--font-baloo)] text-sm font-extrabold tracking-wider poster-lebar:text-base">TERDATA RESMI</span>
              <Check size={16} weight="bold" aria-hidden />
            </div>
            <div className="absolute -right-6 bottom-9 h-7 w-24 -rotate-[32deg] bg-[rgba(214,196,160,.75)]" aria-hidden />
            {santri.fotoFormalUrl && santri.fotoProfilUrl && (
              <div className="absolute -bottom-6 -left-7 flex h-28 w-[86px] -rotate-6 flex-col bg-poster-polaroid p-1.5 shadow-[0_6px_14px_rgba(28,37,54,.25)]">
                <img src={santri.fotoFormalUrl} alt="Pas foto formal" className="min-h-0 flex-1 object-cover" />
                <span className="text-center font-handwriting text-base font-bold leading-tight text-[#1c2536]">Pas Foto</span>
              </div>
            )}
          </div>

          <div className="relative flex min-w-0 flex-col items-center gap-3 text-center poster-lebar:items-start poster-lebar:gap-4 poster-lebar:text-left">
            <span className="-rotate-2 rounded bg-poster-stabilo px-3 font-handwriting text-2xl font-bold text-poster-stabilo-teks poster-lebar:text-3xl">Ahlan wa Sahlan!</span>
            <h2 className="max-w-full break-words font-[family-name:var(--font-baloo)] text-[2.5rem] font-extrabold leading-none text-poster-judul poster-lebar:text-6xl">
              {santri.namaLengkap}
            </h2>
            {sekolahSekarang && (
              <span className="inline-flex -rotate-1 items-center gap-2 rounded-full border-2 border-poster-hijau bg-poster-sekolah px-4 py-1.5">
                <Buildings size={18} weight="bold" className="shrink-0 text-poster-hijau" aria-hidden />
                <span className="font-[family-name:var(--font-baloo)] text-base font-bold text-poster-hijau-tua poster-lebar:text-lg">{sekolahSekarang}</span>
              </span>
            )}
            {santri.ringkasanTentang && (
              <p className="max-w-xl text-[15px] leading-relaxed text-poster-tinta2">{santri.ringkasanTentang}</p>
            )}
            <span className="hidden rotate-[5deg] self-end font-handwriting text-xl font-bold text-poster-redup poster-lebar:block">Semangat terus yaa!</span>
          </div>
        </section>

        {/* Blok isi */}
        <section className="mt-12 grid grid-cols-1 gap-8 poster-lebar:grid-cols-2 poster-lebar:gap-x-8 poster-lebar:gap-y-9">
          <Blok judul="CAPAIAN TAHFIDZ & AL-QUR'AN" ikon={BookOpen} miring="-rotate-[.6deg]" pita="right-8 rotate-6 bg-[rgba(96,165,250,.6)]"
            kelas="bg-poster-b1-bg border-poster-b1-garis" warnaIkon="text-poster-hijau border-poster-hijau" warnaJudul="text-poster-hijau-tua">
            <span className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold leading-tight text-poster-judul">
              {santri.riwayatTahfidz || 'Dalam Proses Menghafal'}
            </span>
            <p className="text-[15px] leading-relaxed text-poster-tinta2">Terdaftar dalam program bimbingan halaqah tahfidz intensif santri Baitul Qowwam.</p>
          </Blok>

          <Blok judul="MINAT, BAKAT & KEAHLIAN" ikon={Star} miring="rotate-[.5deg]" pita="left-8 -rotate-[5deg] bg-[rgba(244,114,182,.5)]"
            kelas="bg-poster-b2-bg border-poster-b2-garis" warnaIkon="text-poster-b2-ikon border-poster-b2-ikon" warnaJudul="text-poster-b2-judul">
            {skillsList.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {skillsList.map((skill, idx) => (
                  <span key={idx} className={`rounded-[9px] border-2 border-[#1c2536] bg-white px-3 py-1 text-sm font-bold text-[#1c2536] shadow-[2px_2px_0_#1c2536] ${['-rotate-2', 'rotate-[1.5deg]', '-rotate-1'][idx % 3]}`}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-poster-tinta2">Belum ada keahlian khusus dicatat.</p>
            )}
            <span className="-rotate-3 self-end font-handwriting text-xl font-bold text-poster-b2-ikon">setiap orang punya potensi :)</span>
          </Blok>

          <Blok judul="RIWAYAT PENDIDIKAN" ikon={GraduationCap} miring="rotate-[.4deg]" pita="right-10 -rotate-[4deg] bg-[rgba(96,165,250,.6)]"
            kelas="bg-poster-b3-bg border-poster-b3-garis" warnaIkon="text-poster-b3-ikon border-poster-b3-ikon" warnaJudul="text-poster-b3-judul">
            <Baris label="Sekolah sekarang">{sekolahSekarang ? `${sekolahSekarang} · ${labelKelas}` : labelKelas}</Baris>
            {santri.asalSekolahSebelumnya && <Baris label="Sekolah asal">{rapikanNamaTempat(santri.asalSekolahSebelumnya)}</Baris>}
            <Baris label="NISN" angka>{santri.nisn || '-'}</Baris>
            <PencilSimple size={40} className="absolute bottom-4 right-5 hidden text-poster-b3-judul opacity-70 poster-lebar:block" aria-hidden />
          </Blok>

          <Blok judul="IDENTITAS & WALI SANTRI" ikon={IdentificationCard} miring="-rotate-[.4deg]" pita="left-8 rotate-[5deg] bg-[rgba(250,204,21,.6)]"
            kelas="bg-poster-b4-bg border-poster-b4-garis" warnaIkon="text-poster-b4-ikon border-poster-b4-ikon" warnaJudul="text-poster-b4-judul">
            <Baris label="Tempat, tgl lahir">{rapikanNamaTempat(santri.tempatLahir)}, {formatDateIndonesian(santri.tanggalLahir) || santri.tanggalLahir}</Baris>
            <Baris label="Orang tua">{orangTua}</Baris>
            <Baris label="WhatsApp wali" angka warna="text-poster-hijau">{santri.kontakWali || '-'}</Baris>
            <Baris label="Alamat">{rapikanAlamat(santri.alamat) || '-'}</Baris>
          </Blok>
        </section>

        {/* Kaki */}
        <footer data-audit-abaikan className="mt-12 flex flex-col-reverse items-center gap-4 poster-lebar:flex-row poster-lebar:justify-between">
          <div className="flex w-full flex-col items-center gap-1 rounded-md border-2 border-dashed border-poster-pisah bg-poster-kartu px-4 py-3 text-center text-[13px] text-poster-tinta2 poster-lebar:w-auto poster-lebar:-rotate-[.4deg] poster-lebar:flex-row poster-lebar:gap-4 poster-lebar:text-left">
            <MapPin size={18} weight="bold" className="hidden shrink-0 text-poster-hijau poster-lebar:block" aria-hidden />
            <span className="font-semibold">Dicetak dari Sistem Administrasi Santri Baitul Qowwam</span>
            <span className="hidden h-5 w-0.5 bg-poster-pisah poster-lebar:block" />
            <span className="whitespace-nowrap font-bold tabular-nums">NIK {samarkanNik(santri.nik) || '-'}</span>
          </div>
          <span className="shrink-0 -rotate-[5deg] whitespace-nowrap font-handwriting text-2xl font-bold text-poster-hijau">Jaga sholat, jaga mimpi</span>
        </footer>

        {/* Hiasan */}
        <svg viewBox="0 0 170 130" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
          className="pointer-events-none absolute right-10 top-28 hidden w-36 text-poster-hijau opacity-90 poster-lebar:block" aria-hidden>
          <path d="M20 122h140M44 122V78h82v44M50 78c0-24 70-24 70 0M85 48v-8M81 40a4 4 0 1 0 8 0M144 122V40M136 122V40h16v82M136 40l8-14 8 14M144 26v-8M74 122v-18a11 11 0 0 1 22 0v18M56 96h8M106 96h8" />
        </svg>
        <Bintang className="left-[44%] top-24 hidden h-7 w-7 poster-lebar:block" />
        <Bintang className="bottom-40 right-4 h-6 w-6" />
      </article>
    </div>
  );
}

function Blok({ judul, ikon: Ikon, miring, pita, kelas, warnaIkon, warnaJudul, children }: {
  judul: string; ikon: React.ElementType; miring: string; pita: string;
  kelas: string; warnaIkon: string; warnaJudul: string; children: React.ReactNode;
}) {
  return (
    <div className={`poster-bergaris relative flex flex-col gap-3.5 rounded-lg border-2 px-5 pb-6 pt-6 poster-lebar:px-7 ${kelas} ${miring}`}>
      <div className={`absolute -top-3 h-6 w-20 ${pita}`} aria-hidden />
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-2 bg-poster-kartu ${warnaIkon}`}>
          <Ikon size={22} weight="bold" aria-hidden />
        </span>
        <h3 className={`font-[family-name:var(--font-baloo)] text-base font-extrabold tracking-wide poster-lebar:text-lg ${warnaJudul}`}>{judul}</h3>
      </div>
      {children}
    </div>
  );
}

function Baris({ label, angka, warna, children }: { label: string; angka?: boolean; warna?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col text-[15px]">
      <span className="text-[13px] font-semibold text-poster-redup">{label}</span>
      <span className={`break-words font-bold leading-snug ${angka ? 'tabular-nums tracking-wide' : ''} ${warna ?? ''}`}>{children}</span>
    </div>
  );
}

function Bintang({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="#facc15" stroke="#1c2536" strokeWidth={1.4} strokeLinejoin="round" className={`pointer-events-none absolute ${className}`} aria-hidden>
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}
