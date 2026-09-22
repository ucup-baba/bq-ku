import { describe, it, expect } from 'vitest';
import { pesanUcapan, waLink, waWebLink } from '@/lib/surat/pesan';

describe('pesan WhatsApp', () => {
  it('menyebut nama donatur dan nomor surat', () => {
    const t = pesanUcapan('Bapak Pradana', '271/PBQ/IX/2026');
    expect(t).toContain('Bapak Pradana');
    expect(t).toContain('271/PBQ/IX/2026');
    expect(t).toMatch(/terima kasih/i);
  });
  it('membuat tautan wa dengan nomor 62', () => {
    expect(waLink('628123456789', 'halo')).toBe('https://wa.me/628123456789?text=halo');
  });
  it('mengabaikan nomor kosong', () => {
    expect(waLink(null, 'halo')).toBeNull();
  });
  it('membuat tautan WhatsApp Web dengan nomor dan teks', () => {
    expect(waWebLink('628123', 'halo dunia')).toBe('https://web.whatsapp.com/send?phone=628123&text=halo%20dunia');
  });
  it('waWebLink mengabaikan nomor kosong', () => {
    expect(waWebLink(null, 'halo')).toBeNull();
  });
  it('pesanUcapan aman dipakai sebagai teks waWebLink (baris baru & apostrof ter-encode)', () => {
    const teks = pesanUcapan('Bapak Pradana', '271/PBQ/IX/2026');
    const link = waWebLink('628123456789', teks)!;
    expect(link).not.toBeNull();
    expect(link).not.toContain('\n');
    expect(link).not.toContain("'");
    expect(link).toContain('%0A');
    expect(link).toContain('%27');
    const query = link.split('&text=')[1];
    expect(decodeURIComponent(query)).toBe(teks);
  });
});
