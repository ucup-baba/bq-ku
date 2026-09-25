// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buatToken, hashToken, buatPin, hashPin, cocokPin, tandaiSesi, bacaSesi, samarkanIp, ringkasPerangkat } from '@/lib/bagikan/keamanan';

describe('token', () => {
  it('acak 32 byte base64url, hash sha256 hex stabil', () => {
    const a = buatToken(); const b = buatToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toBe(hashToken(b));
  });
});

describe('PIN', () => {
  it('6 digit; hash bersalt; cocok hanya untuk PIN yang benar', async () => {
    const pin = buatPin();
    expect(pin).toMatch(/^\d{6}$/);
    const h1 = await hashPin(pin); const h2 = await hashPin(pin);
    expect(h1).not.toBe(h2);
    expect(await cocokPin(pin, h1)).toBe(true);
    expect(await cocokPin(pin === '000000' ? '111111' : '000000', h1)).toBe(false);
    expect(await cocokPin(pin, 'rusak')).toBe(false);
  });
});

describe('sesi tautan', () => {
  const kunci = 'rahasia-uji';
  it('ditandatangani, menolak isi dirusak, kedaluwarsa, atau tautan lain', () => {
    const nilai = tandaiSesi({ tautanId: 't1', sampai: 2_000 }, kunci);
    expect(bacaSesi(nilai, kunci, 't1', 1_000)).toBe(true);
    expect(bacaSesi(nilai, kunci, 't1', 2_001)).toBe(false);
    expect(bacaSesi(nilai, kunci, 't2', 1_000)).toBe(false);
    expect(bacaSesi(nilai, 'kunci-lain', 't1', 1_000)).toBe(false);
    expect(bacaSesi(nilai.replace('t1', 't2'), kunci, 't2', 1_000)).toBe(false);
    expect(bacaSesi(undefined, kunci, 't1', 1_000)).toBe(false);
  });
});

describe('penyamaran', () => {
  it('IP disamarkan', () => {
    expect(samarkanIp('182.1.33.44')).toBe('182.1.xx.xx');
    expect(samarkanIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3:8d3:…');
    expect(samarkanIp('10.0.0.1, 172.16.0.1')).toBe('10.0.xx.xx');
    expect(samarkanIp(null)).toBeNull();
  });
  it('perangkat diringkas', () => {
    expect(ringkasPerangkat('Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')).toBe('Chrome · Android');
    expect(ringkasPerangkat('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')).toBe('Safari · iPhone');
    expect(ringkasPerangkat('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Firefox · Windows');
    expect(ringkasPerangkat('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0')).toBe('Edge · Windows');
    expect(ringkasPerangkat(null)).toBeNull();
  });
});
