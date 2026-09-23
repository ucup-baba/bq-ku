import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  animate: vi.fn(() => ({ pause: vi.fn() })),
  createDrawable: vi.fn((x: unknown) => x),
}));
vi.mock('animejs', () => ({ animate: m.animate, svg: { createDrawable: m.createDrawable } }));

import { hitungNaik, gambarGaris } from '@/lib/ui/animasi';

const aturGerak = (dikurangi: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dikurangi }) as unknown as typeof window.matchMedia;
};

describe('hitungNaik', () => {
  beforeEach(() => { m.animate.mockClear(); });
  it('langsung melapor nilai akhir bila gerak dikurangi', () => {
    aturGerak(true);
    const onNilai = vi.fn();
    hitungNaik(1500, onNilai);
    expect(onNilai).toHaveBeenCalledOnce();
    expect(onNilai).toHaveBeenCalledWith(1500);
    expect(m.animate).not.toHaveBeenCalled();
  });
  it('target 0 dilaporkan langsung tanpa animasi', () => {
    aturGerak(false);
    const onNilai = vi.fn();
    hitungNaik(0, onNilai);
    expect(onNilai).toHaveBeenCalledWith(0);
    expect(m.animate).not.toHaveBeenCalled();
  });
  it('menganimasikan objek dan membulatkan nilai tiap frame', () => {
    aturGerak(false);
    const onNilai = vi.fn();
    hitungNaik(1500, onNilai, 600);
    expect(m.animate).toHaveBeenCalledOnce();
    const [obj, params] = m.animate.mock.calls[0] as unknown as [{ n: number }, { n: number; duration: number; onUpdate: () => void; onComplete: () => void }];
    expect(params.n).toBe(1500);
    expect(params.duration).toBe(600);
    obj.n = 749.6;
    params.onUpdate();
    expect(onNilai).toHaveBeenLastCalledWith(750);
    params.onComplete();
    expect(onNilai).toHaveBeenLastCalledWith(1500);
  });
});

describe('gambarGaris', () => {
  beforeEach(() => { m.animate.mockClear(); });
  it('tidak menganimasikan bila gerak dikurangi', () => {
    aturGerak(true);
    gambarGaris([{} as SVGGeometryElement]);
    expect(m.animate).not.toHaveBeenCalled();
  });
  it('menggambar garis dari 0 ke penuh', () => {
    aturGerak(false);
    gambarGaris([{} as SVGGeometryElement]);
    expect(m.animate).toHaveBeenCalledOnce();
    const params = (m.animate.mock.calls[0] as unknown as [unknown, { draw: string[] }])[1];
    expect(params.draw).toEqual(['0 0', '0 1']);
  });
});
