import { NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { roomsFor } from '@/lib/auth/rooms';
import { canManageUsers } from '@/lib/auth/roles';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { susunNotifikasi } from '@/lib/notifikasi/jenis';
import { bukanPeminjam } from '@/lib/perpus/pinjaman';

/** Notifikasi dalam aplikasi, dihitung langsung dari data (tanpa tabel notifikasi). */
export async function GET() {
  try {
    const { user, supabase } = await requireUser();
    const hitung: Parameters<typeof susunNotifikasi>[0] = {};
    const tugas: Promise<void>[] = [];

    if (roomsFor(user.roles).includes('donatur')) {
      tugas.push((async () => {
        const [surat, tanpaWa] = await Promise.all([
          supabase.from('surat').select('id', { head: true, count: 'exact' }).eq('terkirimWa', false),
          supabase.from('donatur').select('id', { head: true, count: 'exact' }).is('noWa', null),
        ]);
        if (surat.error) throw surat.error;
        if (tanpaWa.error) throw tanpaWa.error;
        hitung.suratBelumTerkirim = surat.count ?? 0;
        hitung.donaturTanpaWa = tanpaWa.count ?? 0;
      })());
    }
    if (roomsFor(user.roles).includes('lembaga')) {
      tugas.push((async () => {
        // Berlaku sampai ≤ 90 hari lagi (termasuk yang sudah lewat). Tabel belum ada (migrasi 0011) → abaikan.
        const d = new Date(Date.now() + 90 * 86_400_000);
        const batas = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const { count, error } = await supabase.from('berkas_lembaga').select('id', { head: true, count: 'exact' })
          .not('berlakuSampai', 'is', null).lte('berlakuSampai', batas);
        if (!error) hitung.berkasLembaga = count ?? 0;
      })());
    }
    if (roomsFor(user.roles).includes('perpus')) {
      tugas.push((async () => {
        const hitungStatus = (status: string) =>
          supabase.from('perpus_pinjaman').select('id', { head: true, count: 'exact' }).eq('status', status);
        const [baru, klaim] = await Promise.all([hitungStatus('diajukan'), hitungStatus('menunggu_verifikasi')]);
        // Tabel belum ada (migrasi 0015) → abaikan.
        if (!baru.error) hitung.perpusPengajuan = baru.count ?? 0;
        if (!klaim.error) hitung.perpusKlaim = klaim.count ?? 0;
      })());
    }
    if (canManageUsers(user.roles)) {
      tugas.push((async () => {
        const admin = createAdminSupabase();
        const [menunggu, anggota] = await Promise.all([
          admin.from('profiles').select('id, aktif').eq('aktif', false),
          admin.from('perpus_anggota').select('userId'),
        ]);
        if (menunggu.error) throw menunggu.error;
        // Peminjam perpus memang tidak perlu diaktifkan di bq-ku.
        const peminjam = new Set((anggota.data ?? []).map(a => a.userId as string));
        hitung.akunMenunggu = bukanPeminjam(menunggu.data ?? [], peminjam).length;
      })());
    }
    await Promise.all(tugas);
    return NextResponse.json({ success: true, data: susunNotifikasi(hitung) });
  } catch (e: any) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    console.error('Notifikasi error:', e);
    return NextResponse.json({ error: 'Gagal memuat notifikasi' }, { status: 500 });
  }
}
