import { NextRequest, NextResponse } from 'next/server';
import { listSantri, createSantri, SantriFilter, SantriInput } from '@/lib/db/santri-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const jenisKelamin = (searchParams.get('jenisKelamin') as 'IKHWAN' | 'AKHWAT') || undefined;
    const jenjang = (searchParams.get('jenjang') as 'SMP' | 'SMA' | 'SMK' | 'ALUMNI') || undefined;

    const filter: SantriFilter = {};
    if (q) filter.q = q;
    if (jenisKelamin) filter.jenisKelamin = jenisKelamin;
    if (jenjang) filter.jenjang = jenjang;

    const santriList = listSantri(filter);
    return NextResponse.json({ success: true, data: santriList });
  } catch (error: any) {
    console.error('List santri error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data santri: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.namaLengkap || !body.nik || !body.tempatLahir || !body.tanggalLahir || !body.jenisKelamin || !body.jenjang || !body.kelas || !body.sekolahSekarang) {
      return NextResponse.json(
        { error: 'Field wajib belum lengkap (nama, nik, TTL, jenis kelamin, jenjang, kelas, sekolah sekarang)' },
        { status: 400 }
      );
    }

    const input: SantriInput = {
      namaLengkap: body.namaLengkap,
      namaPanggilan: body.namaPanggilan || null,
      nik: body.nik,
      noKk: body.noKk || null,
      nisn: body.nisn || null,
      tempatLahir: body.tempatLahir,
      tanggalLahir: body.tanggalLahir,
      jenisKelamin: body.jenisKelamin,
      jenjang: body.jenjang,
      kelas: body.kelas,
      sekolahSekarang: body.sekolahSekarang,
      asalSekolahSebelumnya: body.asalSekolahSebelumnya || null,
      namaAyah: body.namaAyah || null,
      namaIbu: body.namaIbu || null,
      kontakWali: body.kontakWali || null,
      pekerjaanOrtu: body.pekerjaanOrtu || null,
      alamat: body.alamat || null,
      ringkasanTentang: body.ringkasanTentang || null,
      riwayatTahfidz: body.riwayatTahfidz || null,
      keahlian: body.keahlian ? (typeof body.keahlian === 'string' ? body.keahlian : JSON.stringify(body.keahlian)) : null,
      fotoFormalUrl: body.fotoFormalUrl || null,
      fotoProfilUrl: body.fotoProfilUrl || null,
    };

    const newSantri = createSantri(input);
    return NextResponse.json({ success: true, data: newSantri }, { status: 201 });
  } catch (error: any) {
    console.error('Create santri error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data santri: ' + error.message }, { status: 500 });
  }
}
