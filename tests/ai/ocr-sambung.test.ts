import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baca = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ai/baca', () => ({ bacaDokumenAi: baca }));

import { processGeminiVisionOcr } from '@/lib/ocr/gemini';
import { classifyAndExtractDocument } from '@/lib/ocr/gemini-batch';
import { AiBatasError } from '@/lib/ai/batas';

const konteks = { fitur: 'ocr_tunggal' as const, penggunaId: 'u1' };
const berkas = path.join(os.tmpdir(), 'uji-ocr-sambung.png');
beforeEach(() => { baca.mockReset(); fs.writeFileSync(berkas, Buffer.from('png')); });

describe('OCR memakai bacaDokumenAi', () => {
  it('pindai tunggal meneruskan prompt, berkas, konteks & mengurai hasil', async () => {
    baca.mockResolvedValue({ teks: JSON.stringify({ namaLengkap: 'CHOTIDJAH ALLAYDRUS', nik: '3310064702130002' }), penyedia: 'openai', model: 'gpt-5.4-mini' });
    const h = await processGeminiVisionOcr(berkas, 'KARTU_KELUARGA', konteks);
    expect(h?.data.nik).toBe('3310064702130002');
    const arg = baca.mock.calls[0][0];
    expect(arg.berkas).toEqual({ base64: Buffer.from('png').toString('base64'), mimeType: 'image/png' });
    expect(arg.konteks).toEqual(konteks);
    expect(arg.prompt).toContain('JSON');
  });
  it('semua penyedia gagal → null (jalur OCR lokal tetap bisa dipakai)', async () => {
    baca.mockRejectedValue(new Error('Semua penyedia AI gagal'));
    expect(await processGeminiVisionOcr(berkas, 'KARTU_KELUARGA', konteks)).toBeNull();
  });
  it('batas tercapai → AiBatasError dilempar ulang, tidak ditelan', async () => {
    baca.mockRejectedValue(new AiBatasError('harian'));
    await expect(processGeminiVisionOcr(berkas, 'KARTU_KELUARGA', konteks)).rejects.toBeInstanceOf(AiBatasError);
    await expect(classifyAndExtractDocument(Buffer.from('x'), 'image/png', { ...konteks, fitur: 'ocr_massal' })).rejects.toBeInstanceOf(AiBatasError);
  });
  it('pindai massal meneruskan anggaran waktu', async () => {
    baca.mockResolvedValue({ teks: JSON.stringify({ kategori: 'KIP_PIP', namaLengkap: 'X' }), penyedia: 'gemini', model: 'gemini-flash-lite-latest' });
    const h = await classifyAndExtractDocument(Buffer.from('x'), 'image/png', { ...konteks, fitur: 'ocr_massal' }, 40_000);
    expect(h?.kategori).toBe('KIP_PIP');
    expect(baca.mock.calls[0][0]).toMatchObject({ batasTotalMs: 40_000, konteks: { fitur: 'ocr_massal' } });
  });
});
