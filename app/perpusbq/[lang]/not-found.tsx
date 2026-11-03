import Link from 'next/link';

export default function TidakDitemukan() {
  return (
    <section className="p-kartu p-8 text-center space-y-4">
      <h1 className="p-h2">Halaman tidak ditemukan · Page not found</h1>
      <Link href="/" className="p-tombol">Beranda · Home</Link>
    </section>
  );
}
