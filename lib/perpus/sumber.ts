import 'server-only';
import { uraiCsv, uraiBuku, uraiInfaq, uraiPengadaan, susunRencana, type RencanaImpor } from '@/lib/perpus/impor';

/** Spreadsheet "Daftar Buku" (dibagikan "siapa pun dengan tautan"); gid = id tab. */
const SPREADSHEET = '1q4vDyNGHBKq8ZwU4s4-SxZrWToMPL7sB26Jwk9HQe5U';
const GID = { buku: '1647509154', infaq: '1492384701', pengadaan: '1507527752' } as const;

async function ambilCsv(gid: string): Promise<string[][]> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET}/export?format=csv&gid=${gid}`, {
    cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Google Sheets HTTP ${res.status} (gid ${gid}) — pastikan berbagi "siapa pun dengan tautan"`);
  return uraiCsv(await res.text());
}

export async function ambilRencanaDariSheets(): Promise<RencanaImpor> {
  const [buku, infaq, pengadaan] = await Promise.all([ambilCsv(GID.buku), ambilCsv(GID.infaq), ambilCsv(GID.pengadaan)]);
  return susunRencana({ buku: uraiBuku(buku), infaq: uraiInfaq(infaq), pengadaan: uraiPengadaan(pengadaan) });
}
