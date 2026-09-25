/** Bingkai foto santri: rasio penampil & ukuran berkas hasil potongan. */
export const BINGKAI_FOTO = {
  fotoFormalUrl: { judul: 'Pas foto formal (3×4)', rasio: 3 / 4, lebar: 900, tinggi: 1200, panduanWajah: true },
  fotoProfilUrl: { judul: 'Foto pose / profil', rasio: 4 / 5, lebar: 1200, tinggi: 1500, panduanWajah: false },
} as const;

export type KolomFoto = keyof typeof BINGKAI_FOTO;

/** Area potong dalam piksel, relatif terhadap kotak pembatas gambar yang sudah diputar (format react-easy-crop). */
export type AreaPotong = { x: number; y: number; width: number; height: number };

/** Ukuran kotak pembatas gambar lebar×tinggi setelah diputar `derajat`. */
export function ukuranKotakPutar(lebar: number, tinggi: number, derajat: number) {
  const rad = (derajat * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bulat = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lebar: bulat(cos * lebar + sin * tinggi), tinggi: bulat(sin * lebar + cos * tinggi) };
}

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // foto lama dari storage: tanpa ini canvas "tainted"
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Foto tidak bisa dimuat.'));
    img.src = src;
  });
}

/**
 * Potong & putar foto langsung ke kanvas berukuran keluaran (sekali gambar, tanpa kanvas antara).
 * Sudut kosong akibat rotasi diisi putih. Hasil: JPEG.
 */
export async function potongFoto(src: string, area: AreaPotong, derajat: number, keluaran: { lebar: number; tinggi: number }): Promise<Blob> {
  const img = await muatGambar(src);
  const kotak = ukuranKotakPutar(img.naturalWidth, img.naturalHeight, derajat);
  const kanvas = document.createElement('canvas');
  kanvas.width = keluaran.lebar;
  kanvas.height = keluaran.tinggi;
  const ctx = kanvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas tidak tersedia di peramban ini.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, kanvas.width, kanvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(keluaran.lebar / area.width, keluaran.tinggi / area.height);
  ctx.translate(-area.x, -area.y);
  ctx.translate(kotak.lebar / 2, kotak.tinggi / 2);
  ctx.rotate((derajat * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return new Promise((resolve, reject) =>
    kanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat berkas foto.'))), 'image/jpeg', 0.92)
  );
}
