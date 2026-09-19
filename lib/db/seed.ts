import { getDb } from './index';
import { createSantri, saveDocument } from './santri-repo';

export function runSeed() {
  const db = getDb();

  // Check if data already exists
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM santri').get() as { count: number };
  if (existingCount.count > 0) {
    console.log(`Database already has ${existingCount.count} santri records. Skipping seed.`);
    return;
  }

  console.log('Seeding initial realistic santri data...');

  // Santri 1: Ikhwan SMP (Lengkap)
  const s1 = createSantri({
    namaLengkap: 'Muhammad Haidar Ali',
    namaPanggilan: 'Haidar',
    nik: '3304122506080001',
    noKk: '3304120101150002',
    nisn: '0087654321',
    tempatLahir: 'Sleman',
    tanggalLahir: '2008-06-25',
    jenisKelamin: 'IKHWAN',
    jenjang: 'SMP',
    kelas: '8A',
    sekolahSekarang: 'SMP IT Baitul Qowwam',
    asalSekolahSebelumnya: 'SD Negeri 1 Sleman',
    namaAyah: 'Budi Santoso',
    namaIbu: 'Siti Rahmawati',
    kontakWali: '081234567890',
    pekerjaanOrtu: 'Wiraswasta',
    alamat: 'Jl. Kaliurang KM 14, Umbulmartani, Ngemplak, Sleman',
    ringkasanTentang: 'Santri yang giat dalam menghafal Al-Qur\'an serta memiliki minat besar di bidang multimedia, desain grafis, dan robotika.',
    riwayatTahfidz: '5 Juz Mutqin (Juz 26 - 30)',
    keahlian: JSON.stringify(['Desain Grafis', 'Pidato Bahasa Arab', 'Robotik Dasar', 'Pencak Silat']),
    fotoFormalUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    fotoProfilUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
  });

  saveDocument({
    santriId: s1.id,
    kategori: 'KARTU_KELUARGA',
    nomorDokumen: '3304120101150002',
    fileUrl: '/uploads/sample_kk.jpg',
    statusVerifikasi: 'VERIFIED',
    catatanVerifikasi: 'Data KK cocok dengan Dukcapil',
  });

  saveDocument({
    santriId: s1.id,
    kategori: 'KTP_ORTU',
    nomorDokumen: '3304122506080001',
    fileUrl: '/uploads/sample_ktp.jpg',
    statusVerifikasi: 'VERIFIED',
    catatanVerifikasi: 'KTP Ayah terverifikasi',
  });

  saveDocument({
    santriId: s1.id,
    kategori: 'AKTA_KELAHIRAN',
    nomorDokumen: 'AKTA-2008-0625',
    fileUrl: '/uploads/sample_akta.jpg',
    statusVerifikasi: 'VERIFIED',
  });

  saveDocument({
    santriId: s1.id,
    kategori: 'SKL_IJAZAH',
    nomorDokumen: 'SKL-SD-2022-098',
    fileUrl: '/uploads/sample_skl.jpg',
    statusVerifikasi: 'VERIFIED',
  });

  // Santri 2: Akhwat SMA (Penerima KIP)
  const s2 = createSantri({
    namaLengkap: 'Fatimah Az-Zahra',
    namaPanggilan: 'Zahra',
    nik: '3304126008060002',
    noKk: '3304120202160003',
    nisn: '0065432109',
    tempatLahir: 'Yogyakarta',
    tanggalLahir: '2006-08-20',
    jenisKelamin: 'AKHWAT',
    jenjang: 'SMA',
    kelas: '11 IPA',
    sekolahSekarang: 'SMA IT Baitul Qowwam',
    asalSekolahSebelumnya: 'MTs Negeri 1 Sleman',
    namaAyah: 'Ahmad Fauzi',
    namaIbu: 'Nur Laila',
    kontakWali: '085678901234',
    pekerjaanOrtu: 'Petani / Buruh',
    alamat: 'Godean, Sleman, D.I. Yogyakarta',
    ringkasanTentang: 'Bercita-cita menjadi dokter muslimah yang hafizhah. Aktif dalam kegiatan halaqah tahsin dan olimpiade biologi.',
    riwayatTahfidz: '10 Juz Mutqin (Juz 1 - 10)',
    keahlian: JSON.stringify(['Kaligrafi Islami', 'Bahasa Inggris', 'KIR Biologi', 'Pramuka']),
    fotoFormalUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    fotoProfilUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  });

  saveDocument({
    santriId: s2.id,
    kategori: 'KARTU_KELUARGA',
    fileUrl: '/uploads/sample_kk2.jpg',
    statusVerifikasi: 'VERIFIED',
  });

  saveDocument({
    santriId: s2.id,
    kategori: 'KTP_ORTU',
    fileUrl: '/uploads/sample_ktp2.jpg',
    statusVerifikasi: 'VERIFIED',
  });

  saveDocument({
    santriId: s2.id,
    kategori: 'AKTA_KELAHIRAN',
    fileUrl: '/uploads/sample_akta2.jpg',
    statusVerifikasi: 'VERIFIED',
  });

  saveDocument({
    santriId: s2.id,
    kategori: 'SKL_IJAZAH',
    fileUrl: '/uploads/sample_skl2.jpg',
    statusVerifikasi: 'VERIFIED',
  });

  saveDocument({
    santriId: s2.id,
    kategori: 'KIP_PIP',
    nomorDokumen: 'KIP-2022-887192',
    fileUrl: '/uploads/sample_kip.jpg',
    statusVerifikasi: 'VERIFIED',
    catatanVerifikasi: 'Penerima Program Indonesia Pintar aktif',
  });

  // Santri 3: Ikhwan SMK (Hafidz 30 Juz)
  const s3 = createSantri({
    namaLengkap: 'Zaid bin Tsabit Al-Farisi',
    namaPanggilan: 'Zaid',
    nik: '3304121010070003',
    noKk: '3304120303170004',
    nisn: '0078901234',
    tempatLahir: 'Magelang',
    tanggalLahir: '2007-10-10',
    jenisKelamin: 'IKHWAN',
    jenjang: 'SMK',
    kelas: '10 RPL',
    sekolahSekarang: 'SMK IT Baitul Qowwam',
    asalSekolahSebelumnya: 'SMP IT Baitul Qowwam',
    namaAyah: 'Farhan Abdullah',
    namaIbu: 'Dewi Sartika',
    kontakWali: '081398765432',
    pekerjaanOrtu: 'Guru',
    alamat: 'Muntilan, Magelang, Jawa Tengah',
    ringkasanTentang: 'Hafidz 30 Juz yang menekuni pemrograman web dan antarmuka UI/UX. Ingin membangun aplikasi dakwah islami.',
    riwayatTahfidz: '30 Juz Mutqin (Khatam Syahadah)',
    keahlian: JSON.stringify(['Web Development', 'Next.js & Tailwind', 'Tahfidz 30 Juz', 'Qari\'']),
    fotoFormalUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    fotoProfilUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
  });

  saveDocument({
    santriId: s3.id,
    kategori: 'KARTU_KELUARGA',
    fileUrl: '/uploads/sample_kk3.jpg',
    statusVerifikasi: 'VERIFIED',
  });
  saveDocument({
    santriId: s3.id,
    kategori: 'AKTA_KELAHIRAN',
    fileUrl: '/uploads/sample_akta3.jpg',
    statusVerifikasi: 'VERIFIED',
  });
  saveDocument({
    santriId: s3.id,
    kategori: 'SERTIFIKAT_PRESTASI',
    nomorDokumen: 'SYAHADAH-30JUZ-2023',
    fileUrl: '/uploads/sample_syahadah.jpg',
    statusVerifikasi: 'VERIFIED',
    catatanVerifikasi: 'Syahadah Sanad 30 Juz Mutqin',
  });

  // Santri 4: Akhwat Alumni
  createSantri({
    namaLengkap: 'Aisyah Humaira Putri',
    namaPanggilan: 'Aisyah',
    nik: '3304125505050004',
    noKk: '3304120404180005',
    nisn: '0054321678',
    tempatLahir: 'Bantul',
    tanggalLahir: '2005-05-15',
    jenisKelamin: 'AKHWAT',
    jenjang: 'ALUMNI',
    kelas: 'Lulus 2024',
    sekolahSekarang: 'Universitas Gadjah Mada (Fakultas Psikologi)',
    asalSekolahSebelumnya: 'SMA IT Baitul Qowwam',
    namaAyah: 'Drs. Hendro Wibowo',
    namaIbu: 'Sri Wahyuni',
    kontakWali: '081223344556',
    pekerjaanOrtu: 'PNS',
    alamat: 'Banguntapan, Bantul, D.I. Yogyakarta',
    ringkasanTentang: 'Alumni angkatan 2024 Baitul Qowwam. Saat ini menempuh studi sarjana psikologi dan aktif di kegiatan sosial kemasyarakatan.',
    riwayatTahfidz: '15 Juz Mutqin',
    keahlian: JSON.stringify(['Public Speaking', 'Psikologi Anak', 'Desain Canva', 'Tilawatil Qur\'an']),
    fotoFormalUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    fotoProfilUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  });

  console.log('Seed completed successfully!');
}

// Auto run if called directly
if (process.env.NODE_ENV !== 'production' || process.env.RUN_SEED === 'true') {
  try {
    runSeed();
  } catch (err) {
    console.error('Seed execution note:', err);
  }
}
