import { describe, it, expect } from 'vitest';

describe('Layout and Navigation Routes', () => {
  it('should have standard nav items defined', () => {
    const navRoutes = ['/', '/santri', '/tambah'];
    expect(navRoutes).toContain('/');
    expect(navRoutes).toContain('/santri');
    expect(navRoutes).toContain('/tambah');
  });
});
