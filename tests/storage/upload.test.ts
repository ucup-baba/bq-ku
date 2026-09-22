import { describe, it, expect, vi } from 'vitest';
import { uploadToBucket } from '@/lib/storage/upload';

const mkClient = (uploadErr: any = null) => ({
  storage: { from: () => ({
    upload: vi.fn().mockResolvedValue({ error: uploadErr }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [{ path: 'a/b.pdf', signedUrl: 'https://x/sign/a/b.pdf?token=1' }], error: null }),
  }) },
}) as any;

describe('uploadToBucket', () => {
  it('mengembalikan path & signed URL', async () => {
    const r = await uploadToBucket(mkClient(), 'a/b.pdf', Buffer.from('x'), 'application/pdf');
    expect(r).toEqual({ storagePath: 'a/b.pdf', fileUrl: 'https://x/sign/a/b.pdf?token=1' });
  });
  it('melempar jika upload gagal', async () => {
    await expect(uploadToBucket(mkClient({ message: 'boom' }), 'a', Buffer.from('x'), 'text/plain')).rejects.toThrow(/boom/);
  });
});
