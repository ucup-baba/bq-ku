import type { SuratData } from '@/lib/surat/data';
import type { SuratAssets } from '@/lib/surat/assets';
import type { GayaTulisan } from '@/lib/db/donatur-repo';

const TINTA = '#1d3b8f';
const TEKS = '#111';
const FS = 24;

/** Nama font Satori + faktor pembesaran per gaya tulisan tangan (isian harus
 * sedikit lebih besar dari teks cetak agar terbaca). */
function fontIsian(gaya: GayaTulisan): { fontFamily: string; scale: number } {
  return gaya === 'PATRICK' ? { fontFamily: 'Patrick', scale: 1.35 } : { fontFamily: 'Kalam', scale: 1.3 };
}

export function SuratTemplate({ data, assets }: { data: SuratData; assets: SuratAssets }) {
  const { fontFamily: fontTangan, scale } = fontIsian(data.gayaTulisan);
  const fsIsian = Math.round(FS * scale);

  // Satori (mesin next/og) hanya mengenal border-style "solid"/"dashed" —
  // "dotted" ditolak ("Invalid value for CSS property borderBottomStyle").
  /** Isian tulisan tangan: tinta biru, duduk di atas garis putus-putus. */
  const isian = (isi: string, minWidth = 320, align: 'flex-start' | 'center' = 'flex-start') => (
    <div
      style={{
        display: 'flex',
        justifyContent: align,
        fontFamily: fontTangan,
        color: TINTA,
        fontSize: fsIsian,
        lineHeight: 1,
        borderBottom: '2px dashed #444',
        minWidth,
        paddingBottom: 3,
      }}
    >
      {isi}
    </div>
  );

  return (
    <div style={{ width: 1240, height: 1754, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', color: TEKS, fontFamily: 'Arimo', padding: '48px 80px' }}>
      {/* KOP — ekspor CorelDRAW asli, lengkap (logo, tulisan Arab, nama panti, akte/izin/alamat, garis hijau bawah) */}
      <img src={assets.kop} width={1080} height={229} style={{ width: 1080, height: 229, objectFit: 'contain' }} />

      {/* Badan surat, dengan watermark logo samar di belakang */}
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', marginTop: 28 }}>
        {/* Satori tidak mendukung z-index ("z-index is currently not
            supported") — urutan tumpuk mengikuti urutan DOM: elemen ini
            dirender lebih dulu (di belakang), badan surat di bawah (setelah)
            dirender di atasnya. */}
        <img
          src={assets.logo}
          width={600}
          height={600}
          style={{ width: 600, height: 600, position: 'absolute', left: 240, top: 380, opacity: 0.07 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Nomor & tanggal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: FS }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ display: 'flex' }}>No&nbsp;&nbsp;:</div>
                {isian(data.nomorUrut, 74, 'center')}
                <div style={{ display: 'flex' }}>/PBQ/</div>
                {isian(data.nomorBulanRomawi, 64, 'center')}
                <div style={{ display: 'flex' }}>/20</div>
                {isian(data.nomorTahunDuaDigit, 52, 'center')}
              </div>
              <div style={{ display: 'flex' }}>Hal&nbsp;: Ucapan Terima Kasih</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ display: 'flex' }}>Tempel,</div>
              {isian(data.tanggalTeks, 340)}
            </div>
          </div>

          {/* Tujuan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 34, fontSize: FS }}>
            <div style={{ display: 'flex' }}>Kepada Yth.</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ display: 'flex' }}>Bapak/Ibu/Sdr :</div>
              {isian(data.namaDonatur, 400)}
            </div>
            <div style={{ display: 'flex', paddingLeft: 4 }}>{isian('Tempat', 900)}</div>
          </div>

          {/* Isi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 34, fontSize: FS, lineHeight: 1.5 }}>
            <div style={{ display: 'flex' }}>Assalammu’alaikum Wr. Wb</div>
            <div style={{ display: 'flex' }}>
              Dengan surat ini kami mengucapkan banyak terima kasih kepada Bapak/Ibu/Sdr. atas penyaluran zakat/infaq/shadaqah kepada Panti Asuhan BAITUL QOWWAM, sebesar:
            </div>

            {data.barisNilai.tipe === 'UANG' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 60 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ display: 'flex', width: 150 }}>Rp.</div>
                  <div style={{ display: 'flex' }}>:</div>
                  {isian(data.barisNilai.rupiah, 360)}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ display: 'flex', width: 150 }}>Terbilang</div>
                  <div style={{ display: 'flex' }}>:</div>
                  {isian(`${data.barisNilai.terbilang} Rupiah`, 740)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingLeft: 60 }}>
                <div style={{ display: 'flex', width: 150 }}>Berupa</div>
                <div style={{ display: 'flex' }}>:</div>
                {isian(data.barisNilai.deskripsi, 740)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', fontSize: 22 }}>Teriring Do’a</div>
              <div style={{ display: 'flex', fontFamily: 'Bebas', fontSize: 38, color: TEKS, letterSpacing: 1 }}>JAZAKUMULLAHU KHAIRAN JAZAA</div>
              <img src={assets.doaCdr} width={680} height={41} style={{ width: 680, height: 41, objectFit: 'contain', marginTop: 6 }} />
              <div style={{ display: 'flex', fontSize: 20, fontFamily: 'Arimo', fontStyle: 'italic', textAlign: 'center', marginTop: 10, maxWidth: 900 }}>
                “Semoga Allah memberi pahala dengan apa yang engkau berikan dan Allah memberkahi apa saja yang masih ada pada diri engkau dan semoga Allah menjadikannya suci bagi engkau” Aamiin...
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              Dana yang kami terima dialokasikan untuk penyelenggaraan Panti Asuhan Baitul Qowwam. Demikian surat ini kami sampaikan, atas perhatian dan kepercayaannya kami ucapkan banyak terima kasih.
            </div>
            <div style={{ display: 'flex' }}>Wassalammu’alaikum Wr. Wb</div>
          </div>

          {/* Tanda tangan */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 420 }}>
              <div style={{ display: 'flex', fontSize: 22 }}>Pengurus Panti Asuhan</div>
              <div style={{ display: 'flex', fontSize: 22 }}>Baitul Qowwam</div>
              {/* TTD (dari Berkas lembaga, atau bawaan diputar & dipangkas rasio 382×267; objectFit contain) tepat di tengah, sejajar dengan "Baitul Qowwam"; stempel menimpa sisi kiri */}
              <div style={{ display: 'flex', position: 'relative', height: 176, width: 380, alignItems: 'center', justifyContent: 'center' }}>
                <img src={assets.stempel} width={190} height={190} style={{ width: 190, height: 190, objectFit: 'contain', position: 'absolute', left: -6, top: -8, opacity: 0.9 }} />
                <img src={assets.ttd} width={240} height={168} style={{ width: 240, height: 168, objectFit: 'contain', position: 'absolute', left: 70, top: 4 }} />
              </div>
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 700 }}>{assets.namaPenandatangan}</div>
            </div>
          </div>
        </div>
      </div>

      {/* NB */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', fontSize: 18, color: '#333' }}>
        <div style={{ display: 'flex' }}>NB :</div>
        <div style={{ display: 'flex' }}>No.Telpon : +62 858-8866-6369</div>
        <div style={{ display: 'flex' }}>No. Rek : BSI 0307075359</div>
        <div style={{ display: 'flex' }}>A.n Agus T. QQ. Baitul Qowwam</div>
      </div>
    </div>
  );
}
