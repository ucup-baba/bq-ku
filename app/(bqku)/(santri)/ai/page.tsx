import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { canManageUsers } from '@/lib/auth/roles';
import { bacaSetelanAi, statusKunci } from '@/lib/ai/setelan';
import { ambilRingkasanPemakaian } from '@/lib/ai/pemakaian';
import { HalamanAi } from '@/components/ai/HalamanAi';

export const metadata = { title: 'AI & OCR — BQ-ku' };
export const revalidate = 0;

export default async function AiPage() {
  const user = await getSessionUser();
  if (!user || !canManageUsers(user.roles)) redirect('/');
  const [setelan, ringkasan] = await Promise.all([bacaSetelanAi(), ambilRingkasanPemakaian().catch(() => ({
    pindaiHariIni: 0, gagalHariIni: 0, biayaBulanIni: 0, tokenBulanIni: 0, cadanganBulanIni: 0, terakhir: [],
  }))]);
  return <HalamanAi awal={{ setelan, kunci: statusKunci(), ringkasan }} />;
}
