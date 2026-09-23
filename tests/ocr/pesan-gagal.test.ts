import { describe, it, expect } from 'vitest';
import { pesanGagalPindai } from '@/lib/ocr/pesan-gagal';

describe('pesanGagalPindai', () => {
  it('timeout Vercel → pesan ramah', () => {
    expect(pesanGagalPindai(504, 'An error occurred with your deployment\n\nFUNCTION_INVOCATION_TIMEOUT')).toContain('Waktu habis');
  });
  it('galat JSON dari server dipakai apa adanya', () => {
    expect(pesanGagalPindai(400, '{"error":"Tidak ada berkas"}')).toBe('Tidak ada berkas');
  });
  it('lainnya → pesan umum berstatus', () => {
    expect(pesanGagalPindai(500, '<html>')).toBe('Gagal memindai berkas (status 500).');
  });
});
