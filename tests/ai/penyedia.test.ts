import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { panggilGemini } from '@/lib/ai/penyedia/gemini';
import { panggilOpenai } from '@/lib/ai/penyedia/openai';

const berkasGambar = { base64: 'QUJD', mimeType: 'image/jpeg' };
const berkasPdf = { base64: 'JVBE', mimeType: 'application/pdf' };
const jawab = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => { process.env.GEMINI_API_KEY = 'g-kunci'; process.env.OPENAI_API_KEY = 'o-kunci'; });
afterEach(() => { vi.unstubAllGlobals(); });

describe('panggilGemini', () => {
  it('mengirim gambar + temperature 0 dan membaca teks & token', async () => {
    const f = jawab({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }], usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 80 } });
    vi.stubGlobal('fetch', f);
    const h = await panggilGemini('gemini-flash-lite-latest', 'baca JSON', berkasGambar, 10_000);
    expect(h).toEqual({ teks: '{"a":1}', tokenMasuk: 1200, tokenKeluar: 80 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('models/gemini-flash-lite-latest:generateContent?key=g-kunci');
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' });
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', temperature: 0 });
  });
  it('HTTP 503 → melempar galat berisi status', async () => {
    vi.stubGlobal('fetch', jawab({ error: { message: 'high demand' } }, 503));
    await expect(panggilGemini('gemini-flash-lite-latest', 'p', berkasGambar, 10_000)).rejects.toThrow(/503/);
  });
  it('tanpa kunci → melempar', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(panggilGemini('gemini-flash-lite-latest', 'p', berkasGambar, 10_000)).rejects.toThrow(/GEMINI_API_KEY/);
  });
});

describe('panggilOpenai', () => {
  it('gambar → input_image; GPT-5 tanpa temperature; membaca output_text & usage', async () => {
    const f = jawab({ output_text: '{"b":2}', usage: { input_tokens: 900, output_tokens: 40 } });
    vi.stubGlobal('fetch', f);
    const h = await panggilOpenai('gpt-5.4-mini', 'baca JSON', berkasGambar, 10_000);
    expect(h).toEqual({ teks: '{"b":2}', tokenMasuk: 900, tokenKeluar: 40 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer o-kunci');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('gpt-5.4-mini');
    expect(body.input[0].content[1]).toEqual({ type: 'input_image', image_url: 'data:image/jpeg;base64,QUJD', detail: 'high' });
    expect(body.text).toEqual({ format: { type: 'json_object' } });
    expect(body.temperature).toBeUndefined();
  });
  it('PDF → input_file; GPT-4.1 memakai temperature 0', async () => {
    const f = jawab({ output: [{ content: [{ type: 'output_text', text: '{}' }] }], usage: { input_tokens: 1, output_tokens: 1 } });
    vi.stubGlobal('fetch', f);
    await panggilOpenai('gpt-4.1-mini', 'p JSON', berkasPdf, 10_000);
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.input[0].content[1]).toEqual({ type: 'input_file', filename: 'berkas.pdf', file_data: 'data:application/pdf;base64,JVBE' });
    expect(body.temperature).toBe(0);
  });
  it('HTTP 429 → melempar', async () => {
    vi.stubGlobal('fetch', jawab({ error: { message: 'quota' } }, 429));
    await expect(panggilOpenai('gpt-5.4-mini', 'p', berkasGambar, 10_000)).rejects.toThrow(/429/);
  });
});
