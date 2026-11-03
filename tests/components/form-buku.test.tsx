import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormBuku } from '@/components/perpus/FormBuku';

describe('FormBuku', () => {
  const doc = new DOMParser().parseFromString(renderToStaticMarkup(<FormBuku onSimpan={() => {}} />), 'text/html');
  it('setiap isian berada di dalam label', () => {
    for (const el of doc.querySelectorAll('input, select')) expect(el.closest('label')).toBeTruthy();
  });
  it('pratinjau nomor panggil diumumkan', () => {
    expect(doc.querySelectorAll('[role="status"]')).toHaveLength(1);
  });
});
