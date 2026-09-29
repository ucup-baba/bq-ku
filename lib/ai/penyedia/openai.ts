import { infoModel } from '../model';
import { galatHttp, type BerkasAi, type HasilPanggil } from './tipe';

/** Responses API: gambar sebagai input_image, PDF sebagai input_file. Prompt wajib memuat kata "JSON" (json_object). */
export async function panggilOpenai(model: string, prompt: string, berkas: BerkasAi, batasMs: number): Promise<HasilPanggil> {
  const kunci = process.env.OPENAI_API_KEY;
  if (!kunci) throw new Error('OPENAI_API_KEY belum dipasang');
  const dataUrl = `data:${berkas.mimeType};base64,${berkas.base64}`;
  const lampiran = berkas.mimeType === 'application/pdf'
    ? { type: 'input_file', filename: 'berkas.pdf', file_data: dataUrl }
    : { type: 'input_image', image_url: dataUrl, detail: 'high' };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(batasMs),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kunci}` },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, lampiran] }],
      text: { format: { type: 'json_object' } },
      ...(infoModel({ penyedia: 'openai', model })?.dukungTemperature ? { temperature: 0 } : {}),
    }),
  });
  if (!res.ok) throw await galatHttp('OpenAI', res);
  const d = await res.json();
  const teks: string = d.output_text
    ?? (d.output ?? []).flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? [])
      .filter((c: { type: string }) => c.type === 'output_text').map((c: { text?: string }) => c.text ?? '').join('');
  if (!teks) throw new Error('OpenAI: jawaban kosong');
  return { teks, tokenMasuk: d.usage?.input_tokens ?? 0, tokenKeluar: d.usage?.output_tokens ?? 0 };
}
