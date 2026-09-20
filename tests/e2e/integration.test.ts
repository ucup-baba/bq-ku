import { describe, it, expect } from 'vitest';
import { createSantri, getSantriById, listSantri, saveDocument } from '@/lib/db/santri-repo';
import { parseOcrText } from '@/lib/ocr/parser';
import { canDeleteSantri, canEditSantri } from '@/lib/auth/roles';

describe('End-to-End User Journey Integration Test', () => {
  it('should complete the entire flow: OCR Extraction -> DB Persistence -> Directory -> Role Checking', async () => {
    // 1. Simulate OCR extraction from an Indonesian Family Card (KK)
    const mockKkOcrText = `
      KARTU KELUARGA
      No. 3304120101150002
      Nama Kepala Keluarga : BUDI SANTOSO
      Alamat : JL. KALIURANG KM 14
      RT/RW : 002/005
      Desa/Kelurahan : UMBULMARTANI
      Kecamatan : NGEMPLAK
      Kabupaten : SLEMAN
      Kode Pos : 55584
    `;

    const extractedKk = parseOcrText(mockKkOcrText, 'KARTU_KELUARGA');
    expect(extractedKk.noKk).toBe('3304120101150002');
    expect(extractedKk.namaAyah).toBe('BUDI SANTOSO');

    // 2. Persist Santri with auto-filled fields and custom fields
    const created = await createSantri({
      namaLengkap: 'Raihan Pratama',
      namaPanggilan: 'Raihan',
      nik: '3304122002080009',
      noKk: extractedKk.noKk || '3304120101150002',
      tempatLahir: 'Sleman',
      tanggalLahir: '2008-02-20',
      jenisKelamin: 'IKHWAN',
      jenjang: 'SMP',
      kelas: '7B',
      sekolahSekarang: 'SMP IT Baitul Qowwam',
      asalSekolahSebelumnya: 'SDIT Baitul Qowwam',
      namaAyah: extractedKk.namaAyah,
      kontakWali: '081299998888',
      riwayatTahfidz: '3 Juz Mutqin',
      keahlian: JSON.stringify(['Tahfidz', 'Pramuka']),
    });

    expect(created.id).toBeDefined();
    expect(created.sekolahSekarang).toBe('SMP IT Baitul Qowwam');
    expect(created.kelas).toBe('7B');

    // 3. Attach Document to Santri
    const doc = await saveDocument({
      santriId: created.id,
      kategori: 'KARTU_KELUARGA',
      nomorDokumen: extractedKk.noKk,
      fileUrl: '/uploads/kk_raihan.jpg',
      statusVerifikasi: 'VERIFIED',
    });

    expect(doc.id).toBeDefined();
    expect(doc.santriId).toBe(created.id);

    // 4. Retrieve Santri with documents
    const detail = await getSantriById(created.id);
    expect(detail).not.toBeNull();
    expect(detail?.documents.length).toBe(1);
    expect(detail?.documents[0].kategori).toBe('KARTU_KELUARGA');

    // 5. Query from Directory with Gender & Search filter
    const searchResult = await listSantri({ q: 'Raihan', jenisKelamin: 'IKHWAN' });
    expect(searchResult.some(s => s.id === created.id)).toBe(true);

    // 6. Verify role permissions
    expect(canEditSantri('PANITIA')).toBe(true);
    expect(canDeleteSantri('PANITIA')).toBe(false);
    expect(canDeleteSantri('SUPERADMIN')).toBe(true);
  });
});
