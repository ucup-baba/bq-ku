import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { SETELAN_AI_BAWAAN, skemaSetelanAi, type Penyedia, type SetelanAi } from './model';

/** Dibaca dengan kunci admin: Admin Santri yang memindai tidak punya hak baca `pengaturan`. */
export async function bacaSetelanAi(): Promise<SetelanAi> {
  try {
    const { data } = await createAdminSupabase().from('pengaturan').select('nilai').eq('kunci', 'ai').maybeSingle();
    const hasil = skemaSetelanAi.safeParse({ ...SETELAN_AI_BAWAAN, ...((data as { nilai?: object } | null)?.nilai ?? {}) });
    return hasil.success ? hasil.data : SETELAN_AI_BAWAAN;
  } catch {
    return SETELAN_AI_BAWAAN;
  }
}

/** Disimpan dengan klien ber-RLS milik Superadmin (kebijakan "pengaturan: ubah"). */
export async function simpanSetelanAi(client: SupabaseClient, s: SetelanAi, userId: string): Promise<void> {
  const { data, error } = await client.from('pengaturan')
    .update({ nilai: s, updatedAt: new Date().toISOString(), updatedBy: userId }).eq('kunci', 'ai').select('kunci');
  if (error) throw new Error(`Gagal menyimpan setelan AI: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Setelan AI belum tersedia — jalankan migrasi 0012 di Supabase.');
}

export function statusKunci(): Record<Penyedia, boolean> {
  return { openai: !!process.env.OPENAI_API_KEY, gemini: !!process.env.GEMINI_API_KEY };
}
