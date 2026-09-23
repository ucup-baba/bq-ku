import { describe, it, expect, beforeEach } from 'vitest';
import { auditHalaman } from '../../scripts/audit-ui.mjs';

const opsi = { terlihat: () => true, lebarHp: true };

describe('auditHalaman', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('menemukan tautan ganda di luar daftar data', () => {
    document.body.innerHTML = `
      <a href="/donatur/surat/baru">Buat</a><a href="/donatur/surat/baru">Buat lagi</a>
      <ul data-audit-daftar><li><a href="/donatur/daftar/1">A</a></li><li><a href="/donatur/daftar/1">A</a></li></ul>`;
    const r = auditHalaman(document, window, opsi);
    expect(r.tautanGanda).toEqual(['/donatur/surat/baru ×2']);
  });

  it('menemukan ikon + teks "+"', () => {
    document.body.innerHTML = '<button><svg></svg>+ Surat</button><button><svg></svg>Surat</button>';
    expect(auditHalaman(document, window, opsi).ikonPlusGanda).toEqual(['+ Surat']);
  });

  it('menemukan teks < 12px kecuali di [data-audit-abaikan]', () => {
    document.body.innerHTML = `
      <p style="font-size: 10px">kecil</p>
      <p style="font-size: 12px">cukup</p>
      <div data-audit-abaikan><p style="font-size: 9px">kertas</p></div>`;
    expect(auditHalaman(document, window, opsi).teksKecil).toEqual(['10px: kecil']);
  });

  it('cek teks kecil hanya berlaku di lebar HP', () => {
    document.body.innerHTML = '<p style="font-size: 10px">kecil</p>';
    expect(auditHalaman(document, window, { ...opsi, lebarHp: false }).teksKecil).toEqual([]);
  });
});
