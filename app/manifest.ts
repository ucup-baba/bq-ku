import type { MetadataRoute } from 'next';

/** Manifest PWA: aplikasi bisa dipasang ke layar utama HP. Warna mengikuti latar logo BQ. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BQ-ku — Baitul Qowwam',
    short_name: 'BQ-ku',
    description: 'Administrasi santri & donatur Panti Asuhan Baitul Qowwam',
    lang: 'id',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F231F',
    theme_color: '#0F231F',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
