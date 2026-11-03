import type { Metadata } from 'next';

export const metadata: Metadata = { title: '404' };

/** Dipakai kedua situs untuk rute tak dikenal, jadi teksnya netral & tanpa CSS aplikasi. */
export default function GlobalNotFound() {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, textAlign: 'center' }}>
        <main>
          <h1>404</h1>
          <p>Halaman tidak ditemukan · Page not found</p>
          <a href="/">Beranda · Home</a>
        </main>
      </body>
    </html>
  );
}
