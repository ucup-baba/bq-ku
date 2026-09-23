import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock('@/components/theme/ThemeProvider', () => ({ useTheme: () => ({ genderTheme: 'IKHWAN', setGenderTheme: vi.fn(), theme: 'light' }) }));
vi.mock('@/components/forms/DocumentUploadBox', () => ({ DocumentUploadBox: () => <div data-mock="upload" /> }));
vi.mock('@/components/modals/DocumentGuardModal', () => ({ DocumentGuardModal: () => null }));

import { SantriForm } from '@/components/forms/SantriForm';

describe('Wizard santri', () => {
  it('pendaftaran baru: mulai di langkah 1, langkah depan terkunci, tombol Lanjut', () => {
    const h = renderToStaticMarkup(<SantriForm />);
    expect(h).toMatch(/aria-current="step" aria-label="Langkah 1: Nama &amp; berkas"/);
    expect(h).toMatch(/disabled="" aria-disabled="true" aria-label="Langkah 3: Orang tua &amp; domisili"/);
    expect(h).toContain('Lanjut: ');
    expect(h).not.toContain('Simpan data santri');
    expect(h).toContain('data-mock="upload"');
    expect(h).not.toMatch(/text-\[1[01]px\]/);
  });
  it('mode edit: semua langkah bisa dibuka', () => {
    const h = renderToStaticMarkup(<SantriForm isEditing initialData={{ id: 's1', namaLengkap: 'Ahmad' }} />);
    expect(h).not.toMatch(/aria-disabled="true" aria-label="Langkah 4/);
    expect(h).toContain('Edit data santri');
    expect(h).toContain('href="/santri/s1"');
  });
});
