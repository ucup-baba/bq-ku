// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = vi.hoisted(() => ({ listBuku: vi.fn(), terapkanAudit: vi.fn() }));
const requireRoom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/perpus-repo', () => repo);
vi.mock('@/lib/auth/session', () => ({ requireRoom: (...a: unknown[]) => requireRoom(...a), authErrorResponse: () => null }));

import { POST as TERAPKAN } from '@/app/api/perpus/audit/route';
import { GET as LABEL } from '@/app/api/perpus/label/route';

const ID = '2f9a2b4e-3c1d-4e5f-8a9b-0c1d2e3f4a5b';
beforeEach(() => {
  Object.values(repo).forEach(f => f.mockReset());
  requireRoom.mockReset().mockResolvedValue({ user: { id: 'u1' }, supabase: {} });
});

describe('audit perpus', () => {
  it('terapkan meneruskan item tervalidasi', async () => {
    repo.terapkanAudit.mockResolvedValue([{ id: ID, nomorPanggil: '899.221 LIY r' }]);
    const res = await TERAPKAN({ json: async () => ({ items: [{ id: ID, kelasDdc: '899.221' }] }) } as never);
    expect(res.status).toBe(200);
    expect(repo.terapkanAudit).toHaveBeenCalledWith({}, [{ id: ID, kelasDdc: '899.221' }]);
  });
  it('label → CSV lampiran', async () => {
    repo.listBuku.mockResolvedValue([{ judul: 'Rasa', nomorPanggil: '899.221 LIY r', nomorPanggilLama: '813 LIY R', eksemplar: 1, statusKode: 'baku' }]);
    const res = await LABEL();
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('label-perpus.csv');
    expect(await res.text()).toBe('Judul,Nomor lama,Nomor baru\r\nRasa,813 LIY R,899.221 LIY r\r\n');
  });
});
