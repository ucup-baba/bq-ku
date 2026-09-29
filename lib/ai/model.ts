import { z } from 'zod';

export type Penyedia = 'openai' | 'gemini';
export type PilihanModel = { penyedia: Penyedia; model: string };
export type HargaModel = { masukPerJuta: number; keluarPerJuta: number };
export type SetelanAi = {
  utama: PilihanModel;
  cadangan: PilihanModel | null;
  batasHarian: number;
  plafonBulananRp: number;
  /** Rp per 1 juta token, per id model; diisi Superadmin dari halaman harga resmi. */
  harga: Record<string, HargaModel>;
};

export const LABEL_PENYEDIA: Record<Penyedia, string> = { openai: 'OpenAI', gemini: 'Gemini' };

/** Model yang boleh dipilih. GPT-5.x adalah model bernalar: tidak menerima `temperature`. */
export const MODEL_AI: Record<Penyedia, { id: string; label: string; dukungTemperature: boolean }[]> = {
  openai: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', dukungTemperature: false },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', dukungTemperature: true },
    { id: 'gpt-5.4', label: 'GPT-5.4', dukungTemperature: false },
    { id: 'gpt-4.1', label: 'GPT-4.1', dukungTemperature: true },
  ],
  gemini: [
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite', dukungTemperature: true },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', dukungTemperature: true },
    { id: 'gemini-flash-latest', label: 'Gemini Flash', dukungTemperature: true },
  ],
};

export const SETELAN_AI_BAWAAN: SetelanAi = {
  utama: { penyedia: 'openai', model: 'gpt-5.4-mini' },
  cadangan: { penyedia: 'gemini', model: 'gemini-flash-lite-latest' },
  batasHarian: 200,
  plafonBulananRp: 50000,
  harga: {},
};

export function infoModel(p: PilihanModel) {
  return MODEL_AI[p.penyedia]?.find(m => m.id === p.model) ?? null;
}

const skemaPilihan = z.object({ penyedia: z.enum(['openai', 'gemini']), model: z.string() })
  .refine(p => infoModel(p) !== null, { message: 'Model tidak dikenal untuk penyedia ini', path: ['model'] });

export const skemaSetelanAi = z.object({
  utama: skemaPilihan,
  cadangan: skemaPilihan.nullable(),
  batasHarian: z.number().int().min(0).max(100_000),
  plafonBulananRp: z.number().min(0).max(100_000_000),
  harga: z.record(z.string(), z.object({ masukPerJuta: z.number().min(0), keluarPerJuta: z.number().min(0) })),
});
