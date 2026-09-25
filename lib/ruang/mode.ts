/**
 * Mode ruangan: "kerja" (Ruang Santri/Donatur, bisa mengubah) atau "lembaga" (baca saja).
 * Konstanta di sini boleh dipakai komponen server; komponen klien memakai useModeRuang().
 */
export type NamaMode = 'kerja' | 'lembaga';

export type ModeRuang = {
  nama: NamaMode;
  bacaSaja: boolean;
  rute: {
    santriDaftar: string; santri: (id: string) => string;
    donaturDaftar: string; donatur: (id: string) => string;
    suratDaftar: string; surat: (id: string) => string;
  };
  api: { donatur: string; surat: string; pngSurat: (id: string) => string };
};

export const MODE_KERJA: ModeRuang = {
  nama: 'kerja',
  bacaSaja: false,
  rute: {
    santriDaftar: '/santri', santri: id => `/santri/${id}`,
    donaturDaftar: '/donatur/daftar', donatur: id => `/donatur/daftar/${id}`,
    suratDaftar: '/donatur/surat', surat: id => `/donatur/surat/${id}`,
  },
  api: { donatur: '/api/donatur', surat: '/api/donatur/surat', pngSurat: id => `/api/donatur/surat/${id}/png` },
};

export const MODE_LEMBAGA: ModeRuang = {
  nama: 'lembaga',
  bacaSaja: true,
  rute: {
    santriDaftar: '/lembaga/santri', santri: id => `/lembaga/santri/${id}`,
    donaturDaftar: '/lembaga/donatur', donatur: id => `/lembaga/donatur/${id}`,
    suratDaftar: '/lembaga/surat', surat: id => `/lembaga/surat/${id}`,
  },
  api: { donatur: '/api/lembaga/donatur', surat: '/api/lembaga/surat', pngSurat: id => `/api/lembaga/surat/${id}/png` },
};

export function modeDari(nama: NamaMode): ModeRuang {
  return nama === 'lembaga' ? MODE_LEMBAGA : MODE_KERJA;
}

/** Halaman kerja yang setara dengan halaman Lembaga (untuk tautan "Ubah di Ruang …"). */
export function padananKerja(pathname: string): { room: 'santri' | 'donatur'; href: string } | null {
  const m = /^\/lembaga\/(santri|donatur|surat)(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!m) return null;
  const [, jenis, id] = m;
  if (jenis === 'santri') return { room: 'santri', href: id ? `/santri/${id}` : '/santri' };
  if (jenis === 'donatur') return { room: 'donatur', href: id ? `/donatur/daftar/${id}` : '/donatur/daftar' };
  return { room: 'donatur', href: id ? `/donatur/surat/${id}` : '/donatur/surat' };
}
