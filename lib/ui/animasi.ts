import { animate, svg } from 'animejs';
import { gerakDikurangi } from './gerak';

/**
 * Menghitung naik dari 0 ke `target`, memanggil `onNilai` tiap frame (dibulatkan).
 * Bila gerak dikurangi atau target 0, nilai akhir dilaporkan langsung.
 * Mengembalikan fungsi penghenti animasi (dipakai sebagai cleanup effect).
 */
export function hitungNaik(target: number, onNilai: (n: number) => void, durasi = 600): () => void {
  if (gerakDikurangi() || target === 0) {
    onNilai(target);
    return () => {};
  }
  const obj = { n: 0 };
  const anim = animate(obj, {
    n: target,
    duration: durasi,
    ease: 'outCubic',
    onUpdate: () => onNilai(Math.round(obj.n)),
    onComplete: () => onNilai(target),
  });
  return () => { anim.pause(); };
}

/** Menggambar garis SVG (doodle/sparkline) dari nol. Tidak melakukan apa pun bila gerak dikurangi. */
export function gambarGaris(garis: SVGGeometryElement[], durasi = 500): void {
  if (garis.length === 0 || gerakDikurangi()) return;
  animate(svg.createDrawable(garis), { draw: ['0 0', '0 1'], duration: durasi, ease: 'inOutQuad' });
}
