import { describe, it, expect, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Kalam: () => ({ className: 'font-kalam-mock' }),
  Patrick_Hand: () => ({ className: 'font-patrick-mock' }),
}));

import { LABEL_BAGIAN } from '@/components/donatur/FormSurat';

describe('Buat Surat HP', () => {
  it('tiga bagian geser dengan label singkat', () => {
    expect(LABEL_BAGIAN.map(b => b.label)).toEqual(['Donatur', 'Donasi', 'Surat']);
    expect(LABEL_BAGIAN.map(b => b.value)).toEqual(['0', '1', '2']);
  });
});
