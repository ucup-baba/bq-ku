// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// TTD & stempel resmi tidak boleh tersaji publik (semua isi public/ bisa
// diunduh tanpa login). Aset surat harus berada di assets/surat/.
const ASET = ['ttd.png', 'stempel.webp', 'logo.webp', 'kop-arab.png', 'doa-arab.png'];

describe('aset surat tidak berada di public/', () => {
  it.each(ASET)('%s ada di assets/surat dan tidak ada di public/', (nama) => {
    expect(fs.existsSync(path.join(process.cwd(), 'assets', 'surat', nama))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'public', 'brand', nama))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'public', nama))).toBe(false);
  });
});
