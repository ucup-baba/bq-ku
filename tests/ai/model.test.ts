import { describe, it, expect } from 'vitest';
import { skemaSetelanAi, SETELAN_AI_BAWAAN, infoModel, MODEL_AI } from '@/lib/ai/model';

describe('skemaSetelanAi', () => {
  it('menerima setelan bawaan', () => {
    expect(skemaSetelanAi.safeParse(SETELAN_AI_BAWAAN).success).toBe(true);
  });
  it('menerima tanpa cadangan', () => {
    expect(skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, cadangan: null }).success).toBe(true);
  });
  it('menolak model di luar daftar penyedianya', () => {
    const s = { ...SETELAN_AI_BAWAAN, utama: { penyedia: 'openai', model: 'gemini-flash-latest' } };
    expect(skemaSetelanAi.safeParse(s).success).toBe(false);
  });
  it('menolak angka negatif', () => {
    expect(skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, batasHarian: -1 }).success).toBe(false);
    expect(skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, harga: { 'gpt-5.4-mini': { masukPerJuta: -5, keluarPerJuta: 0 } } }).success).toBe(false);
  });
});

describe('infoModel', () => {
  it('model GPT-5 tidak menerima temperature, GPT-4.1 & Gemini menerima', () => {
    expect(infoModel({ penyedia: 'openai', model: 'gpt-5.4-mini' })?.dukungTemperature).toBe(false);
    expect(infoModel({ penyedia: 'openai', model: 'gpt-4.1-mini' })?.dukungTemperature).toBe(true);
    expect(MODEL_AI.gemini.every(m => m.dukungTemperature)).toBe(true);
  });
});
