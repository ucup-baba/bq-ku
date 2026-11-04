import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { ambilAnggota } from '@/lib/db/perpus-pinjaman-repo';
import { PinjamanError } from '@/lib/perpus/pinjaman';
import { pinjamanErrorResponse } from '@/lib/perpus/pinjaman-respon';
import { requireMasuk } from '@/lib/perpus/sesi-anggota';

export async function GET() {
  try {
    const { userId, email, supabase } = await requireMasuk();
    const anggota = await ambilAnggota(supabase, userId);
    if (!anggota) throw new PinjamanError('bukan_anggota');
    return NextResponse.json({ success: true, data: { email, nama: anggota.nama, noWa: anggota.noWa } });
  } catch (e: unknown) {
    const res = authErrorResponse(e) ?? pinjamanErrorResponse(e);
    if (res) return res;
    console.error('Data anggota error:', e);
    return NextResponse.json({ error: 'Gagal memuat akun' }, { status: 500 });
  }
}
