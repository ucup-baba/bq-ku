import { galatHttp, type BerkasAi, type HasilPanggil } from './tipe';

export async function panggilGemini(model: string, prompt: string, berkas: BerkasAi, batasMs: number): Promise<HasilPanggil> {
  const kunci = process.env.GEMINI_API_KEY;
  if (!kunci) throw new Error('GEMINI_API_KEY belum dipasang');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${kunci}`, {
    method: 'POST',
    signal: AbortSignal.timeout(batasMs),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: berkas.mimeType, data: berkas.base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
  if (!res.ok) throw await galatHttp('Gemini', res);
  const d = await res.json();
  const teks = (d.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  if (!teks) throw new Error('Gemini: jawaban kosong');
  return { teks, tokenMasuk: d.usageMetadata?.promptTokenCount ?? 0, tokenKeluar: d.usageMetadata?.candidatesTokenCount ?? 0 };
}
